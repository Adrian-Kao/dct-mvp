import { useEffect, useMemo } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { selectCandidates, selectSelectedPrefix } from "../app/selectors";
import { CandidateButton } from "../components/CandidateButton";
import { SceneHeading } from "../components/SceneHeading";
import { motionDurations } from "../visual/visualConfig";

export function PredictionScene() {
  const { state, dispatch, scenario } = useExperience();
  const candidates = selectCandidates(state, scenario);
  const prefix = selectSelectedPrefix(state, scenario);
  const phase = state.prediction.phase;
  const meta = useMemo(() => ({ runId: state.runId, sceneInstanceId: state.sceneInstanceId }), [state.runId, state.sceneInstanceId]);

  useEffect(() => {
    if (state.scenePhase !== "ready") return;
    const durations = state.prediction.round === 1 ? motionDurations.predictionRound1 : motionDurations.predictionRound2;
    const scale = state.settings.reducedMotion ? 0.18 : 1;
    const sequence = {
      arrival: [durations.arrival, "influx"],
      influx: [durations.influx, "compression"],
      compression: [durations.compression, "distribution"],
      distribution: [durations.distribution, "awaitingChoice"],
    } as const;
    const step = sequence[phase as keyof typeof sequence];
    if (!step) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "PREDICTION_SET_PHASE", phase: step[1], meta });
    }, step[0] * 1000 * scale);
    return () => window.clearTimeout(timer);
  }, [dispatch, meta, phase, state.prediction.round, state.scenePhase, state.settings.reducedMotion]);

  useEffect(() => {
    if (phase !== "commit") return;
    const frame = window.requestAnimationFrame(() => dispatch({ type: "REQUEST_PREDICTION_TRANSFER" }));
    return () => window.cancelAnimationFrame(frame);
  }, [dispatch, phase]);

  const revealed = ["distribution", "awaitingChoice", "commit"].includes(phase);
  const showWeight = ["awaitingChoice", "commit"].includes(phase);
  const canChoose = phase === "awaitingChoice" && state.scenePhase === "ready";
  const phaseLabel: Record<typeof phase, string> = {
    arrival: "主光流進入",
    influx: "大量資料湧入",
    compression: "資料正在中央收束",
    distribution: "形成三個候選方向",
    awaitingChoice: "等待你的選擇",
    commit: "已鎖定選擇，準備中央收束",
    complete: "接下來，交給系統續寫。",
  };
  return (
    <div className={`scene-shell prediction-shell prediction-phase-${phase}`}>
      <SceneHeading eyebrow={`05 · ROUND ${state.prediction.round} OF 2`} title="Possibilities gather before the next word." description="三個百分比是固定示意權重；每個選項都能完成一條合法回答。" />
      <div className="prediction-prefix" aria-label="目前句子前綴">
        <span>CURRENT PREFIX</span>
        <p>{prefix}<i className="typing-caret" aria-hidden="true" /></p>
      </div>
      <div className="compression-core" aria-hidden="true"><i /><i /><i /></div>
      <div className="candidate-field" aria-label={`第 ${state.prediction.round} 輪候選`}>
        {candidates.map((candidate, index) => {
          const selected = state.prediction.pendingCandidateId === candidate.id;
          return (
            <CandidateButton
              key={candidate.id}
              candidate={candidate}
              index={index}
              revealed={revealed}
              showWeight={showWeight}
              disabled={!canChoose}
              selected={selected}
              dimmed={Boolean(state.prediction.pendingCandidateId && !selected)}
              onSelect={() => dispatch({ type: "PREDICTION_SELECT", candidateId: candidate.id, text: candidate.text, scenario })}
            />
          );
        })}
      </div>
      <div className="prediction-status" role="status">
        <span className="phase-pulse" aria-hidden="true" />
        <strong>{phaseLabel[phase]}</strong>
        <small>{canChoose ? "點擊或使用鍵盤選擇任一文字；沒有正確答案。" : "候選準備完成後才會開放選擇。"}</small>
      </div>
    </div>
  );
}

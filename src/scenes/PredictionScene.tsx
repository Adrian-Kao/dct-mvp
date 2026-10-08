import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { selectCandidates, selectSelectedPrefix } from "../app/selectors";
import { CandidateButton } from "../components/CandidateButton";
import { SceneHeading } from "../components/SceneHeading";
import { motionDurations } from "../visual/visualConfig";

interface Anchor { x: number; y: number }

function PredictionFlow2D({ phase, round, reducedMotion, onAbsorbed }: { phase: string; round: 1 | 2; reducedMotion: boolean; onAbsorbed: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  useLayoutEffect(() => {
    const measure = () => {
      const shell = root.current?.closest<HTMLElement>(".prediction-shell");
      const words = Array.from(document.querySelectorAll<HTMLElement>(".candidate-word"));
      if (!shell || words.length !== 3) return;
      const shellRect = shell.getBoundingClientRect();
      setAnchors(words.map((word) => {
        const rect = word.getBoundingClientRect();
        return { x: rect.left + rect.width / 2 - shellRect.left, y: rect.top + rect.height / 2 - shellRect.top };
      }));
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    const shell = root.current?.closest<HTMLElement>(".prediction-shell");
    if (shell) observer.observe(shell);
    document.querySelectorAll<HTMLElement>(".candidate-word").forEach((word) => observer.observe(word));
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [round]);
  const duration = (round === 1 ? motionDurations.predictionRound1 : motionDurations.predictionRound2).distribution;
  return (
    <div ref={root} className={`prediction-flow-2d flow-phase-${phase}`} aria-hidden="true">
      {anchors.length === 3 && Array.from({ length: reducedMotion ? 36 : 90 }, (_, index) => {
        const assigned = index % 3;
        const anchor = anchors[assigned];
        const style = {
          "--flow-x": `${anchor.x}px`, "--flow-y": `${anchor.y}px`,
          "--flow-delay": `${assigned * duration * 0.16 + (index % 9) * 0.012}s`,
          "--flow-duration": `${reducedMotion ? 0.12 : duration * 0.72}s`,
        } as CSSProperties;
        const last = index === (reducedMotion ? 35 : 89);
        return <i key={index} style={style} onAnimationEnd={phase === "distribution" && last ? onAbsorbed : undefined} />;
      })}
    </div>
  );
}

export function PredictionScene() {
  const { state, dispatch, scenario } = useExperience();
  const candidates = selectCandidates(state, scenario);
  const prefix = selectSelectedPrefix(state, scenario);
  const phase = state.prediction.phase;
  const meta = useMemo(() => ({ runId: state.runId, sceneInstanceId: state.sceneInstanceId }), [state.runId, state.sceneInstanceId]);
  const absorbed = useRef(false);
  useEffect(() => { absorbed.current = false; }, [state.prediction.round, state.sceneInstanceId]);
  const handleAbsorbed = useCallback(() => {
    if (absorbed.current || phase !== "distribution") return;
    absorbed.current = true;
    dispatch({ type: "PREDICTION_SET_PHASE", phase: "awaitingChoice", meta });
  }, [dispatch, meta, phase]);

  useEffect(() => {
    if (state.scenePhase !== "ready") return;
    const durations = state.prediction.round === 1 ? motionDurations.predictionRound1 : motionDurations.predictionRound2;
    const speed = state.settings.reducedMotion ? 0.18 : 1;
    const sequence = {
      arrival: [durations.arrival, "influx"],
      influx: [durations.influx, "compression"],
      compression: [durations.compression, "distribution"],
    } as const;
    const step = sequence[phase as keyof typeof sequence];
    if (!step) return;
    const timer = window.setTimeout(() => dispatch({ type: "PREDICTION_SET_PHASE", phase: step[1], meta }), step[0] * 1000 * speed);
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
    influx: "資料從三個入口依序湧入",
    compression: "資料正在中央收束",
    distribution: "資料依序流入三個候選字詞",
    awaitingChoice: "資料已被字詞吸收，等待你的選擇",
    commit: "已鎖定選擇，準備中央收束",
    complete: "接下來，交給系統續寫。",
  };
  return (
    <div className={`scene-shell prediction-shell prediction-phase-${phase}`} data-round={state.prediction.round}>
      <SceneHeading eyebrow={`05 · ROUND ${state.prediction.round} OF 2`} title="Possibilities gather before the next word." description="三個百分比是固定示意權重；每個選項都能完成一條合法回答。" />
      <div className="prediction-prefix" aria-label="目前句子前綴" data-entry-target="true" data-entry-order="1">
        <span>CURRENT PREFIX</span>
        <p>{prefix}<i className="typing-caret" aria-hidden="true" /></p>
      </div>
      <div className="compression-core" aria-hidden="true" data-entry-target="true" data-entry-order="2"><i /><i /><i /></div>
      <div className="candidate-field" aria-label={`第 ${state.prediction.round} 輪候選`} data-entry-target="true" data-entry-order="3">
        {candidates.map((candidate, index) => {
          const selected = state.prediction.pendingCandidateId === candidate.id;
          return (
            <CandidateButton key={candidate.id} candidate={candidate} index={index} revealed={revealed} showWeight={showWeight} disabled={!canChoose} selected={selected} dimmed={Boolean(state.prediction.pendingCandidateId && !selected)} onSelect={() => dispatch({ type: "PREDICTION_SELECT", candidateId: candidate.id, text: candidate.text, scenario })} />
          );
        })}
      </div>
      <PredictionFlow2D phase={phase} round={state.prediction.round} reducedMotion={state.settings.reducedMotion} onAbsorbed={handleAbsorbed} />
      <div className="prediction-status" role="status" data-entry-target="true" data-entry-order="4">
        <span className="phase-pulse" aria-hidden="true" />
        <strong>{phaseLabel[phase]}</strong>
        <small>{canChoose ? "點擊或使用鍵盤選擇任一文字；沒有正確答案。" : "候選吸收完所有資料後才會開放選擇。"}</small>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { selectVisibleAnswer } from "../app/selectors";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";
import type { GuardMeta } from "../app/experienceReducer";
import type { ScenarioFixture } from "../data/scenarioTypes";
import { motionDurations } from "../visual/visualConfig";

interface BubbleProps {
  index: number;
  text: string;
  riseSeconds: number;
  meta: GuardMeta;
  scenario: ScenarioFixture;
}

/** Deterministic horizontal lane for a bubble, so replays look the same. */
function laneFor(index: number): number {
  return 18 + ((index * 37) % 64);
}

function Bubble({ index, text, riseSeconds, meta, scenario }: BubbleProps) {
  const { dispatch } = useExperience();
  useEffect(() => {
    const timer = window.setTimeout(() => dispatch({ type: "GENERATION_BUBBLE_POP", index, scenario, meta }), riseSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [dispatch, index, meta, riseSeconds, scenario]);
  return (
    <span className="pump-bubble" data-bubble-index={index} style={{ left: `${laneFor(index)}%`, animationDuration: `${riseSeconds}s` }}>
      {text.trim() || "·"}
    </span>
  );
}

export function GenerationScene() {
  const { state, dispatch, scenario } = useExperience();
  const [pressed, setPressed] = useState(false);
  const { appendedCount, releasedCount, complete } = state.generation;
  const visible = selectVisibleAnswer(state, scenario);
  const ready = state.scenePhase === "ready" && state.scene === "generation";
  const riseSeconds = state.settings.reducedMotion ? motionDurations.bubbleRiseReduced : motionDurations.bubbleRise;
  const runId = state.runId;
  const sceneInstanceId = state.sceneInstanceId;
  const meta = useMemo<GuardMeta>(() => ({ runId, sceneInstanceId }), [runId, sceneInstanceId]);

  const pump = useCallback(() => {
    if (!ready || complete) return;
    dispatch({ type: "GENERATION_PUMP", scenario, meta });
    setPressed(true);
    window.setTimeout(() => setPressed(false), 140);
  }, [complete, dispatch, meta, ready, scenario]);

  // Keyboard stands in for the station 4 hand pump sensor: one key press = one pump.
  useEffect(() => {
    if (!ready) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, button, .presenter-panel")) return;
      if (event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        pump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pump, ready]);

  // When the last bubble pops the water goes still, then the answer moves on.
  useEffect(() => {
    if (!complete || !ready) return;
    const timer = window.setTimeout(() => dispatch({ type: "REQUEST_TRANSITION", target: "output" }), state.settings.reducedMotion ? 300 : 1600);
    return () => window.clearTimeout(timer);
  }, [complete, dispatch, ready, state.settings.reducedMotion]);

  const inFlight = [];
  for (let index = appendedCount; index < releasedCount; index += 1) {
    inFlight.push(<Bubble key={`${sceneInstanceId}-${index}`} index={index} text={scenario.answer.tokens[index]} riseSeconds={riseSeconds} meta={meta} scenario={scenario} />);
  }
  const lastToken = appendedCount > 0 ? scenario.answer.tokens[appendedCount - 1] : "";
  const before = visible.slice(0, visible.length - lastToken.length);

  return (
    <div className="scene-shell generation-shell" data-pump-released={releasedCount} data-pump-appended={appendedCount} data-generation-complete={complete}>
      <SceneHeading eyebrow="站 4 · GENERATION 生成" title="答案不是一次寫好的。" />
      <MissionCard
        station="站 4 · 生成"
        task="用水泵把答案一塊一塊壓出來。每一塊字，都要再跑一次剛剛的所有步驟。"
        steps={[
          { text: "按壓水泵", keys: ["Space", "↓"], done: releasedCount > 0 },
          { text: "水泡浮到水面破掉，字就接到答案後面", done: appendedCount > 0 },
          { text: "一直壓，直到答案完成；停下來，生成也會停住", done: complete },
        ]}
        learned="每一塊字背後都是一整套計算（切字、向量、注意力），而計算需要能源。"
        showLearned={complete}
      />

      <section className="answer-line" aria-label="答案列" aria-live="polite" data-entry-target="true" data-entry-order="1">
        <p>
          {before}
          {lastToken && <mark key={appendedCount} className="answer-new-token">{lastToken}</mark>}
          {!complete && <i className="typing-caret" aria-hidden="true" />}
        </p>
      </section>

      <section className={`pump-tank${inFlight.length ? " is-flowing" : ""}${complete ? " is-still" : ""}`} aria-hidden="true" data-entry-target="true" data-entry-order="2">
        <div className="pump-water" style={{ ["--flow" as string]: Math.min(1, inFlight.length / 5).toFixed(2) }} />
        {inFlight}
      </section>

      <div className="generation-controls" data-entry-target="true" data-entry-order="3">
        <p className="interaction-hint" role="status">
          {complete ? "最後一個水泡破掉了，水面平靜下來。" : releasedCount === 0 ? <>按壓水泵，讓下一個字冒出來（鍵盤 <kbd>Space</kbd> 或 <kbd>↓</kbd>）</> : "壓得越快，答案長得越快；停下來，生成也會停住。"}
        </p>
        <button type="button" className={`pump-button${pressed ? " is-pressed" : ""}`} disabled={!ready || complete} onClick={pump}>
          壓一下
        </button>
      </div>
    </div>
  );
}

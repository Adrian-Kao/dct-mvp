import { useEffect, useMemo } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { selectAnswer } from "../app/selectors";
import { splitDisplayChunks } from "../data/buildAnswer";
import { SceneHeading } from "../components/SceneHeading";

export function GenerationScene() {
  const { state, dispatch, scenario } = useExperience();
  const answer = selectAnswer(state, scenario);
  const chunks = useMemo(() => splitDisplayChunks(answer?.remainingText ?? ""), [answer?.remainingText]);
  const visible = chunks.slice(0, state.generation.visibleChunkCount).join("");
  useEffect(() => {
    if (state.scenePhase !== "ready" || !answer || state.generation.complete) return;
    const meta = { runId: state.runId, sceneInstanceId: state.sceneInstanceId };
    if (state.generation.visibleChunkCount >= chunks.length) {
      dispatch({ type: "GENERATION_COMPLETED", meta });
      return;
    }
    const index = state.generation.visibleChunkCount;
    const progress = chunks.length ? index / chunks.length : 1;
    const isWhitespace = /^\s+$/u.test(chunks[index] ?? "");
    const delay = state.settings.reducedMotion ? 12 : isWhitespace ? 0 : Math.round(110 - progress * 65);
    const timer = window.setTimeout(() => dispatch({ type: "GENERATION_TICK", visibleChunkCount: index + 1, meta }), delay);
    return () => window.clearTimeout(timer);
  }, [answer, chunks, dispatch, state.generation.complete, state.generation.visibleChunkCount, state.runId, state.sceneInstanceId, state.scenePhase, state.settings.reducedMotion]);
  useEffect(() => {
    if (!state.generation.complete) return;
    const timer = window.setTimeout(() => dispatch({ type: "REQUEST_TRANSITION", target: "output" }), state.settings.reducedMotion ? 160 : 800);
    return () => window.clearTimeout(timer);
  }, [dispatch, state.generation.complete, state.settings.reducedMotion]);
  if (!answer) return <InvalidState />;
  return (
    <div className="scene-shell generation-shell">
      <SceneHeading eyebrow="06 · PREWRITTEN CONTINUATION" title="The system continues the selected path." description="後續是由固定資料播放的文字片段，不是即時模型輸出。" />
      <article className="generation-copy" data-transition-item="true" data-transition-id="generation-answer" data-transition-role="retained" data-transition-source="dom" data-transition-slices="3">
        <span className="selected-prefix">{answer.selectedPrefix}</span>
        <span>{visible}</span>
        {!state.generation.complete && <i className="typing-caret" aria-hidden="true" />}
      </article>
      <div className="generation-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, chunks.length ? (state.generation.visibleChunkCount / chunks.length) * 100 : 0)}%` }} /></div>
      <p className="interaction-hint">{state.generation.complete ? "完整回答已形成" : "播放預設文字片段 · 節奏逐漸加速"}</p>
      {state.generation.complete && <p className="sr-only" aria-live="polite">完整回答：{answer.fullAnswer}</p>}
    </div>
  );
}

function InvalidState() {
  const { dispatch } = useExperience();
  return (
    <div className="scene-shell error-shell" role="alert">
      <h1>這條路徑尚未完成</h1>
      <p>Generation 需要一個已確認的主焦點和兩次文字選擇。</p>
      <button type="button" className="primary-button" onClick={() => dispatch({ type: "RESET_EXPERIENCE" })}>重新開始</button>
    </div>
  );
}

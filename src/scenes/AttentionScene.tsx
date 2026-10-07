import { useEffect, useMemo } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { SceneHeading } from "../components/SceneHeading";

const positions = [
  { x: 16, y: 32 }, { x: 35, y: 66 }, { x: 50, y: 25 }, { x: 68, y: 65 }, { x: 84, y: 32 },
];

export function AttentionScene() {
  const { state, dispatch, scenario } = useExperience();
  const previews = useMemo(() => new Set(state.exploredConceptIds.map((id) => scenario.vectorPreviewMap[id]).filter(Boolean)), [scenario, state.exploredConceptIds]);
  useEffect(() => {
    if (!state.attention.confirmed || state.scene !== "attention" || state.scenePhase !== "ready") return;
    const timer = window.setTimeout(() => dispatch({ type: "REQUEST_TRANSITION", target: "prediction" }), state.settings.reducedMotion ? 80 : 420);
    return () => window.clearTimeout(timer);
  }, [dispatch, state.attention.confirmed, state.scene, state.scenePhase, state.settings.reducedMotion]);
  const confirm = () => dispatch({ type: "ATTENTION_CONFIRM", scenario });
  return (
    <div className="scene-shell attention-shell">
      <SceneHeading eyebrow="04 · DIRECT THE EMPHASIS" title={scenario.question} description="選一個主焦點；輔助焦點可以不選。其他資訊仍保留在畫面中。" />
      <div className="attention-map" role="radiogroup" aria-label="主焦點">
        <svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
          {positions.map((position, index) => {
            const id = scenario.attentionOptions[index].id;
            const primary = state.attention.primaryId === id;
            const secondary = state.attention.secondaryId === id;
            return <line key={id} x1="50" y1="45" x2={position.x} y2={position.y} className={primary ? "is-primary" : secondary ? "is-secondary" : ""} />;
          })}
          <circle cx="50" cy="45" r="2" />
        </svg>
        {scenario.attentionOptions.map((option, index) => {
          const primary = state.attention.primaryId === option.id;
          const secondary = state.attention.secondaryId === option.id;
          const preview = previews.has(option.id);
          return (
            <div key={option.id} className={`attention-node${primary ? " is-primary" : ""}${secondary ? " is-secondary" : ""}${preview ? " has-preview" : ""}`} style={{ left: `${positions[index].x}%`, top: `${positions[index].y}%` }}>
              <button
                type="button"
                role="radio"
                aria-checked={primary}
                data-transition-item="true"
                data-transition-id={`attention-${option.id}`}
                data-transition-role={primary || secondary ? "retained" : "discarded"}
                data-transition-source="dom"
                onClick={() => dispatch({ type: "ATTENTION_SET_PRIMARY", primaryId: option.id, scenario })}
              >
                <span>{option.label}</span><small>{option.labelZh}</small><i>{primary ? "主焦點" : preview ? "探索提示" : "設為主焦點"}</i>
              </button>
            </div>
          );
        })}
      </div>
      <div className="secondary-control">
        <span>輔助焦點</span>
        <button type="button" className={state.attention.secondaryId === null ? "is-active" : ""} onClick={() => dispatch({ type: "ATTENTION_SET_SECONDARY", secondaryId: null, scenario })}>不選擇</button>
        {scenario.attentionOptions.map((option) => (
          <button key={option.id} type="button" disabled={state.attention.primaryId === option.id} className={state.attention.secondaryId === option.id ? "is-active" : ""} onClick={() => dispatch({ type: "ATTENTION_SET_SECONDARY", secondaryId: option.id, scenario })}>{option.label}</button>
        ))}
      </div>
      <p className="scene-note">前一站探索提示，不是已選焦點。主焦點會決定候選文字；輔助焦點只影響光流與紀錄。</p>
      <div className="scene-controls">
        <span>{state.attention.primaryId ? `主焦點：${state.attention.primaryId}` : "請先選擇一個主焦點"}</span>
        <button type="button" className="primary-button" disabled={!state.attention.primaryId || state.scenePhase !== "ready"} onClick={confirm}>讓資訊繼續前進</button>
      </div>
    </div>
  );
}

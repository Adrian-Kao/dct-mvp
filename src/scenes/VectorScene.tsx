import { useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { SceneHeading } from "../components/SceneHeading";

export function VectorScene() {
  const { state, dispatch, scenario } = useExperience();
  const [limitMessage, setLimitMessage] = useState(false);
  const toggle = (id: string) => {
    if (!state.exploredConceptIds.includes(id) && state.exploredConceptIds.length >= 2) {
      setLimitMessage(true);
      return;
    }
    setLimitMessage(false);
    dispatch({ type: "VECTOR_TOGGLE", conceptId: id, scenario });
  };
  return (
    <div className="scene-shell vector-shell">
      <SceneHeading eyebrow="03 · CONCEPT SPACE" title="Explore distance, not a real embedding." description="固定的三維美術配置讓關聯變得可探索；選擇只留下提示與紀錄。" />
      <div className="vector-accessible-controls" aria-label="概念探索選項" data-entry-target="true" data-entry-order="2">
        {scenario.vectorNodes.filter((node) => node.selectable).map((node) => {
          const selected = state.exploredConceptIds.includes(node.id);
          return <button
            key={node.id}
            type="button"
            aria-pressed={selected}
            className={selected ? "is-selected" : ""}
            data-transition-item="true"
            data-transition-id={`vector-${node.id}`}
            data-transition-role={selected ? "retained" : "discarded"}
            data-transition-source="fallback"
            onClick={() => toggle(node.id)}
          >{node.label}</button>;
        })}
        <span className="vector-fallback-center" data-transition-item="true" data-transition-id="vector-childhood" data-transition-role="retained" data-transition-source="fallback">childhood</span>
      </div>
      <div className="vector-status" data-entry-target="true" data-entry-order="3">
        <p>{state.exploredConceptIds.length ? <>已探索 <strong>{state.exploredConceptIds.join(" · ")}</strong></> : "尚未選擇概念，也可以直接繼續。"}</p>
        {limitMessage && <p role="alert">最多選 2 個，請先取消其中一個。</p>}
      </div>
      <div className="scene-controls" data-entry-target="true" data-entry-order="4">
        <span>拖曳空白區旋轉空間，選擇最多 2 個概念。</span>
        <button type="button" className="primary-button" onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "attention" })}>繼續到 Attention</button>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { SceneHeading } from "../components/SceneHeading";

const positions = [
  { x: 14, y: 31 }, { x: 33, y: 72 }, { x: 50, y: 24 }, { x: 67, y: 72 }, { x: 86, y: 31 },
];

interface MapGeometry {
  width: number;
  height: number;
  hub: { x: number; y: number };
  nodes: Array<{ x: number; y: number }>;
}

export function AttentionScene() {
  const { state, dispatch, scenario } = useExperience();
  const mapRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [geometry, setGeometry] = useState<MapGeometry>({ width: 100, height: 80, hub: { x: 50, y: 40 }, nodes: positions.map((item) => ({ x: item.x, y: item.y })) });
  const previews = useMemo(() => new Set(state.exploredConceptIds.map((id) => scenario.vectorPreviewMap[id]).filter(Boolean)), [scenario, state.exploredConceptIds]);

  const measure = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const rect = map.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nodes = nodeRefs.current.map((node, index) => {
      const nodeRect = node?.getBoundingClientRect();
      return nodeRect
        ? { x: nodeRect.left + nodeRect.width / 2 - rect.left, y: nodeRect.top + nodeRect.height / 2 - rect.top }
        : { x: rect.width * positions[index].x / 100, y: rect.height * positions[index].y / 100 };
    });
    setGeometry({ width: rect.width, height: rect.height, hub: { x: rect.width * 0.5, y: rect.height * 0.49 }, nodes });
  }, []);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (mapRef.current) observer.observe(mapRef.current);
    nodeRefs.current.forEach((node) => node && observer.observe(node));
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, state.sceneInstanceId]);

  useEffect(() => {
    if (!state.attention.confirmed || state.scene !== "attention" || state.scenePhase !== "ready") return;
    const timer = window.setTimeout(() => dispatch({ type: "REQUEST_TRANSITION", target: "prediction" }), state.settings.reducedMotion ? 80 : 420);
    return () => window.clearTimeout(timer);
  }, [dispatch, state.attention.confirmed, state.scene, state.scenePhase, state.settings.reducedMotion]);

  return (
    <div className="scene-shell attention-shell">
      <SceneHeading eyebrow="04 · DIRECT THE EMPHASIS" title={scenario.question} description="選一個主焦點；輔助焦點可以不選。其他資訊仍保留在畫面中。" />
      <div ref={mapRef} className="attention-map" role="radiogroup" aria-label="主焦點" data-entry-target="true" data-entry-order="1">
        <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true" data-attention-width={geometry.width} data-attention-height={geometry.height}>
          {geometry.nodes.map((position, index) => {
            const id = scenario.attentionOptions[index].id;
            const primary = state.attention.primaryId === id;
            const secondary = state.attention.secondaryId === id;
            return <line key={id} data-attention-line={id} x1={geometry.hub.x} y1={geometry.hub.y} x2={position.x} y2={position.y} className={primary ? "is-primary" : secondary ? "is-secondary" : ""} />;
          })}
          <circle cx={geometry.hub.x} cy={geometry.hub.y} r="7" />
        </svg>
        {scenario.attentionOptions.map((option, index) => {
          const primary = state.attention.primaryId === option.id;
          const secondary = state.attention.secondaryId === option.id;
          const preview = previews.has(option.id);
          return (
            <div key={option.id} className={`attention-node${primary ? " is-primary" : ""}${secondary ? " is-secondary" : ""}${preview ? " has-preview" : ""}`} style={{ left: `${positions[index].x}%`, top: `${positions[index].y}%` }}>
              <button
                ref={(node) => { nodeRefs.current[index] = node; }}
                type="button" role="radio" aria-checked={primary}
                data-transition-item="true" data-transition-id={`attention-${option.id}`}
                data-transition-role={primary || secondary ? "retained" : "discarded"} data-transition-source="dom"
                onClick={() => dispatch({ type: "ATTENTION_SET_PRIMARY", primaryId: option.id, scenario })}
              >
                <span>{option.label}</span><small>{option.labelZh}</small><i>{primary ? "主焦點" : preview ? "探索提示" : "設為主焦點"}</i>
              </button>
            </div>
          );
        })}
      </div>
      <div className="attention-bottom" data-entry-target="true" data-entry-order="3">
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
          <button type="button" className="primary-button" disabled={!state.attention.primaryId || state.scenePhase !== "ready"} onClick={() => dispatch({ type: "ATTENTION_CONFIRM", scenario })}>讓資訊繼續前進</button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { selectFocusToken, selectStrongestLinks } from "../app/selectors";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";
import { attentionRow } from "../data/attention";

interface RowGeometry {
  width: number;
  height: number;
  /** Top-centre of each token chip, in pixels relative to the row. */
  anchors: Array<{ x: number; y: number }>;
}

const DIAL_SIZE = 280;
const DIAL_RADIUS = 122;
const DIAL_INNER = 58;

function polar(angle: number, radius: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return { x: DIAL_SIZE / 2 + Math.cos(radians) * radius, y: DIAL_SIZE / 2 + Math.sin(radians) * radius };
}

function sectorPath(start: number, end: number): string {
  const sweep = Math.min(end - start, 359.99);
  const large = sweep > 180 ? 1 : 0;
  const a = polar(start, DIAL_RADIUS);
  const b = polar(start + sweep, DIAL_RADIUS);
  const c = polar(start + sweep, DIAL_INNER);
  const d = polar(start, DIAL_INNER);
  return `M ${a.x} ${a.y} A ${DIAL_RADIUS} ${DIAL_RADIUS} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${DIAL_INNER} ${DIAL_INNER} 0 ${large} 0 ${d.x} ${d.y} Z`;
}

function arcPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const lift = Math.min(110, 26 + Math.abs(to.x - from.x) * 0.32);
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} Q ${midX} ${Math.min(from.y, to.y) - lift} ${to.x} ${to.y}`;
}

export function AttentionScene() {
  const { state, dispatch, scenario } = useExperience();
  const rowRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [geometry, setGeometry] = useState<RowGeometry>({ width: 100, height: 100, anchors: [] });
  const tokens = scenario.inputTokens;
  const focus = selectFocusToken(state, scenario);
  const weights = attentionRow(scenario, focus.id);
  const complete = state.attention.complete;
  const strongest = useMemo(() => selectStrongestLinks(state, scenario), [scenario, state]);
  const strongestKeys = new Set(strongest.map((link) => [link.fromId, link.toId].sort().join("|")));
  const ready = state.scenePhase === "ready";

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const anchors = chipRefs.current.map((chip) => {
      const chipRect = chip?.getBoundingClientRect();
      return chipRect ? { x: chipRect.left + chipRect.width / 2 - rect.left, y: chipRect.top - rect.top } : { x: 0, y: rect.height };
    });
    setGeometry({ width: rect.width, height: rect.height, anchors });
  }, []);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (rowRef.current) observer.observe(rowRef.current);
    chipRefs.current.forEach((chip) => chip && observer.observe(chip));
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, state.sceneInstanceId]);

  // Keyboard stands in for the station 3 rotary encoder: one key press = one detent.
  useEffect(() => {
    if (!ready || state.scene !== "attention") return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, .presenter-panel")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); dispatch({ type: "ATTENTION_ROTATE", delta: 1, scenario }); }
      if (event.key === "ArrowLeft") { event.preventDefault(); dispatch({ type: "ATTENTION_ROTATE", delta: -1, scenario }); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dispatch, ready, scenario, state.scene]);

  const sectors = tokens.map((token, index) => {
    const weight = weights[index] ?? 0;
    const start = weights.slice(0, index).reduce((sum, value) => sum + value, 0) * 360;
    return { token, index, start, end: start + weight * 360, weight };
  });
  const focusSector = sectors[state.attention.focusIndex] ?? sectors[0];
  const needleAngle = focusSector ? (focusSector.start + focusSector.end) / 2 : 0;
  const keywords = scenario.attention.keywordTokenIds.map((id) => tokens.find((token) => token.id === id)!).filter(Boolean);

  return (
    <div className="scene-shell attention-shell" data-attention-complete={complete}>
      <SceneHeading eyebrow="站 3 · ATTENTION 注意力" title="一句話裡，不是每個字都一樣重要。" />
      <MissionCard
        station="站 3 · 注意力"
        task="轉動轉盤，看看每個字「最在意」句子裡的哪些字。"
        steps={[
          { text: "轉動轉盤，讓指針停在一個字上", keys: ["←", "→"], done: state.attention.visitedTokenIds.length > 0 },
          { text: "看圓餅：格子越大，代表這個字越在意那個字，全部加起來是 100%" },
          { text: `把關鍵字（${keywords.map((token) => token.text.trim()).join("、")}）都轉過一次`, done: complete },
        ]}
        learned="AI 會依前後文把注意力分給每個字。這是算出來的機率，不是理解出來的。"
        showLearned={complete}
      />

      <div ref={rowRef} className="attention-row" data-entry-target="true" data-entry-order="1">
        <svg className="attention-arcs" viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true">
          {geometry.anchors.length === tokens.length && (complete
            ? strongest.map((link) => {
                const from = geometry.anchors[tokens.findIndex((token) => token.id === link.fromId)];
                const to = geometry.anchors[tokens.findIndex((token) => token.id === link.toId)];
                return <path key={`${link.fromId}-${link.toId}`} d={arcPath(from, to)} className="attention-arc is-strongest" style={{ strokeWidth: 1.5 + link.weight * 14 }} data-attention-link={`${link.fromId}-${link.toId}`} />;
              })
            : tokens.map((token, index) => {
                if (index === state.attention.focusIndex) return null;
                const weight = weights[index] ?? 0;
                const key = [focus.id, token.id].sort().join("|");
                return <path key={token.id} d={arcPath(geometry.anchors[state.attention.focusIndex], geometry.anchors[index])} className={`attention-arc${strongestKeys.has(key) ? " is-strong" : ""}`} style={{ strokeWidth: 1 + weight * 14, opacity: 0.18 + weight * 1.8 }} data-attention-link={`${focus.id}-${token.id}`} />;
              }))}
        </svg>
        <div className="attention-tokens" role="radiogroup" aria-label="注意力焦點">
          {tokens.map((token, index) => {
            const focused = index === state.attention.focusIndex;
            const keyword = keywords.some((item) => item.text === token.text);
            const visited = state.attention.visitedTokenIds.some((id) => tokens.find((item) => item.id === id)?.text === token.text);
            const weight = weights[index] ?? 0;
            return (
              <button
                key={token.id}
                ref={(chip) => { chipRefs.current[index] = chip; }}
                type="button"
                role="radio"
                aria-checked={focused}
                className={`attention-token${focused ? " is-focus" : ""}${keyword ? " is-keyword" : ""}${visited ? " is-visited" : ""}`}
                style={{ ["--token-weight" as string]: weight.toFixed(3) }}
                data-transition-item="true"
                data-transition-id={`attention-${token.id}`}
                data-transition-role={keyword ? "retained" : "discarded"}
                data-transition-source="dom"
                onClick={() => dispatch({ type: "ATTENTION_FOCUS", tokenId: token.id, scenario })}
              >
                <span>{token.text.trim()}</span>
                <small>{Math.round(weight * 100)}%</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="attention-console" data-entry-target="true" data-entry-order="2">
        <button type="button" className="dial-step" aria-label="轉盤往左一格" disabled={!ready} onClick={() => dispatch({ type: "ATTENTION_ROTATE", delta: -1, scenario })}>◀</button>
        <figure className="attention-dial" aria-label={`轉盤停在 ${focus.text.trim()}`}>
          <svg viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`} aria-hidden="true">
            {sectors.map((sector) => {
              const label = polar((sector.start + sector.end) / 2, (DIAL_RADIUS + DIAL_INNER) / 2);
              return (
                <g key={sector.token.id} className={`dial-sector${sector.index === state.attention.focusIndex ? " is-focus" : ""}`} data-dial-sector={sector.token.id} data-weight={sector.weight}>
                  <path d={sectorPath(sector.start, sector.end)} />
                  {sector.weight >= 0.07 && <text x={label.x} y={label.y}>{sector.token.text.trim()}</text>}
                </g>
              );
            })}
            <g className="dial-needle" style={{ transform: `rotate(${needleAngle}deg)` }}>
              <line x1={DIAL_SIZE / 2} y1={DIAL_SIZE / 2 - DIAL_INNER + 4} x2={DIAL_SIZE / 2} y2={DIAL_SIZE / 2 - DIAL_RADIUS - 12} />
              <circle cx={DIAL_SIZE / 2} cy={DIAL_SIZE / 2 - DIAL_RADIUS - 12} r="5" />
            </g>
          </svg>
          <figcaption>
            <strong>{focus.text.trim()}</strong>
            <span>正在看其他字</span>
          </figcaption>
        </figure>
        <button type="button" className="dial-step" aria-label="轉盤往右一格" disabled={!ready} onClick={() => dispatch({ type: "ATTENTION_ROTATE", delta: 1, scenario })}>▶</button>
      </div>

      <div className="attention-bottom" data-entry-target="true" data-entry-order="3">
        <ul className="attention-keywords" aria-label="關鍵字進度">
          {keywords.map((token) => {
            const done = state.attention.visitedTokenIds.some((id) => tokens.find((item) => item.id === id)?.text === token.text);
            return <li key={token.id} className={done ? "is-done" : ""}>{done ? "✓" : "○"} {token.text.trim()}</li>;
          })}
        </ul>
        <p className="interaction-hint" role="status">
          {complete ? "最粗的 3 條線留下來了，這就是這句話的重點。" : <>轉動轉盤，讓指針停在每個關鍵字上（鍵盤 <kbd>←</kbd> <kbd>→</kbd>）</>}
        </p>
        <div className="scene-controls">
          <button type="button" className="primary-button" disabled={!complete || !ready} onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "generation" })}>帶著重點前進</button>
        </div>
      </div>
    </div>
  );
}

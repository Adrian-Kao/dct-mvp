import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { VECTOR_START_ANGLE } from "../app/experienceReducer";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";
import type { ScenarioFixture, Vec3 } from "../data/scenarioTypes";
import { isAligned, nearestWords, nextLockTarget, project, tokenText, turnHint } from "../data/vectorSpace";

const KEY_STEP = 0.12;
const DRAG_STEP = 0.006;

function toScreen(position: Vec3, angle: number) {
  const point = project(position, angle);
  return { left: 50 + point.x * 45, top: 50 + point.y * 40, depth: point.depth, scale: point.scale };
}

/** Unique question tokens: repeated text (人) lands on the same star. */
function uniqueTokens(scenario: ScenarioFixture) {
  const seen = new Set<string>();
  return scenario.inputTokens.filter((token) => {
    if (seen.has(token.text)) return false;
    seen.add(token.text);
    return true;
  });
}

export function VectorScene() {
  const { state, dispatch, scenario } = useExperience();
  const { angle, lockedTokenIds } = state.vector;
  const space = scenario.vectorSpace;
  const ready = state.scenePhase === "ready" && state.scene === "vector";
  const target = nextLockTarget(scenario, lockedTokenIds);
  const targetPosition = target ? space.tokenPositions[target] : null;
  const aligned = targetPosition ? isAligned(targetPosition, angle) : false;
  const canContinue = lockedTokenIds.length >= space.minLocks;
  const [miss, setMiss] = useState(false);
  const drag = useRef<{ pointerId: number; x: number } | null>(null);
  const tokens = useMemo(() => uniqueTokens(scenario), [scenario]);
  const constellations = useMemo(
    () => lockedTokenIds.map((id) => ({ id, neighbors: nearestWords(scenario, id) })),
    [lockedTokenIds, scenario],
  );
  const neighborTexts = new Set(constellations.flatMap((item) => item.neighbors.map((word) => word.text)));

  const lock = () => {
    if (!ready || !target) return;
    if (!aligned) { setMiss(true); return; }
    setMiss(false);
    dispatch({ type: "VECTOR_LOCK", scenario });
  };

  const lockRef = useRef(lock);
  useEffect(() => { lockRef.current = lock; });

  // Keyboard stands in for the big turntable (← →) and the lock button (Space / Enter).
  useEffect(() => {
    if (!ready) return;
    const handleKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.closest("input, select, textarea, .presenter-panel")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); dispatch({ type: "VECTOR_ROTATE", delta: KEY_STEP }); }
      if (event.key === "ArrowLeft") { event.preventDefault(); dispatch({ type: "VECTOR_ROTATE", delta: -KEY_STEP }); }
      if ((event.key === " " || event.key === "Enter") && !element?.closest(".lock-button, .scene-controls")) { event.preventDefault(); if (!event.repeat) lockRef.current(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dispatch, ready]);
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX };
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    drag.current.x = event.clientX;
    if (dx) dispatch({ type: "VECTOR_ROTATE", delta: dx * DRAG_STEP });
  };
  const endDrag = () => { drag.current = null; };

  const targetText = target ? tokenText(scenario, target) : "";
  const hintTurn = targetPosition ? turnHint(targetPosition, angle, KEY_STEP) : null;
  const turnLabel = hintTurn ? (hintTurn.direction < 0 ? `← 往左轉 ${hintTurn.steps} 格` : `往右轉 ${hintTurn.steps} 格 →`) : "";
  const latest = constellations[constellations.length - 1];
  const farthest = latest
    ? space.words
        .map((word) => ({ text: word.text, distance: Math.hypot(...(word.position.map((value, index) => value - space.tokenPositions[latest.id][index]) as [number, number, number])) }))
        .sort((a, b) => b.distance - a.distance)[0]
    : null;
  const lockedText = lockedTokenIds.map((id) => tokenText(scenario, id));
  const hint = !target
    ? `已鎖定 ${space.maxLocks} 個字，星座完成了。`
    : miss && !aligned
      ? `還沒對準，鎖不住。照上面的箭頭再${turnLabel}。`
      : aligned
        ? "對準了！光帶變金色了，按「鎖定」（或 Space）。"
        : `${turnLabel}，讓發光的「${targetText}」進入中間的光帶。`;

  return (
    <div className="scene-shell vector-shell" data-vector-locked={lockedTokenIds.length} data-vector-aligned={aligned}>
      <SceneHeading eyebrow="站 2 · VECTORIZE 向量化" title="把字放進「意思的星空」" />
      <MissionCard
        station="站 2 · 向量化"
        task={<>每個字在 AI 心裡都有一個位置，<b>意思越像的字靠得越近</b>。把問題裡的字一個一個轉到正前方鎖定，看看誰是它的鄰居。</>}
        steps={[
          { text: <>照星空上方的<b>箭頭</b>轉動星空（也可以拖曳）</>, keys: ["←", "→"], done: angle !== VECTOR_START_ANGLE || lockedTokenIds.length > 0 },
          { text: <>發光的目標字進入中間的<b>光帶</b>，光帶會變金色</>, done: aligned || lockedTokenIds.length > 0 },
          { text: "按「鎖定」，最近的 3 個字會拉出亮線", keys: ["Space"], done: lockedTokenIds.length > 0 },
          { text: `照順序再鎖定下一個字（至少 ${space.minLocks} 個，最多 ${space.maxLocks} 個）`, done: canContinue },
        ]}
        learned="對 AI 來說，「意思」就是「距離」：靠得越近的字，越常一起出現。線越短越亮，關係越近。"
        showLearned={lockedTokenIds.length > 0}
      />

      <div className="star-field" data-entry-target="true" data-entry-order="1" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className={`aim-band${aligned ? " is-aligned" : ""}`} aria-hidden="true"><span>光帶</span></div>
        {target && (
          <div className={`aim-guide${aligned ? " is-aligned" : ""}`} aria-hidden="true">
            目標：<b>{targetText}</b>
            <span>{aligned ? "對準了，按鎖定！" : turnLabel}</span>
          </div>
        )}
        <svg className="star-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {constellations.map(({ id, neighbors }) => {
            const from = toScreen(space.tokenPositions[id], angle);
            return neighbors.map((word) => {
              const to = toScreen(word.position, angle);
              const strength = Math.max(0.25, 1.2 - word.distance);
              return <line key={`${id}-${word.text}`} x1={from.left} y1={from.top} x2={to.left} y2={to.top} style={{ opacity: Math.min(1, strength + 0.15), strokeWidth: 1 + strength * 2 }} />;
            });
          })}
        </svg>
        {space.words.map((word) => {
          const point = toScreen(word.position, angle);
          const near = neighborTexts.has(word.text);
          return (
            <span
              key={word.text}
              className={`star-word${near ? " is-near" : ""}`}
              style={{ left: `${point.left}%`, top: `${point.top}%`, opacity: near ? 1 : Math.max(0.12, Math.min(0.5, 0.3 + point.depth * 0.08)), fontSize: `${(near ? 15 : 12) * point.scale}px`, zIndex: Math.round(50 + point.depth * 10) }}
              data-transition-item={near ? "true" : undefined}
              data-transition-id={near ? `vector-word-${word.text}` : undefined}
              data-transition-role={near ? "retained" : undefined}
              data-transition-source={near ? "dom" : undefined}
            >{word.text}</span>
          );
        })}
        {tokens.map((token) => {
          const point = toScreen(space.tokenPositions[token.id], angle);
          const locked = lockedTokenIds.includes(token.id);
          const isTarget = token.id === target;
          return (
            <span
              key={token.id}
              className={`star-token${locked ? " is-locked" : ""}${isTarget ? " is-target" : ""}${isTarget && aligned ? " is-aligned" : ""}`}
              style={{ left: `${point.left}%`, top: `${point.top}%`, zIndex: Math.round(80 + point.depth * 10), scale: String(Math.max(0.7, Math.min(1.15, point.scale))) }}
              data-transition-item="true"
              data-transition-id={`vector-${token.id}`}
              data-transition-role={locked ? "retained" : "discarded"}
              data-transition-source="dom"
            >
              <strong>{token.text}</strong>
              <small>#{token.tokenId}</small>
            </span>
          );
        })}
      </div>

      <div className="vector-console" data-entry-target="true" data-entry-order="3">
        <p className="interaction-hint" role="status">{hint}</p>
        <div className="vector-buttons">
          <button type="button" className="dial-step" aria-label="星空往左轉" disabled={!ready} onClick={() => dispatch({ type: "VECTOR_ROTATE", delta: -KEY_STEP * 2 })}>◀</button>
          <button type="button" className={`lock-button${aligned ? " is-aligned" : ""}`} disabled={!ready || !target} onClick={lock}>鎖定</button>
          <button type="button" className="dial-step" aria-label="星空往右轉" disabled={!ready} onClick={() => dispatch({ type: "VECTOR_ROTATE", delta: KEY_STEP * 2 })}>▶</button>
        </div>
        {latest && (
          <p className="vector-result">離「{tokenText(scenario, latest.id)}」最近：<b>{latest.neighbors.map((word) => word.text).join("、")}</b>{farthest ? <>；很遠的例子：{farthest.text}</> : null}</p>
        )}
        <p className="vector-progress">已鎖定 <strong>{lockedTokenIds.length}</strong> / {space.maxLocks}{lockedText.length ? `：${lockedText.join("、")}` : ""}</p>
      </div>
      <div className="scene-controls" data-entry-target="true" data-entry-order="4">
        <button type="button" className="primary-button" disabled={!canContinue || !ready} onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "attention" })}>
          {canContinue ? "帶著星座前往站 3" : `再鎖定 ${space.minLocks - lockedTokenIds.length} 個字才能前進`}
        </button>
      </div>
    </div>
  );
}

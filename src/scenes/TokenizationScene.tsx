import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";
import { autoSlash, cutOffsets, freedTokenIndexes, resolveSlash, sentenceChars, type SlashHit, type SlashOutcome } from "../data/tokenCuts";
import { playClank, playCrack, playSwish } from "../input/sliceSounds";
import { AvatarCanvas } from "../visual/AvatarCanvas";

interface TrailPoint { x: number; y: number; t: number }
interface Stroke { last: { x: number; y: number }; length: number; hits: number; lastHit: number }

const TRAIL_MS = 200;
const MIN_HIT_GAP_MS = 140;

export function TokenizationScene() {
  const { state, dispatch, scenario } = useExperience();
  const ready = state.scenePhase === "ready" && state.scene === "tokenization";
  const reduced = state.settings.reducedMotion;
  const chars = useMemo(() => sentenceChars(scenario), [scenario]);
  const cuts = useMemo(() => cutOffsets(scenario), [scenario]);
  const [done, setDone] = useState<number[]>([]);
  const [freshCut, setFreshCut] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [slashes, setSlashes] = useState(0);
  const [bounce, setBounce] = useState<{ tokenIndex: number | null; key: number } | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const sentenceRef = useRef<HTMLParagraphElement>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const strokeRef = useRef<Stroke | null>(null);
  const complete = done.length === cuts.length;
  const freed = useMemo(() => new Set(freedTokenIndexes(scenario, done)), [done, scenario]);

  /** One blade stroke landed; only a real tokenizer seam splits, anything else bounces off. */
  const slash = useCallback((outcome: SlashOutcome | null) => {
    if (!ready || !outcome) return;
    playSwish();
    setSlashes((count) => count + 1);
    setMessage(outcome.message);
    if (outcome.result === "bounce") {
      playClank();
      setBounce((previous) => ({ tokenIndex: outcome.tokenIndex, key: (previous?.key ?? 0) + 1 }));
      return;
    }
    playCrack();
    setBounce(null);
    setDone((previous) => (previous.includes(outcome.cut) ? previous : [...previous, outcome.cut]));
    setFreshCut(outcome.cut);
  }, [ready]);

  const slashRef = useRef(slash);
  const doneRef = useRef(done);
  useEffect(() => { slashRef.current = slash; doneRef.current = done; });

  // Keyboard stands in for the hand-held gyro blade: it can't aim, so each swing takes the next real seam.
  useEffect(() => {
    if (!ready) return;
    const handleKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.closest("input, select, textarea, button, .presenter-panel")) return;
      if (event.key !== " " && event.key !== "ArrowDown") return;
      event.preventDefault();
      if (event.repeat) return;
      slashRef.current(autoSlash(scenario, doneRef.current));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [ready, scenario]);

  // The blade trail fades out on its own.
  useEffect(() => {
    if (!trail.length) return;
    const frame = requestAnimationFrame(() => {
      const now = performance.now();
      setTrail((points) => points.filter((point) => now - point.t < TRAIL_MS));
    });
    return () => cancelAnimationFrame(frame);
  }, [trail]);

  const local = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = arenaRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, cx: event.clientX, cy: event.clientY };
  };

  /**
   * What the blade crossed at screen x: a seam between two characters (only a narrow band around the
   * gap counts), or the body of a character.
   */
  const hitAt = (clientX: number): SlashHit => {
    const rects = charRefs.current.map((span) => span?.getBoundingClientRect() ?? null);
    for (let boundary = 1; boundary < rects.length; boundary += 1) {
      const left = rects[boundary - 1];
      const right = rects[boundary];
      if (!left || !right) continue;
      const seamX = (left.right + right.left) / 2;
      const tolerance = Math.max((right.left - left.right) / 2, Math.min(left.width, right.width) * 0.2);
      if (Math.abs(clientX - seamX) <= tolerance) return { kind: "seam", boundary };
    }
    const index = rects.findIndex((rect) => rect && clientX >= rect.left && clientX <= rect.right);
    return index >= 0 ? { kind: "char", index } : { kind: "outside" };
  };

  const startStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!ready || complete) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = local(event);
    strokeRef.current = { last: { x: point.cx, y: point.cy }, length: 0, hits: 0, lastHit: 0 };
    setTrail([{ x: point.x, y: point.y, t: performance.now() }]);
  };

  const moveStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const point = local(event);
    const now = performance.now();
    setTrail((points) => [...points.filter((item) => now - item.t < TRAIL_MS), { x: point.x, y: point.y, t: now }]);
    const from = stroke.last;
    const to = { x: point.cx, y: point.cy };
    stroke.length += Math.hypot(to.x - from.x, to.y - from.y);
    stroke.last = to;
    const box = sentenceRef.current?.getBoundingClientRect();
    if (!box || from.y === to.y) return;
    // Did this bit of the stroke cross the sentence's middle line, inside the sentence?
    const midY = box.top + box.height / 2;
    if ((from.y - midY) * (to.y - midY) > 0) return;
    const crossX = from.x + ((midY - from.y) / (to.y - from.y)) * (to.x - from.x);
    if (crossX < box.left || crossX > box.right) return;
    if (now - stroke.lastHit < MIN_HIT_GAP_MS) return;
    stroke.hits += 1;
    stroke.lastHit = now;
    slashRef.current(resolveSlash(scenario, hitAt(crossX), doneRef.current));
  };

  const endStroke = () => {
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (stroke && stroke.hits === 0 && stroke.length > 60 && !complete) {
      playSwish();
      setMessage("劈空了！刀要從上往下（或由下往上）劃過句子。");
    }
  };

  // Group the characters into the chunks the cuts have made so far.
  const chunks: Array<{ start: number; end: number; tokenIndex: number | null }> = [];
  const sortedCuts = [...done].sort((a, b) => a - b);
  [0, ...sortedCuts].forEach((start, index) => {
    const end = sortedCuts[index] ?? chars.length;
    const tokenIndex = start === 0 ? 0 : cuts.indexOf(start) + 1;
    const isSingle = (tokenIndex === cuts.length ? chars.length : cuts[tokenIndex]) === end;
    chunks.push({ start, end, tokenIndex: isSingle && freed.has(tokenIndex) ? tokenIndex : null });
  });

  const tokenStart = (index: number) => (index === 0 ? 0 : cuts[index - 1]);
  const bounceHits = (chunk: { start: number; end: number }) => {
    if (!bounce || bounce.tokenIndex === null) return false;
    const start = tokenStart(bounce.tokenIndex);
    return start >= chunk.start && start < chunk.end;
  };

  const hint = complete
    ? "全部切完了！每一塊都翻面變成編號。"
    : message ?? "按住滑鼠，像揮刀一樣劃過飛起來的句子（或按 Space 揮一刀）。";

  return (
    <div className={`scene-shell tokenization-shell${complete ? " is-complete" : ""}`} data-slice-cuts={done.length} data-slice-complete={complete}>
      <SceneHeading eyebrow="站 1 · TOKENIZATION 切字" title="把問題切開：AI 一塊一塊讀。" />
      <MissionCard
        station="站 1 · 切字"
        task="彈珠裂開，問題被拋到空中。揮刀把句子劈開，看看 AI 會把它切成哪幾塊。"
        steps={[
          { text: "按住滑鼠，揮刀劃過飛起來的句子", keys: ["拖曳", "Space"], done: slashes > 0 },
          { text: "只有劈在 tokenizer 的切縫上才會裂開；劈在字中間會彈開", done: done.length > 0 },
          { text: `把句子全部切開（${done.length} / ${cuts.length} 刀）`, done: complete },
          { text: "切下的字片掉到下方，翻面變成數字編號", done: complete },
        ]}
        learned="切在哪裡由 tokenizer 決定，不是你。AI 讀到的不是文字，而是一串編號；同一個字（人）永遠是同一個編號。"
        showLearned={complete}
      />

      <div
        ref={arenaRef}
        className="slice-arena"
        data-entry-target="true"
        data-entry-order="1"
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      >
        <div className={`slice-throw${reduced ? " is-still" : ""}`}>
          <p ref={sentenceRef} className="slice-sentence token-question" aria-label={scenario.question} aria-hidden={complete}>
            {chunks.map((chunk, index) => (
              <span
                key={`${chunk.start}-${chunk.end}-${bounceHits(chunk) ? bounce?.key : 0}`}
                className={`slice-chunk${chunk.tokenIndex !== null ? " is-freed" : ""}${chunk.start === freshCut || chunk.end === freshCut ? " is-fresh" : ""}${bounceHits(chunk) ? " is-bounce" : ""}`}
                style={{ ["--tilt" as string]: `${index === 0 ? 0 : (index % 2 ? 1 : -1) * Math.min(6, 2 + index)}deg` }}
              >
                {chars.slice(chunk.start, chunk.end).map((char, offset) => (
                  <span key={chunk.start + offset} ref={(span) => { charRefs.current[chunk.start + offset] = span; }} aria-hidden="true">{char}</span>
                ))}
              </span>
            ))}
          </p>
        </div>
        <svg className="slice-trail" aria-hidden="true">
          {trail.length > 1 && <polyline points={trail.map((point) => `${point.x},${point.y}`).join(" ")} />}
        </svg>

        {state.avatar && (
          <div className="slice-avatar" aria-hidden="true">
            <AvatarCanvas points={state.avatar.points} edges={state.avatar.edges} reveal={1} dissolve={0.55} size={72} />
            <span>{state.avatar.modelNumber}</span>
          </div>
        )}

        <div className="token-row token-tray" aria-label={`${scenario.inputTokens.length} 個 token`}>
          {scenario.inputTokens.map((token) => (freed.has(scenario.inputTokens.indexOf(token)) ? (
            <div
              key={token.id}
              className={`token-chip${reduced ? " is-instant" : ""}`}
              aria-label={`「${token.text}」→ 編號 ${token.tokenId}`}
              data-transition-item="true"
              data-transition-id={token.id}
              data-transition-role="retained"
              data-transition-source="dom"
            >
              <div className="chip-inner">
                <span className="chip-front">{token.text}</span>
                <span className="chip-back"><b>#{token.tokenId}</b><small>{token.text}</small></span>
              </div>
            </div>
          ) : <div key={token.id} className="token-slot" aria-hidden="true" />))}
        </div>
      </div>

      <div className="slice-console" data-entry-target="true" data-entry-order="3">
        <p className="interaction-hint" role="status">{hint}</p>
      </div>
      <div className="scene-controls" data-entry-target="true" data-entry-order="4">
        <button type="button" className="primary-button" disabled={!complete || !ready} onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "vector" })}>
          {complete ? "帶著編號前往站 2" : `還有 ${cuts.length - done.length} 刀`}
        </button>
      </div>
    </div>
  );
}

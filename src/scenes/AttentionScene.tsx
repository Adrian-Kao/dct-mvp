import { useEffect, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";
import { linksFrom, strongestLink, tokenText, type AttentionLink } from "../data/attention";
import { playClank, playCrack } from "../input/sliceSounds";

const VIEW_W = 1000;
const VIEW_H = 425;
const BASE_Y = 318;
const CHIP_H = 62;

const pct = (value: number) => `${Math.round(value * 100)}%`;

/** Where each question token sits on the board (evenly spread, sized to its text). */
function layout(texts: string[]) {
  const step = (VIEW_W - 120) / Math.max(1, texts.length - 1);
  return texts.map((text, index) => ({ x: 60 + index * step, width: Math.min(step - 14, Math.max(64, Array.from(text).length * 30 + 34)) }));
}

/** An arc that leaves the top of one chip and lands on the top of another; farther apart = higher. */
function arcPath(fromX: number, toX: number) {
  const top = BASE_Y - CHIP_H / 2 - 4;
  const lift = 46 + Math.abs(toX - fromX) * 0.42;
  return { d: `M ${fromX} ${top} Q ${(fromX + toX) / 2} ${top - lift} ${toX} ${top}`, apexX: (fromX + toX) / 2, apexY: top - lift / 2 };
}

export function AttentionScene() {
  const { state, dispatch, scenario } = useExperience();
  const ready = state.scenePhase === "ready" && state.scene === "attention";
  const { round, revealed, complete, guesses } = state.attention;
  const keywords = scenario.attention.keywordTokenIds;
  const tokens = scenario.inputTokens;
  const focusId = keywords[Math.min(round, keywords.length - 1)];
  const focusIndex = tokens.findIndex((token) => token.id === focusId);
  const positions = layout(tokens.map((token) => token.text.trim()));
  const links = linksFrom(scenario, focusId);
  const strongest = strongestLink(scenario, focusId);
  const guess = revealed ? guesses[guesses.length - 1] : null;

  const firstChoice = focusIndex === 0 ? 1 : 0;
  const [cursorState, setCursorState] = useState({ round: -1, index: firstChoice });
  const cursor = cursorState.round === round ? cursorState.index : firstChoice;

  const move = (direction: 1 | -1) => {
    let next = cursor;
    do next = (next + direction + tokens.length) % tokens.length; while (next === focusIndex);
    setCursorState({ round, index: next });
  };

  const choose = (index: number) => {
    if (!ready || revealed || complete || index === focusIndex) return;
    setCursorState({ round, index });
    const tokenId = tokens[index].id;
    if (tokenId === strongestLink(scenario, focusId).tokenId) playCrack(); else playClank();
    dispatch({ type: "ATTENTION_GUESS", scenario, tokenId });
  };

  const next = () => {
    if (ready && revealed && !complete) dispatch({ type: "ATTENTION_NEXT", scenario });
  };

  // Keyboard stands in for the knob: ← → choose a word, Space pulls the line (then moves on).
  const keyRef = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyRef.current = (event) => {
      const element = event.target as HTMLElement | null;
      if (element?.closest("input, select, textarea, button, .presenter-panel")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (!revealed) move(event.key === "ArrowLeft" ? -1 : 1);
      } else if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        if (event.repeat) return;
        if (revealed) next(); else choose(cursor);
      }
    };
  });
  useEffect(() => {
    if (!ready || complete) return;
    const handleKey = (event: KeyboardEvent) => keyRef.current(event);
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [complete, ready]);

  const focusText = tokenText(scenario, focusId);
  const note = scenario.attention.notes?.[focusId] ?? "";
  let message: string;
  if (complete) {
    message = `${keywords.length} 個字的關係都找到了。金色的線是每個字最在意的對象：AI 就是靠這些關係，讀懂這個問題在問什麼。`;
  } else if (guess) {
    const guessLink = links.find((link) => link.tokenId === guess.guessId)!;
    const lead = guess.correct
      ? `猜對了！「${focusText}」最在意「${strongest.text}」（${pct(strongest.weight)}）。`
      : guessLink.text === strongest.text
        ? `很接近！「${strongest.text}」出現了兩次，「${focusText}」比較在意另一個「${strongest.text}」（${pct(strongest.weight)}）。`
        : `「${focusText}」只花了 ${pct(guessLink.weight)} 的注意力在「${guessLink.text}」上，它最在意的是「${strongest.text}」（${pct(strongest.weight)}）。`;
    message = `${lead}${note ? ` ${note}` : ""}`;
  } else {
    message = "用 ← → 選一個字（或直接點），按 Space 從發光的字拉一條線過去。";
  }

  // The relation map: one gold arc per pair (想念→人 and 人→想念 share an arc and a label).
  const finalLinks: Array<{ from: number; link: AttentionLink; strongest: boolean; label: string }> = [];
  if (complete) {
    guesses.forEach((item) => {
      const from = tokens.findIndex((token) => token.id === item.focusId);
      const link = linksFrom(scenario, item.focusId).find((candidate) => candidate.tokenId === item.strongestId)!;
      const twin = finalLinks.find((other) => other.from === link.index && other.link.index === from);
      const arrow = `${tokenText(scenario, item.focusId)}→${link.text} ${pct(link.weight)}`;
      if (twin) twin.label = `${twin.label} · ${arrow}`;
      else finalLinks.push({ from, link, strongest: true, label: arrow });
    });
  }
  const shown: Array<{ from: number; link: AttentionLink; strongest: boolean; label?: string }> = complete
    ? finalLinks
    : revealed
      ? links.map((link) => ({ from: focusIndex, link, strongest: link.tokenId === strongest.tokenId }))
      : [];

  return (
    <div className="scene-shell attention-shell" data-attention-round={round} data-attention-revealed={revealed} data-attention-complete={complete}>
      <SceneHeading eyebrow="站 3 · ATTENTION 注意力" title="每個字，都在看別的字。" />
      <MissionCard
        station="站 3 · 注意力"
        task={<>AI 讀問題時，會計算每個字和其他字之間的<b>關係強度</b>。猜猜看：發光的字，最在意的是誰？</>}
        steps={[
          { text: "用 ← → 選一個字（或直接點），Space 拉一條線過去", keys: ["←", "→", "Space"], done: guesses.length > 0 },
          { text: "看揭曉：線越粗、數字越大，關係越強", done: guesses.length > 0 && (revealed || round > 0) },
          { text: `找出 ${keywords.length} 個字最在意的對象（${guesses.length} / ${keywords.length}）`, done: complete },
        ]}
        learned={`注意力就是在算「誰和誰有關」：每個字都會看向其他字，看得越用力，線越粗。AI 靠這些關係，知道「${tokenText(scenario, keywords[0])}」連到的是「${strongestLink(scenario, keywords[0]).text}」。`}
        showLearned={complete}
      />

      <section className="attention-stage" data-entry-target="true" data-entry-order="1">
        <p className="attention-prompt" aria-live="polite">
          {complete ? <>這就是 AI 看到的<b>關係網</b></> : <><small>第 {round + 1} / {keywords.length} 個字</small>「<b>{focusText}</b>」最在意問題裡的哪個字？</>}
        </p>
        <svg className="attention-board" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="group" aria-label="問題裡的字與關係線">
          {shown.map(({ from, link, strongest: isStrongest, label }, order) => {
            const arc = arcPath(positions[from].x, positions[link.index].x);
            const isGuess = guess?.guessId === link.tokenId;
            return (
              <g key={`${from}-${link.tokenId}`} className={`attention-link${isStrongest ? " is-strongest" : ""}${isGuess ? " is-guess" : ""}`} style={{ ["--order" as string]: order }}>
                <path d={arc.d} pathLength={1} style={{ strokeWidth: 1.5 + link.weight * 30, opacity: isStrongest ? 1 : 0.28 + link.weight * 1.6 }} />
                {label && <text x={arc.apexX} y={arc.apexY - 6}>{label}</text>}
              </g>
            );
          })}
          {!revealed && !complete && (
            <path className="attention-aim" d={arcPath(positions[focusIndex].x, positions[cursor].x).d} />
          )}
          {tokens.map((token, index) => {
            const { x, width } = positions[index];
            const isFocus = !complete && index === focusIndex;
            const isCursor = !revealed && !complete && index === cursor;
            const isPicked = guess?.guessId === token.id;
            const badge = revealed && !complete ? links.find((link) => link.tokenId === token.id) : undefined;
            const isTarget = (revealed && token.id === strongest.tokenId) || (complete && guesses.some((item) => item.strongestId === token.id || item.focusId === token.id));
            return (
              <g
                key={token.id}
                className={`attention-chip${isFocus ? " is-focus" : ""}${isCursor ? " is-cursor" : ""}${isPicked ? " is-picked" : ""}${isTarget ? " is-target" : ""}`}
                transform={`translate(${x} ${BASE_Y})`}
                role={isFocus || revealed || complete ? undefined : "button"}
                aria-label={isFocus ? `${token.text.trim()}（發光的字）` : `${token.text.trim()}，編號 ${token.tokenId}`}
                onPointerEnter={() => { if (!revealed && !complete && index !== focusIndex) setCursorState({ round, index }); }}
                onClick={() => choose(index)}
              >
                <rect x={-width / 2} y={-CHIP_H / 2} width={width} height={CHIP_H} rx={14} />
                <text className="chip-word" y={4}>{token.text.trim()}</text>
                <text className="chip-id" y={CHIP_H / 2 + 20}>#{token.tokenId}</text>
                {badge && <text className={`chip-badge${badge.tokenId === strongest.tokenId ? " is-strongest" : ""}${isPicked ? " is-picked" : ""}`} y={CHIP_H / 2 + 48} style={{ ["--order" as string]: badge.index }}>{isPicked ? `你猜 · ${pct(badge.weight)}` : pct(badge.weight)}</text>}
              </g>
            );
          })}
        </svg>
      </section>

      <div className="attention-bottom" data-entry-target="true" data-entry-order="3">
        <p className={`interaction-hint${guess && !guess.correct ? " is-miss" : ""}`} role="status">{message}</p>
        <div className="scene-controls">
          {complete ? (
            <button type="button" className="primary-button" disabled={!ready} onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "generation" })}>帶著關係線前往站 4</button>
          ) : revealed ? (
            <button type="button" className="primary-button" disabled={!ready} onClick={next}>{round + 1 >= keywords.length ? "看整張關係網" : "下一個字"}</button>
          ) : (
            <button type="button" className="primary-button" disabled={!ready} onClick={() => choose(cursor)}>就是「{tokenText(scenario, tokens[cursor].id)}」</button>
          )}
        </div>
      </div>
    </div>
  );
}

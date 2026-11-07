import { useCallback, useEffect, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { STATION_DOTS, stationCardContent } from "../data/stationCards";

const CHAR_MS = 38;
const MIN_SKIP_MS = 500;

/**
 * Full-screen black card at the start and end of each station: what this station is about and how far
 * along the visitor is. Text types itself in; it leaves on its own, or on any key / click.
 */
export function StationCard() {
  const { state, dispatch, scenario } = useExperience();
  const card = state.card;
  const content = card ? stationCardContent(card, state, scenario) : null;
  const reduced = state.settings.reducedMotion;
  const shownAt = useRef(0);
  const cardKey = card ? `${card.kind}-${card.scene}-${state.sceneInstanceId}` : "";
  const [leavingKey, setLeavingKey] = useState("");
  const leaving = cardKey !== "" && leavingKey === cardKey;

  const text = content ? content.title + content.lines.join("") : "";
  const holdMs = reduced ? 2600 : 1400 + text.length * CHAR_MS + 1800;

  const leave = useCallback(() => {
    if (leaving || performance.now() - shownAt.current < MIN_SKIP_MS) return;
    setLeavingKey(cardKey);
  }, [cardKey, leaving]);

  // A new card starts fresh.
  useEffect(() => {
    if (!cardKey) return;
    shownAt.current = performance.now();
  }, [cardKey]);

  useEffect(() => {
    if (!cardKey || leaving) return;
    const timer = window.setTimeout(() => setLeavingKey(cardKey), holdMs);
    return () => window.clearTimeout(timer);
  }, [cardKey, holdMs, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => dispatch({ type: "CARD_DONE" }), reduced ? 150 : 550);
    return () => window.clearTimeout(timer);
  }, [dispatch, leaving, reduced]);

  // While the card is up it owns the keyboard (except D for the presenter tools).
  useEffect(() => {
    if (!cardKey) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "d" || event.key === "D") return;
      if ((event.target as HTMLElement | null)?.closest(".presenter-panel")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) leave();
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [cardKey, leave]);

  if (!card || !content) return null;
  let index = 0;
  const typed = (value: string) => Array.from(value).map((char) => {
    index += 1;
    return <span key={index} className="card-char" style={{ ["--i" as string]: index }}>{char}</span>;
  });

  return (
    <div
      key={cardKey}
      className={`station-card is-${card.kind}${leaving ? " is-leaving" : ""}${reduced ? " is-reduced" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${content.kicker}：${content.title}`}
      data-station-card={card.kind}
      onClick={leave}
      style={{ ["--hold" as string]: `${holdMs}ms` }}
    >
      <div className="card-body">
        <p className="card-kicker">{content.kicker}</p>
        <h2 className="card-title">{typed(content.title)}</h2>
        {content.lines.map((line) => <p key={line} className="card-line">{typed(line)}</p>)}
        <ol className="card-progress" aria-label="進度">
          {STATION_DOTS.map((name, station) => (
            <li
              key={name}
              className={station < content.station || (station === content.station && card.kind === "outro") ? "is-done" : station === content.station ? "is-current" : ""}
            >
              <span aria-hidden="true" />{name}
            </li>
          ))}
        </ol>
      </div>
      <p className="card-skip">按任意鍵或點一下繼續<span className="card-timer" aria-hidden="true" /></p>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";
import { drawWeighted, landingRotation, mostLikely, wheelSlices } from "../data/prediction";
import { playSwish } from "../input/sliceSounds";

const WHEEL = 300;
const RADIUS = 140;
const SLICE_COLORS = ["rgba(255,210,138,.55)", "rgba(142,234,255,.42)", "rgba(190,160,255,.42)", "rgba(140,230,170,.4)", "rgba(255,150,130,.42)", "rgba(165,178,194,.4)"];

function polar(angle: number, radius: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return { x: WHEEL / 2 + Math.cos(radians) * radius, y: WHEEL / 2 + Math.sin(radians) * radius };
}

function slicePath(start: number, end: number) {
  const sweep = Math.min(end - start, 359.99);
  const a = polar(start, RADIUS);
  const b = polar(start + sweep, RADIUS);
  return `M ${WHEEL / 2} ${WHEEL / 2} L ${a.x} ${a.y} A ${RADIUS} ${RADIUS} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}

interface Outcome { text: string; probability: number; because?: string; kept: boolean; greedy: boolean }

export function PredictionScene() {
  const { state, dispatch, scenario } = useExperience();
  const ready = state.scenePhase === "ready" && state.scene === "attention";
  const reduced = state.settings.reducedMotion;
  const { round, complete, missesThisRound } = state.prediction;
  const rounds = scenario.prediction.rounds;
  const current = rounds[Math.min(round, rounds.length - 1)];
  const slices = wheelSlices(current.candidates);
  const greedyNext = missesThisRound > 0;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const timer = useRef<number | null>(null);
  const spinSeconds = reduced ? 0.3 : 2.6;
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const spin = useCallback(() => {
    if (!ready || spinning || complete) return;
    const index = greedyNext ? mostLikely(current.candidates) : drawWeighted(current.candidates, Math.random());
    const slice = slices[index];
    const jitter = (Math.random() - 0.5) * (slice.end - slice.start) * 0.6;
    setRotation((value) => landingRotation(value, slice.middle, reduced ? 1 : 4, jitter));
    setSpinning(true);
    setOutcome(null);
    playSwish();
    timer.current = window.setTimeout(() => {
      const candidate = current.candidates[index];
      setSpinning(false);
      setOutcome({ ...candidate, kept: candidate.text === scenario.answer.tokens[round], greedy: greedyNext });
      dispatch({ type: "PREDICTION_PICK", scenario, candidateIndex: index, greedy: greedyNext });
    }, spinSeconds * 1000);
  }, [complete, current, dispatch, greedyNext, ready, reduced, round, scenario, slices, spinSeconds, spinning]);

  // Keyboard stands in for the big turntable: any flick (← → ↓) or Space spins it.
  useEffect(() => {
    if (!ready) return;
    const handleKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.closest("input, select, textarea, .presenter-panel, .scene-controls")) return;
      if ([" ", "ArrowLeft", "ArrowRight", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        if (!event.repeat) spin();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [ready, spin]);

  const answerSoFar = scenario.answer.tokens.slice(0, round);
  const becauseWeight = new Map<string, number>();
  if (!complete) current.candidates.forEach((candidate) => { if (candidate.because) becauseWeight.set(candidate.because, Math.max(becauseWeight.get(candidate.because) ?? 0, candidate.probability)); });
  const pct = (value: number) => `${Math.round(value * 100)}%`;

  let message: string;
  if (complete) message = `${rounds.length} 個詞都抽好了：「${answerSoFar.join("")}」。剩下的字，交給站 4 的水泵一個一個壓出來。`;
  else if (spinning) message = greedyNext ? "這次用 AI 最常用的做法：直接選機率最高的……" : "轉盤轉動中……";
  else if (outcome && !outcome.kept) message = `抽到「${outcome.text}」（${pct(outcome.probability)}）！真的 AI 也可能這樣接，答案就會走向另一個方向。這台展示機只準備了一條路，再轉一次：這次改用 AI 最常用的做法，直接選機率最高的。`;
  else if (outcome) message = `抽到「${outcome.text}」（${pct(outcome.probability)}），接到答案後面！${outcome.because ? `它的機率高，是因為 AI 注意到問題裡的「${outcome.because}」。` : ""}`;
  else message = round === 0 ? "轉動轉盤（Space 或按「轉！」），抽出答案的第一個詞。格子越大，越容易抽中。" : "再轉一次，抽出下一個詞。";

  return (
    <div className="scene-shell prediction-shell" data-prediction-round={round} data-prediction-complete={complete} data-prediction-spinning={spinning}>
      <SceneHeading eyebrow="站 3 · ATTENTION → 接龍" title="下一個詞，是抽出來的。" />
      <MissionCard
        station="站 3 · 接龍"
        task={<>AI 不是想好整句話才說，而是<b>一次抽一個詞</b>。轉盤上每一格是一個候選詞，格子越大、機率越高。</>}
        steps={[
          { text: "看轉盤：每一格是一個候選詞和它的機率" },
          { text: "轉動轉盤，指針停在哪一格就抽到哪個詞", keys: ["Space", "←", "→"], done: state.prediction.picks.length > 0 },
          { text: `抽中的詞接到答案後面，共 ${rounds.length} 輪（${Math.min(round, rounds.length)} / ${rounds.length}）`, done: complete },
        ]}
        learned="AI 的回答是一個詞一個詞抽出來的。機率高的詞，來自它注意到的字；但轉到別的格子，答案就會不一樣。"
        showLearned={complete}
      />

      <section className="prediction-context" data-entry-target="true" data-entry-order="1">
        <p className="prediction-question" aria-label={`問題：${scenario.question}`}>
          {scenario.inputTokens.map((token) => {
            const weight = becauseWeight.get(token.text.trim()) ?? 0;
            return <span key={token.id} className={weight ? "is-attended" : ""} style={{ ["--glow" as string]: weight.toFixed(2) }}>{token.text}</span>;
          })}
        </p>
        <p className="prediction-answer" aria-label="答案">
          <small>答案：</small>
          {answerSoFar.map((text, index) => (
            <span key={index} className={index === round - 1 ? "is-new" : ""} data-transition-item="true" data-transition-id={`prediction-${index}`} data-transition-role="retained" data-transition-source="dom">{text}</span>
          ))}
          {!complete && <i className="typing-caret" aria-hidden="true" />}
        </p>
      </section>

      <section className="prediction-stage" data-entry-target="true" data-entry-order="2">
        <figure className="prediction-wheel" aria-label={`第 ${Math.min(round + 1, rounds.length)} 輪轉盤`}>
          <svg viewBox={`0 0 ${WHEEL} ${WHEEL}`} aria-hidden="true">
            <g className="wheel-rotor" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${spinSeconds}s` }}>
              {slices.map((slice, index) => {
                const label = polar(slice.middle, RADIUS * 0.62);
                return (
                  <g key={slice.candidate.text} className="wheel-slice" data-wheel-slice={slice.candidate.text}>
                    <path d={slicePath(slice.start, slice.end)} style={{ fill: SLICE_COLORS[index % SLICE_COLORS.length] }} />
                    {slice.candidate.probability >= 0.06 && (
                      <text x={label.x} y={label.y} transform={`rotate(${slice.middle} ${label.x} ${label.y})`}>
                        <tspan x={label.x} dy="-0.2em">{slice.candidate.text}</tspan>
                        <tspan x={label.x} dy="1.2em" className="wheel-pct">{pct(slice.candidate.probability)}</tspan>
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
            <circle cx={WHEEL / 2} cy={WHEEL / 2} r="22" className="wheel-hub" />
            <path d={`M ${WHEEL / 2 - 13} 0 L ${WHEEL / 2 + 13} 0 L ${WHEEL / 2} 26 Z`} className="wheel-pointer" />
          </svg>
        </figure>

        <div className="prediction-side">
          <ul className="prediction-candidates" aria-label="候選詞與機率">
            {current.candidates.map((candidate, index) => (
              <li key={candidate.text} className={outcome?.text === candidate.text && !spinning ? (outcome.kept ? "is-kept" : "is-miss") : ""}>
                <i style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }} aria-hidden="true" />
                <strong>{candidate.text}</strong>
                <span className="candidate-bar"><span style={{ width: pct(candidate.probability) }} /></span>
                <b>{pct(candidate.probability)}</b>
                {candidate.because && <small>← 注意到「{candidate.because}」</small>}
              </li>
            ))}
          </ul>
          <button type="button" className="spin-button" disabled={!ready || spinning || complete} onClick={spin}>
            {greedyNext ? "選機率最高的" : "轉！"}
          </button>
        </div>
      </section>

      <div className="prediction-bottom" data-entry-target="true" data-entry-order="3">
        <p className={`interaction-hint${outcome && !outcome.kept && !spinning ? " is-miss" : ""}`} role="status">{message}</p>
        <div className="scene-controls">
          <button type="button" className="primary-button" disabled={!complete || !ready} onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "generation" })}>帶著開頭前往站 4</button>
        </div>
      </div>
    </div>
  );
}

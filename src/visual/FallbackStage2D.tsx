import type { ExperienceState } from "../app/experienceReducer";
import type { ChoiceFixture, ScenarioFixture } from "../data/scenarioTypes";
import { candidateAnchors } from "./visualConfig";

interface Props {
  state: ExperienceState;
  scenario: ScenarioFixture;
  candidates: ChoiceFixture[];
}

export function FallbackStage2D({ state, scenario, candidates }: Props) {
  const resolving = ["resolvingChoice", "compacting", "converging", "coreReady", "exiting", "swapping"].includes(state.transitionVisualPhase);
  const converging = ["converging", "coreReady", "exiting", "swapping"].includes(state.transitionVisualPhase);
  const selectedCandidateIndex = candidates.findIndex((candidate) => candidate.id === state.prediction.pendingCandidateId);
  return (
    <div className={`fallback-stage fallback-${state.scene}`} aria-hidden="true">
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="dotGlow">
            <stop offset="0" stopColor="#d8fbff" stopOpacity="1" />
            <stop offset="0.32" stopColor="#8eeaff" stopOpacity="0.8" />
            <stop offset="1" stopColor="#8eeaff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {state.scene === "vector" && scenario.vectorNodes.filter((node) => node.id !== "childhood").map((node, index) => {
          const angle = (index / 8) * Math.PI * 2;
          const x = 500 + Math.cos(angle) * 260;
          const y = 300 + Math.sin(angle) * 170;
          const retained = state.exploredConceptIds.includes(node.id);
          return (
            <g key={node.id} className={`fallback-vector-node ${retained ? "is-retained" : "is-discarded"}`}>
              <line x1="500" y1="300" x2={x} y2={y} className="fallback-line" />
              <circle cx={x} cy={y} r={retained ? 7 : 4} className="fallback-vector-dot" />
            </g>
          );
        })}
        {state.scene === "vector" && <circle cx="500" cy="300" r="9" className="fallback-vector-dot is-center" />}
        {state.scene === "prediction" && Array.from({ length: state.settings.reducedMotion ? 70 : 180 }, (_, index) => {
          const assigned = index % Math.max(1, candidates.length);
          const target = candidateAnchors[assigned] ?? candidateAnchors[1];
          const progress = state.prediction.phase === "awaitingChoice" || state.prediction.phase === "commit" ? 1 : 0.35;
          const x = 40 + (target.x * 1000 - 40) * progress + Math.sin(index * 2.1) * 26;
          const y = 300 + ((target.y - 0.5) * 600) * progress + Math.cos(index * 1.7) * 130 * (1 - progress);
          const retained = assigned === selectedCandidateIndex;
          const length = Math.max(1, Math.hypot(x - 500, y - 300));
          const discardedX = ((x - 500) / length) * 440;
          const discardedY = ((y - 300) / length) * 300;
          const retainedX = 500 - x;
          const retainedY = 300 - y;
          const transform = resolving
            ? retained
              ? converging ? `translate(${retainedX}px, ${retainedY}px) scale(.12)` : "scale(.7)"
              : `translate(${discardedX}px, ${discardedY}px) scale(.5)`
            : "none";
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={index % 9 === 0 ? 4.8 : 2.1}
              className={`fallback-particle ${retained ? "is-retained" : "is-discarded"}`}
              style={{
                animationDelay: `${-(index % 30) * 0.08}s`,
                opacity: resolving && !retained ? 0 : converging && retained ? 0.08 : undefined,
                transform,
                transformOrigin: `${x}px ${y}px`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

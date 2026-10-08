import type { ExperienceState } from "../app/experienceReducer";
import type { ChoiceFixture, ScenarioFixture } from "../data/scenarioTypes";

interface Props {
  state: ExperienceState;
  scenario: ScenarioFixture;
  candidates: ChoiceFixture[];
}

export function FallbackStage2D({ state, scenario, candidates }: Props) {
  void candidates;
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
      </svg>
    </div>
  );
}

import { createContext, type Dispatch, type ReactNode, useContext, useMemo, useReducer } from "react";
import rawScenario from "../data/scenario.json";
import type { ScenarioFixture } from "../data/scenarioTypes";
import { validateScenario } from "../data/validateScenario";
import { createInitialState, experienceReducer, type ExperienceAction, type ExperienceState } from "./experienceReducer";

const scenario = validateScenario(rawScenario);

interface ExperienceContextValue {
  state: ExperienceState;
  dispatch: Dispatch<ExperienceAction>;
  scenario: ScenarioFixture;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const initialReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [state, dispatch] = useReducer(experienceReducer, createInitialState(scenario.id, initialReducedMotion));
  const value = useMemo(() => ({ state, dispatch, scenario }), [state]);
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

// A colocated hook keeps this small provider easy to consume across scenes.
// eslint-disable-next-line react-refresh/only-export-components
export function useExperience(): ExperienceContextValue {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error("useExperience must be used within ExperienceProvider");
  return context;
}

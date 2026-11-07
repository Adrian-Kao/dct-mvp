import { fullAnswer } from "../data/attention";
import type { ScenarioFixture } from "../data/scenarioTypes";
import type { ExperienceState } from "./experienceReducer";

export interface ResolvedAnswer {
  answerId: string;
  fullAnswer: string;
}

export function selectVisibleAnswer(state: ExperienceState, scenario: ScenarioFixture): string {
  return scenario.answer.tokens.slice(0, state.generation.appendedCount).join("");
}

/** The finished answer, or null until every token has been pumped out. */
export function selectAnswer(state: ExperienceState, scenario: ScenarioFixture): ResolvedAnswer | null {
  if (!state.generation.complete) return null;
  return { answerId: scenario.answer.id, fullAnswer: fullAnswer(scenario) };
}

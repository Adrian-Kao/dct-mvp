import { fullAnswer, strongestLinks } from "../data/attention";
import type { AttentionLink, ScenarioFixture } from "../data/scenarioTypes";
import type { ExperienceState } from "./experienceReducer";

export interface ResolvedAnswer {
  answerId: string;
  fullAnswer: string;
}

export function selectFocusToken(state: ExperienceState, scenario: ScenarioFixture) {
  return scenario.inputTokens[state.attention.focusIndex] ?? scenario.inputTokens[0];
}

export function selectStrongestLinks(state: ExperienceState, scenario: ScenarioFixture): AttentionLink[] {
  return strongestLinks(scenario, state.attention.visitedTokenIds);
}

export function selectVisibleAnswer(state: ExperienceState, scenario: ScenarioFixture): string {
  return scenario.answer.tokens.slice(0, state.generation.appendedCount).join("");
}

/** The finished answer, or null until every token has been pumped out. */
export function selectAnswer(state: ExperienceState, scenario: ScenarioFixture): ResolvedAnswer | null {
  if (!state.generation.complete) return null;
  return { answerId: scenario.answer.id, fullAnswer: fullAnswer(scenario) };
}

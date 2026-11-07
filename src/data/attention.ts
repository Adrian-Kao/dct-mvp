import type { ScenarioFixture } from "./scenarioTypes";

export function fullAnswer(scenario: ScenarioFixture): string {
  return scenario.answer.tokens.join("");
}

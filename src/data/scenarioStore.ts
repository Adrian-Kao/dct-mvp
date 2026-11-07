import { defaultAttention } from "./attention";
import rawScenario from "./scenario.json";
import type { ScenarioFixture } from "./scenarioTypes";
import { validateScenario } from "./validateScenario";

/**
 * The exhibition plays the scenario the back office saved on this computer, or the built-in one.
 * Browser storage is per machine; the back office can also export / import the JSON as a file.
 */
const KEY = "before-the-answer.active-scenario";

export const defaultScenario: ScenarioFixture = validateScenario(rawScenario);

/** Questions saved while station 3 was a wheel have no attention table: give them a default one. */
export function withAttention(data: Record<string, unknown>): Record<string, unknown> {
  if (data.attention || !Array.isArray(data.inputTokens)) return data;
  const tokens = data.inputTokens as ScenarioFixture["inputTokens"];
  const lockOrder = ((data.vectorSpace as ScenarioFixture["vectorSpace"] | undefined)?.lockOrder ?? tokens.map((token) => token.id)).slice(0, 3);
  return { ...data, attention: defaultAttention(tokens, lockOrder) };
}

export function loadActiveScenario(): { scenario: ScenarioFixture; custom: boolean } {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) return { scenario: validateScenario(withAttention(JSON.parse(saved))), custom: true };
  } catch {
    // Broken or blocked storage: fall back to the built-in question.
  }
  return { scenario: defaultScenario, custom: false };
}

export function saveActiveScenario(scenario: ScenarioFixture): void {
  window.localStorage.setItem(KEY, JSON.stringify(validateScenario(scenario)));
}

export function clearActiveScenario(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing saved
  }
}

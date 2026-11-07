import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";

describe("scenario fixture", () => {
  const scenario = validateScenario(rawScenario);

  it("reconstructs the fixed question exactly", () => {
    expect(scenario.inputTokens.map((token) => token.text).join("")).toBe(scenario.question);
  });

  it("has one normalized attention row per token and keywords that exist", () => {
    for (const token of scenario.inputTokens) {
      const row = scenario.attention.weights[token.id];
      expect(row).toHaveLength(scenario.inputTokens.length);
      expect(Math.abs(row.reduce((sum, weight) => sum + weight, 0) - 1)).toBeLessThan(1e-6);
    }
    const ids = scenario.inputTokens.map((token) => token.id);
    expect(scenario.attention.keywordTokenIds.every((id) => ids.includes(id))).toBe(true);
  });

  it("has a non-empty answer token sequence", () => {
    expect(scenario.answer.tokens.length).toBeGreaterThan(0);
    expect(scenario.answer.tokens.every((token) => token.length > 0)).toBe(true);
  });

  it("rejects incomplete or misleading fixture data", () => {
    const broken = structuredClone(rawScenario);
    broken.attention.weights.t01[0] = 0;
    expect(() => validateScenario(broken)).toThrow(/weight must be positive/u);
    const unbalanced = structuredClone(rawScenario);
    unbalanced.attention.weights.t02[0] = 0.5;
    expect(() => validateScenario(unbalanced)).toThrow(/must add to 1/u);
  });
});

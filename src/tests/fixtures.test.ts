import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";

describe("scenario fixture", () => {
  const scenario = validateScenario(rawScenario);

  it("reconstructs the fixed question exactly", () => {
    expect(scenario.inputTokens.map((token) => token.text).join("")).toBe(scenario.question);
  });

  it("has one probability wheel per drawn word, each including the answer's next word", () => {
    scenario.prediction.rounds.forEach((round, index) => {
      expect(round.candidates.map((candidate) => candidate.text)).toContain(scenario.answer.tokens[index]);
      expect(Math.abs(round.candidates.reduce((sum, candidate) => sum + candidate.probability, 0) - 1)).toBeLessThan(1e-6);
    });
  });

  it("has a non-empty answer token sequence", () => {
    expect(scenario.answer.tokens.length).toBeGreaterThan(0);
    expect(scenario.answer.tokens.every((token) => token.length > 0)).toBe(true);
  });

  it("rejects incomplete or misleading fixture data", () => {
    const broken = structuredClone(rawScenario);
    broken.prediction.rounds[0].candidates[0].text = "不是答案";
    expect(() => validateScenario(broken)).toThrow(/must include the answer token/u);
    const unbalanced = structuredClone(rawScenario);
    unbalanced.prediction.rounds[1].candidates[0].probability = 0.9;
    expect(() => validateScenario(unbalanced)).toThrow(/must add to 1/u);
  });
});

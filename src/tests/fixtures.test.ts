import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";

describe("scenario fixture", () => {
  const scenario = validateScenario(rawScenario);

  it("reconstructs the fixed question exactly", () => {
    expect(scenario.inputTokens.map((token) => token.text).join("")).toBe(scenario.question);
  });

  it("contains complete unique candidate groups with normalized illustrative weights", () => {
    for (const route of scenario.routes) {
      const groups = [route.round1, ...Object.values(route.round2ByFirst)];
      for (const group of groups) {
        expect(group).toHaveLength(3);
        expect(new Set(group.map((choice) => choice.id)).size).toBe(3);
        expect(group.every((choice) => choice.text.trim().length > 0 && Number.isFinite(choice.weight) && choice.weight > 0)).toBe(true);
        expect(Math.abs(group.reduce((sum, choice) => sum + choice.weight, 0) - 1)).toBeLessThan(1e-6);
      }
      for (const first of route.round1) {
        expect(route.round2ByFirst[first.id]).toHaveLength(3);
        expect(route.firstTailByFirst[first.id]).toBeTruthy();
        route.round2ByFirst[first.id].forEach((second) => expect(route.secondTailBySecond[second.id]).toBeTruthy());
      }
    }
  });

  it("rejects incomplete or misleading fixture data", () => {
    const broken = structuredClone(rawScenario);
    broken.routes[0].round1[0].weight = 0;
    expect(() => validateScenario(broken)).toThrow(/weight must be positive/u);
  });
});

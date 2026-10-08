import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { buildAnswer } from "../data/buildAnswer";
import { buildGenerationLoopSteps } from "../data/generationLoop";
import { validateScenario } from "../data/validateScenario";

const scenario = validateScenario(rawScenario);

describe("generation loop data contract", () => {
  it("preserves every answer character across every fixed route", () => {
    for (const route of scenario.routes) {
      for (const first of route.round1) {
        for (const second of route.round2ByFirst[first.id]) {
          const answer = buildAnswer(scenario, route.id, first.id, second.id);
          const steps = buildGenerationLoopSteps(answer.remainingText);
          expect(steps.map((step) => step.rawText).join("")).toBe(answer.remainingText);
          expect(answer.selectedPrefix + steps.map((step) => step.rawText).join("")).toBe(answer.fullAnswer);
          expect(steps.every((step, index) => step.index === index && step.endCharacter > step.startCharacter)).toBe(true);
        }
      }
    }
  });
});

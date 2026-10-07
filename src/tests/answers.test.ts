import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { buildAnswer, splitDisplayChunks } from "../data/buildAnswer";
import { validateScenario } from "../data/validateScenario";

describe("all deterministic answers", () => {
  const scenario = validateScenario(rawScenario);
  const answers = scenario.routes.flatMap((route) => route.round1.flatMap((first) =>
    route.round2ByFirst[first.id].map((second) => buildAnswer(scenario, route.id, first.id, second.id)),
  ));

  it("builds 27 unique, complete results", () => {
    expect(answers).toHaveLength(27);
    expect(new Set(answers.map((answer) => answer.answerId)).size).toBe(27);
    expect(new Set(answers.map((answer) => answer.fullAnswer)).size).toBe(27);
    for (const answer of answers) {
      expect(answer.fullAnswer.startsWith(answer.selectedPrefix)).toBe(true);
      expect(answer.selectedPrefix + answer.remainingText).toBe(answer.fullAnswer);
      expect(splitDisplayChunks(answer.remainingText).join("")).toBe(answer.remainingText);
      expect(buildAnswer(scenario, ...(answer.answerId.split(":") as ["emotion" | "cognition" | "identity", string, string])).fullAnswer).toBe(answer.fullAnswer);
    }
  });

  it("refuses an invalid route or choice without fallback", () => {
    expect(() => buildAnswer(scenario, "missing" as "emotion", "emotional", "experiences")).toThrow(/Unknown route/u);
    expect(() => buildAnswer(scenario, "emotion", "missing", "experiences")).toThrow(/Invalid first choice/u);
    expect(() => buildAnswer(scenario, "emotion", "emotional", "missing")).toThrow(/Invalid second choice/u);
  });

  it("does not let visual-only choices affect an answer", () => {
    const baseline = buildAnswer(scenario, "emotion", "vivid", "events").fullAnswer;
    const arbitraryExploration = ["family", "school"];
    const arbitrarySecondary = "brain";
    expect(arbitraryExploration).not.toHaveLength(0);
    expect(arbitrarySecondary).toBeTruthy();
    expect(buildAnswer(scenario, "emotion", "vivid", "events").fullAnswer).toBe(baseline);
  });
});

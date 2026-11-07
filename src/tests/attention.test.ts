import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { nextKeywordTurn, topOther } from "../data/attention";

const scenario = validateScenario(rawScenario);

describe("station 3 discoveries", () => {
  it("names the word each keyword cares about most, leaving itself out", () => {
    expect(topOther(scenario, "t04")).toMatchObject({ text: "人", tokenId: "t06" });
    expect(topOther(scenario, "t01")?.text).toBe("想念");
    expect(scenario.attention.notes?.t04).toContain("想念的對象");
  });

  it("points the visitor to the nearest keyword they have not found yet", () => {
    expect(nextKeywordTurn(scenario, 2, [])).toMatchObject({ text: "人", direction: -1, steps: 1 });
    expect(nextKeywordTurn(scenario, 2, ["t02"])).toMatchObject({ text: "想念", direction: 1, steps: 1 });
    expect(nextKeywordTurn(scenario, 3, ["t02", "t04"])).toMatchObject({ text: "為什麼", direction: -1, steps: 3 });
    expect(nextKeywordTurn(scenario, 0, ["t01", "t02", "t04"])).toBeNull();
  });
});

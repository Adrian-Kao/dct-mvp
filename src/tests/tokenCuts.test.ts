import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { cutOffsets, freedTokenIndexes, sentenceChars, slashMessage, snapCut } from "../data/tokenCuts";

const scenario = validateScenario(rawScenario);

describe("station 1 slicing", () => {
  it("knows the tokenizer's real cut points", () => {
    expect(sentenceChars(scenario).join("")).toBe(scenario.question);
    expect(cutOffsets(scenario)).toEqual([3, 4, 5, 7, 9, 10]);
  });

  it("snaps any blade position to the nearest real cut that is still whole", () => {
    const cuts = cutOffsets(scenario);
    expect(snapCut(6, cuts, [])).toBe(5); // 想｜念 is not a cut; 會｜想念 is (ties go left)
    expect(snapCut(6, cuts, [5])).toBe(7);
    expect(snapCut(1, cuts, [])).toBe(3);
    expect(snapCut(1, cuts, cuts)).toBeNull();
  });

  it("drops a token only when both of its edges are cut", () => {
    expect(freedTokenIndexes(scenario, [])).toEqual([]);
    expect(freedTokenIndexes(scenario, [3])).toEqual([0]);
    expect(freedTokenIndexes(scenario, [5, 7])).toEqual([3]);
    expect(freedTokenIndexes(scenario, cutOffsets(scenario))).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("explains when the tokenizer overrules the visitor", () => {
    const chars = sentenceChars(scenario);
    expect(slashMessage(chars, 6, 5)).toBe("你想切在「會想｜念一」，但 tokenizer 不切那裡；句子在「人會｜想念」裂開。");
    expect(slashMessage(chars, 7, 7)).toContain("切中了");
  });
});

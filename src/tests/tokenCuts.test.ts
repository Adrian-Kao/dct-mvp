import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { autoSlash, cutOffsets, freedTokenIndexes, resolveSlash, sentenceChars, snapCut } from "../data/tokenCuts";

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

  it("only splits when the blade lands on a real seam", () => {
    expect(resolveSlash(scenario, { kind: "seam", boundary: 7 }, [])).toMatchObject({ result: "cut", cut: 7 });
    const insideToken = resolveSlash(scenario, { kind: "seam", boundary: 6 }, []); // 想｜念
    expect(insideToken).toMatchObject({ result: "bounce", tokenIndex: 3 });
    expect(insideToken.message).toContain("「想念」是同一塊 token");
    const throughChar = resolveSlash(scenario, { kind: "char", index: 3 }, []); // through 人
    expect(throughChar).toMatchObject({ result: "bounce", tokenIndex: 1 });
    expect(throughChar.message).toContain("「人」字中間");
    expect(resolveSlash(scenario, { kind: "seam", boundary: 7 }, [7]).result).toBe("bounce");
  });

  it("lets the unaimed keyboard blade take the next seam", () => {
    expect(autoSlash(scenario, [])).toMatchObject({ result: "cut", cut: 3 });
    expect(autoSlash(scenario, [3, 4])).toMatchObject({ result: "cut", cut: 5 });
    expect(autoSlash(scenario, cutOffsets(scenario))).toBeNull();
  });
});

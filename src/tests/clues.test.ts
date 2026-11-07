import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { clueHits, cluesFor, splitByClues } from "../data/clues";

const scenario = validateScenario(rawScenario);

describe("station 2 clues carried into the answer", () => {
  it("turns each locked word's neighbours into clues that the answer uses", () => {
    const clues = cluesFor(scenario, scenario.vectorSpace.lockOrder);
    expect(clues.map((clue) => clue.token)).toEqual(["想念", "人", "為什麼", "一個"]);
    expect(clues[0].words).toContain("記憶");
    const hits = clueHits(scenario.answer.tokens.join(""), clues);
    expect(hits).toEqual(expect.arrayContaining([{ word: "記憶", from: "想念" }, { word: "他", from: "人" }, { word: "因為", from: "為什麼" }]));
  });

  it("only counts clues from words the visitor actually locked", () => {
    const hits = clueHits(scenario.answer.tokens.join(""), cluesFor(scenario, ["t04"]));
    expect(hits.map((hit) => hit.word)).toEqual(["記憶"]);
  });

  it("splits text around clue words", () => {
    expect(splitByClues("是因為他", ["因為", "他"])).toEqual([{ text: "是", clue: false }, { text: "因為", clue: true }, { text: "他", clue: true }]);
  });
});

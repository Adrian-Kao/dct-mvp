import { describe, expect, it } from "vitest";
import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";
import { draftScenario, layoutVectorSpace, neighborsOf } from "../admin/buildScenario";
import { createTokenizer } from "../admin/tokenizer";
import { clueHits, cluesFor } from "../data/clues";
import { cutOffsets } from "../data/tokenCuts";
import { validateScenario } from "../data/validateScenario";

const tokenizer = createTokenizer(new Tiktoken(o200k));

describe("back office: build a scenario from a new question", () => {
  const question = "AI 會不會取代我的工作？";
  const answer = "有些工作會被改變，但需要判斷和關心別人的工作，AI 很難完全取代。";

  it("cuts words naturally, or with the real o200k tokenizer", () => {
    expect(tokenizer.cut("為什麼人會想念一個人？", "word")).toEqual(["為什麼", "人", "會", "想念", "一個人", "？"]);
    expect(tokenizer.cut("為什麼", "o200k")).toEqual(["為", "什", "麼"]);
    expect(tokenizer.idFor("人")).toBe(1995); // a real single o200k token keeps its real number
    expect(tokenizer.cut(question, "word").join("")).toBe(question);
  });

  it("produces a valid scenario whose clue words show up in the answer", () => {
    const scenario = validateScenario(draftScenario({ question, answer, questionPieces: tokenizer.cut(question, "word"), answerPieces: tokenizer.cut(answer, "word") }, tokenizer));
    expect(scenario.inputTokens.map((token) => token.text).join("")).toBe(question);
    expect(cutOffsets(scenario).length).toBe(scenario.inputTokens.length - 1);
    expect(scenario.vectorSpace.lockOrder.length).toBeGreaterThanOrEqual(2);
    const hits = clueHits(answer, cluesFor(scenario, scenario.vectorSpace.lockOrder));
    expect(hits.length).toBeGreaterThanOrEqual(3);
    Object.values(scenario.attention.weights).forEach((row) => expect(row.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 9));
  });

  it("puts the clue words the operator typed right next to their word", () => {
    const scenario = validateScenario(draftScenario({ question, answer, questionPieces: tokenizer.cut(question, "word"), answerPieces: tokenizer.cut(answer, "word") }, tokenizer));
    const [first] = scenario.vectorSpace.lockOrder;
    const vectorSpace = layoutVectorSpace(scenario.inputTokens, scenario.vectorSpace.lockOrder, { ...neighborsOf(scenario), [first]: ["機器人", "未來", "薪水"] }, scenario.seed);
    expect(neighborsOf({ ...scenario, vectorSpace })[first]).toEqual(["機器人", "未來", "薪水"]);
  });
});

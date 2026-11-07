import type { ScenarioFixture } from "./scenarioTypes";

/**
 * Station 1 "切西瓜": the visitor slashes wherever they like, but the sentence only splits at
 * the cut points the tokenizer decided. Offsets count characters from the start of the question.
 */
export function sentenceChars(scenario: ScenarioFixture): string[] {
  return scenario.inputTokens.flatMap((token) => Array.from(token.text));
}

/** Character offsets of the real cuts, e.g. 為什麼｜人｜會… → [3, 4, 5, 7, 9, 10]. */
export function cutOffsets(scenario: ScenarioFixture): number[] {
  const offsets: number[] = [];
  let position = 0;
  scenario.inputTokens.slice(0, -1).forEach((token) => {
    position += Array.from(token.text).length;
    offsets.push(position);
  });
  return offsets;
}

/** The real cut nearest to where the blade went, among the ones not cut yet. Ties go to the left one. */
export function snapCut(desired: number, cuts: number[], done: number[]): number | null {
  let best: number | null = null;
  for (const cut of cuts) {
    if (done.includes(cut)) continue;
    if (best === null || Math.abs(cut - desired) < Math.abs(best - desired)) best = cut;
  }
  return best;
}

/** A token falls off once both of its edges are cut (the sentence ends count as cut). */
export function freedTokenIndexes(scenario: ScenarioFixture, done: number[]): number[] {
  const cuts = cutOffsets(scenario);
  const total = sentenceChars(scenario).length;
  const freed: number[] = [];
  scenario.inputTokens.forEach((_, index) => {
    const start = index === 0 ? 0 : cuts[index - 1];
    const end = index === cuts.length ? total : cuts[index];
    const leftCut = start === 0 || done.includes(start);
    const rightCut = end === total || done.includes(end);
    if (leftCut && rightCut) freed.push(index);
  });
  return freed;
}

/** What to tell the visitor after a slash: did the blade land on a real cut, or did the tokenizer overrule them? */
export function slashMessage(chars: string[], desired: number, actual: number): string {
  const around = (offset: number) => `「${chars.slice(Math.max(0, offset - 2), offset).join("")}｜${chars.slice(offset, offset + 2).join("")}」`;
  if (desired === actual) return `切中了！${around(actual)}正是 tokenizer 的切點。`;
  if (desired <= 0 || desired >= chars.length) return `刀落在句子邊緣，句子還是從 tokenizer 的切點${around(actual)}裂開。`;
  return `你想切在${around(desired)}，但 tokenizer 不切那裡；句子在${around(actual)}裂開。`;
}

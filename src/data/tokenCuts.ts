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

/** Where the blade crossed the sentence: on the seam between two characters, or through a character. */
export type SlashHit = { kind: "seam"; boundary: number } | { kind: "char"; index: number } | { kind: "outside" };

export type SlashOutcome =
  | { result: "cut"; cut: number; message: string }
  | { result: "bounce"; message: string; tokenIndex: number | null };

const pair = (chars: string[], offset: number) => `「${chars.slice(Math.max(0, offset - 2), offset).join("")}｜${chars.slice(offset, offset + 2).join("")}」`;

function tokenIndexAt(scenario: ScenarioFixture, charIndex: number): number {
  let position = 0;
  return scenario.inputTokens.findIndex((token) => {
    position += Array.from(token.text).length;
    return charIndex < position;
  });
}

/**
 * Only a blade that lands on a real tokenizer seam splits the sentence. A blade through the middle
 * of a character, or on the seam inside one token (想｜念), bounces off and the visitor is told why.
 */
export function resolveSlash(scenario: ScenarioFixture, hit: SlashHit, done: number[]): SlashOutcome {
  const chars = sentenceChars(scenario);
  const cuts = cutOffsets(scenario);
  const next = snapCut(hit.kind === "seam" ? hit.boundary : hit.kind === "char" ? hit.index + 0.5 : 0, cuts, done);
  const tip = next === null ? "" : `試試${pair(chars, next)}這條縫。`;
  if (hit.kind === "outside") return { result: "bounce", tokenIndex: null, message: `刀沒有劃過句子。${tip}` };
  if (hit.kind === "char") {
    const tokenIndex = tokenIndexAt(scenario, hit.index);
    return { result: "bounce", tokenIndex, message: `彈開了！刀落在「${chars[hit.index]}」字中間，一個字本身切不開。${tip}` };
  }
  if (cuts.includes(hit.boundary)) {
    if (done.includes(hit.boundary)) return { result: "bounce", tokenIndex: null, message: `${pair(chars, hit.boundary)}已經切開了。${tip}` };
    return { result: "cut", cut: hit.boundary, message: `切中了！${pair(chars, hit.boundary)}正是 tokenizer 的切點。` };
  }
  const tokenIndex = tokenIndexAt(scenario, hit.boundary);
  const token = scenario.inputTokens[tokenIndex]?.text ?? "";
  return { result: "bounce", tokenIndex, message: `彈開了！「${token}」是同一塊 token，tokenizer 不會從中間切開。${tip}` };
}

/** The keyboard / gyro blade can't aim, so a swing always lands on the next real seam, left to right. */
export function autoSlash(scenario: ScenarioFixture, done: number[]): SlashOutcome | null {
  const cut = cutOffsets(scenario).find((offset) => !done.includes(offset));
  return cut === undefined ? null : resolveSlash(scenario, { kind: "seam", boundary: cut }, done);
}

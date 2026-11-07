import type { AttentionLink, ScenarioFixture } from "./scenarioTypes";

/** Attention row for the token the dial pointer currently rests on. */
export function attentionRow(scenario: ScenarioFixture, queryTokenId: string): number[] {
  return scenario.attention.weights[queryTokenId] ?? [];
}

/**
 * The strongest links between different tokens, looking only at rows the
 * visitor actually turned the dial to. Each token pair is counted once.
 */
export function strongestLinks(scenario: ScenarioFixture, visitedTokenIds: string[], count = 3): AttentionLink[] {
  const best = new Map<string, AttentionLink>();
  for (const fromId of visitedTokenIds) {
    attentionRow(scenario, fromId).forEach((weight, index) => {
      const toId = scenario.inputTokens[index]?.id;
      if (!toId || toId === fromId) return;
      const key = [fromId, toId].sort().join("|");
      const current = best.get(key);
      if (!current || weight > current.weight) best.set(key, { fromId, toId, weight });
    });
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight).slice(0, count);
}

/** A keyword counts as visited when any token with the same text was visited (the two 人 are one word). */
export function keywordsComplete(scenario: ScenarioFixture, visitedTokenIds: string[]): boolean {
  const textOf = (id: string) => scenario.inputTokens.find((token) => token.id === id)?.text;
  const visitedTexts = new Set(visitedTokenIds.map(textOf));
  return scenario.attention.keywordTokenIds.every((id) => visitedTexts.has(textOf(id)));
}

export function fullAnswer(scenario: ScenarioFixture): string {
  return scenario.answer.tokens.join("");
}

/** The other token a query token cares about most (its own weight is left out). */
export function topOther(scenario: ScenarioFixture, queryTokenId: string): { tokenId: string; text: string; weight: number } | null {
  const row = attentionRow(scenario, queryTokenId);
  let best = -1;
  row.forEach((weight, index) => {
    if (scenario.inputTokens[index]?.id === queryTokenId) return;
    if (best < 0 || weight > row[best]) best = index;
  });
  const token = scenario.inputTokens[best];
  return token ? { tokenId: token.id, text: token.text, weight: row[best] } : null;
}

/** Keyword tokens not yet discovered, nearest (in dial detents) first, with the turn needed to reach it. */
export function nextKeywordTurn(scenario: ScenarioFixture, focusIndex: number, visitedTokenIds: string[]): { tokenId: string; text: string; direction: -1 | 1; steps: number } | null {
  const count = scenario.inputTokens.length;
  const visitedTexts = new Set(visitedTokenIds.map((id) => scenario.inputTokens.find((token) => token.id === id)?.text));
  const keywordTexts = new Set(scenario.attention.keywordTokenIds.map((id) => scenario.inputTokens.find((token) => token.id === id)?.text));
  let best: { tokenId: string; text: string; direction: -1 | 1; steps: number } | null = null;
  scenario.inputTokens.forEach((token, index) => {
    if (!keywordTexts.has(token.text) || visitedTexts.has(token.text)) return;
    const right = (index - focusIndex + count) % count;
    const left = (focusIndex - index + count) % count;
    const option = right <= left ? { direction: 1 as const, steps: right } : { direction: -1 as const, steps: left };
    if (!best || option.steps < best.steps) best = { tokenId: token.id, text: token.text, ...option };
  });
  return best;
}

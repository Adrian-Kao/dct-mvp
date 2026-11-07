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

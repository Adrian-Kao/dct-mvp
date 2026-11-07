import type { InputToken, ScenarioFixture } from "./scenarioTypes";

export function fullAnswer(scenario: ScenarioFixture): string {
  return scenario.answer.tokens.join("");
}

export interface AttentionLink {
  tokenId: string;
  text: string;
  index: number;
  /** Share of the focus token's attention, with its look at itself left out (all links add up to 1). */
  weight: number;
}

/** Station 3: how strongly the focus token looks at every other token of the question. */
export function linksFrom(scenario: ScenarioFixture, focusId: string): AttentionLink[] {
  const row = scenario.attention.weights[focusId] ?? [];
  const others = scenario.inputTokens.map((token, index) => ({ tokenId: token.id, text: token.text.trim(), index, raw: row[index] ?? 0 })).filter((link) => link.tokenId !== focusId);
  const total = others.reduce((sum, link) => sum + link.raw, 0) || 1;
  return others.map(({ raw, ...link }) => ({ ...link, weight: raw / total }));
}

/** The token the focus token cares about most. */
export function strongestLink(scenario: ScenarioFixture, focusId: string): AttentionLink {
  return linksFrom(scenario, focusId).reduce((best, link) => (link.weight > best.weight ? link : best));
}

export function tokenText(scenario: ScenarioFixture, id: string): string {
  return scenario.inputTokens.find((token) => token.id === id)?.text.trim() ?? id;
}

const PUNCTUATION = /^[\s\p{P}\p{S}]+$/u;

function normalize(values: number[]): number[] {
  const safe = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0.01));
  const total = safe.reduce((sum, value) => sum + value, 0);
  const row = safe.map((value) => value / total);
  const drift = 1 - row.reduce((sum, value) => sum + value, 0);
  row[row.indexOf(Math.max(...row))] += drift;
  return row;
}

/**
 * A first guess at attention for a new question: content words look hardest at the other key words,
 * a little at their neighbours, and barely at punctuation. The back office lets you fix every number.
 */
export function defaultAttention(tokens: InputToken[], keywordTokenIds: string[]): ScenarioFixture["attention"] {
  const keywordTexts = new Set(keywordTokenIds.map((id) => tokens.find((token) => token.id === id)?.text));
  const weights: Record<string, number[]> = {};
  tokens.forEach((query, i) => {
    const scores = tokens.map((key, j) => {
      if (PUNCTUATION.test(key.text)) return 0.25;
      return 0.6 + (keywordTexts.has(key.text) && key.text !== query.text ? 1.6 : 0) + (Math.abs(i - j) === 1 ? 0.5 : 0) + (i === j ? 0.7 : 0) + Math.min(0.6, key.text.trim().length * 0.15);
    });
    weights[query.id] = normalize(scores);
  });
  return { keywordTokenIds, weights, notes: {} };
}

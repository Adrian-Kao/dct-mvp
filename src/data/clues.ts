import type { ScenarioFixture } from "./scenarioTypes";
import { nearestWords, tokenText } from "./vectorSpace";

/** Station 2's "線索袋": the nearest words of every locked question token. */
export interface Clue {
  tokenId: string;
  token: string;
  words: string[];
}

export function cluesFor(scenario: ScenarioFixture, lockedTokenIds: string[]): Clue[] {
  return lockedTokenIds.map((tokenId) => ({
    tokenId,
    token: tokenText(scenario, tokenId),
    words: nearestWords(scenario, tokenId).map((word) => word.text),
  }));
}

/** Clue words that show up in a piece of answer text, with the question word they came from. */
export function clueHits(text: string, clues: Clue[]): Array<{ word: string; from: string }> {
  const hits: Array<{ word: string; from: string }> = [];
  for (const clue of clues) {
    for (const word of clue.words) {
      if (text.includes(word) && !hits.some((hit) => hit.word === word)) hits.push({ word, from: clue.token });
    }
  }
  return hits;
}

/** Split text so the clue words can be highlighted. Longer words win when they overlap. */
export function splitByClues(text: string, words: string[]): Array<{ text: string; clue: boolean }> {
  const sorted = [...new Set(words)].filter(Boolean).sort((a, b) => b.length - a.length);
  const parts: Array<{ text: string; clue: boolean }> = [];
  let index = 0;
  let plain = "";
  while (index < text.length) {
    const word = sorted.find((candidate) => text.startsWith(candidate, index));
    if (word) {
      if (plain) parts.push({ text: plain, clue: false });
      plain = "";
      parts.push({ text: word, clue: true });
      index += word.length;
    } else {
      plain += text[index];
      index += 1;
    }
  }
  if (plain) parts.push({ text: plain, clue: false });
  return parts;
}

/**
 * Back-office tokenizer. Two ways to cut a sentence:
 * - "word" (default): Intl.Segmenter word boundaries, which read naturally on the exhibition screens.
 * - "o200k": the real GPT-4o tokenizer (o200k_base), which often cuts Chinese one character at a time.
 * Token numbers always come from o200k: a word that is a single o200k token shows its real number;
 * a word made of several o200k tokens gets a stable illustrative number (the real pieces are kept for display).
 */
import type { Tiktoken } from "js-tiktoken/lite";

export type CutMode = "word" | "o200k";

export interface Tokenizer {
  cut(text: string, mode: CutMode): string[];
  idFor(text: string): number;
  pieces(text: string): number[];
}

let loading: Promise<Tokenizer> | null = null;

function stableNumber(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);
  return 100000 + ((hash >>> 0) % 90000);
}

/** Attach whitespace-only pieces to the piece before them ("AI" + " " → "AI "), so no token is just a space. */
function tidy(pieces: string[]): string[] {
  const out: string[] = [];
  for (const piece of pieces) {
    if (!piece.trim() && out.length) out[out.length - 1] += piece;
    else if (!piece.trim()) out.push(piece);
    else if (out.length && !out[out.length - 1].trim()) out[out.length - 1] += piece;
    else out.push(piece);
  }
  return out;
}

export function createTokenizer(encoder: Tiktoken): Tokenizer {
  const segmenter = new Intl.Segmenter("zh-Hant", { granularity: "word" });
  const o200kCut = (text: string) => {
    // Group ids so every piece decodes to whole characters (a CJK character can span two ids).
    const out: string[] = [];
    let group: number[] = [];
    for (const id of encoder.encode(text)) {
      group.push(id);
      const decoded = encoder.decode(group);
      if (!decoded.includes("�")) { out.push(decoded); group = []; }
    }
    if (group.length) out.push(encoder.decode(group));
    return out;
  };
  return {
    cut(text, mode) {
      const pieces = mode === "o200k" ? o200kCut(text) : [...segmenter.segment(text)].map((part) => part.segment);
      return tidy(pieces);
    },
    pieces: (text) => encoder.encode(text),
    idFor(text) {
      const ids = encoder.encode(text);
      return ids.length === 1 ? ids[0] : stableNumber(text);
    },
  };
}

export function loadTokenizer(): Promise<Tokenizer> {
  loading ??= Promise.all([import("js-tiktoken/lite"), import("js-tiktoken/ranks/o200k_base")]).then(
    ([{ Tiktoken }, ranks]) => createTokenizer(new Tiktoken(ranks.default)),
  );
  return loading;
}

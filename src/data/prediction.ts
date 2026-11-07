import type { PredictionCandidate, ScenarioFixture } from "./scenarioTypes";

/** Station 3's spinning wheel: each slice is a candidate next word, its size is the probability. */
export function roundOf(scenario: ScenarioFixture, round: number) {
  return scenario.prediction.rounds[round] ?? null;
}

/** Draw a candidate with probability proportional to its slice (r in 0..1). */
export function drawWeighted(candidates: PredictionCandidate[], r: number): number {
  let cumulative = 0;
  for (let index = 0; index < candidates.length; index += 1) {
    cumulative += candidates[index].probability;
    if (r < cumulative) return index;
  }
  return candidates.length - 1;
}

/** The "always take the most likely word" choice (greedy decoding). */
export function mostLikely(candidates: PredictionCandidate[]): number {
  return candidates.reduce((best, candidate, index) => (candidate.probability > candidates[best].probability ? index : best), 0);
}

/** Slices in degrees, clockwise from 12 o'clock. */
export function wheelSlices(candidates: PredictionCandidate[]) {
  let start = 0;
  return candidates.map((candidate) => {
    const sweep = candidate.probability * 360;
    const slice = { candidate, start, end: start + sweep, middle: start + sweep / 2 };
    start += sweep;
    return slice;
  });
}

/**
 * The wheel rotation (degrees) that brings the middle of slice `index` under the fixed pointer at 12 o'clock,
 * after spinning at least `turns` full turns forward from `current`.
 */
export function landingRotation(current: number, middle: number, turns: number, jitter = 0): number {
  const target = (360 - middle + jitter + 360) % 360;
  let rotation = current - (current % 360) + target;
  while (rotation < current + turns * 360) rotation += 360;
  return rotation;
}

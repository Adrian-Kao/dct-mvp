import { describe, expect, it } from "vitest";
import { drawWeighted, landingRotation, mostLikely, wheelSlices } from "../data/prediction";

const candidates = [{ text: "想念", probability: 0.58 }, { text: "因為", probability: 0.2 }, { text: "人", probability: 0.14 }, { text: "時間", probability: 0.08 }];

describe("station 3 wheel maths", () => {
  it("draws in proportion to slice size", () => {
    expect(drawWeighted(candidates, 0)).toBe(0);
    expect(drawWeighted(candidates, 0.579)).toBe(0);
    expect(drawWeighted(candidates, 0.6)).toBe(1);
    expect(drawWeighted(candidates, 0.95)).toBe(3);
    expect(mostLikely(candidates)).toBe(0);
  });

  it("lands the chosen slice under the pointer after several forward turns", () => {
    const slices = wheelSlices(candidates);
    expect(slices[0].start).toBe(0);
    expect(slices[0].end).toBeCloseTo(208.8, 6);
    for (const current of [0, 1234, 9999]) {
      const rotation = landingRotation(current, slices[1].middle, 4);
      expect(rotation - current).toBeGreaterThan(4 * 360 - 1);
      expect(((rotation + slices[1].middle) % 360 + 360) % 360).toBeCloseTo(0, 6);
    }
  });
});

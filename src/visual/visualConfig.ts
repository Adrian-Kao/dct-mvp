export const qualityConfig = {
  low: { particles: 600, pixelRatio: 1, nearTrails: false },
  medium: { particles: 1600, pixelRatio: 1.5, nearTrails: true },
  high: { particles: 2400, pixelRatio: 1.75, nearTrails: true },
} as const;

export const candidateAnchors = [
  { x: 0.22, y: 0.62 },
  { x: 0.5, y: 0.55 },
  { x: 0.78, y: 0.62 },
] as const;

export const motionDurations = {
  transfer: {
    selectedHold: 0.22,
    discard: 0.48,
    compact: 0.3,
    converge: 0.68,
    coreHold: 0.22,
    exit: 0.62,
    blackHold: 0.11,
    enter: 0.62,
    centerHold: 0.14,
    expand: 0.82,
    chrome: 0.16,
    restartFade: 0.24,
  },
  predictionRound1: { arrival: 0.5, influx: 1.6, compression: 0.55, distribution: 2.05 },
  predictionRound2: { arrival: 0.32, influx: 1.02, compression: 0.38, distribution: 1.32 },
} as const;

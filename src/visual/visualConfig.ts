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
    enter: 0.62,
    expand: 0.36,
    restartFade: 0.24,
  },
  predictionRound1: { arrival: 0.5, influx: 1.8, compression: 0.9, distribution: 1.2 },
  predictionRound2: { arrival: 0.2, influx: 0.55, compression: 0.35, distribution: 0.4 },
} as const;

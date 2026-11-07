export const qualityConfig = {
  low: { particles: 600, pixelRatio: 1, nearTrails: false },
  medium: { particles: 1600, pixelRatio: 1.5, nearTrails: true },
  high: { particles: 2400, pixelRatio: 1.75, nearTrails: true },
} as const;

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
  /** Station 4: seconds a bubble takes to rise from the tank floor to the answer line. */
  bubbleRise: 1.35,
  bubbleRiseReduced: 0.3,
} as const;

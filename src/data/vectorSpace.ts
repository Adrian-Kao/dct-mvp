import type { ScenarioFixture, Vec3 } from "./scenarioTypes";

export interface ProjectedPoint {
  /** Screen position in the range roughly -1..1, centre is 0. */
  x: number;
  y: number;
  /** Larger is closer to the viewer. */
  depth: number;
  scale: number;
}

const CAMERA_DISTANCE = 7;

/** Rotate a point around the vertical axis (the big turntable) and project it with perspective. */
export function project(position: Vec3, angle: number): ProjectedPoint {
  const [x, y, z] = position;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rx = x * cos + z * sin;
  const rz = -x * sin + z * cos;
  const scale = CAMERA_DISTANCE / (CAMERA_DISTANCE - rz);
  return { x: (rx * scale) / 4, y: (-y * scale) / 3, depth: rz, scale };
}

/**
 * The aiming band in the middle of the screen: whatever the visitor sees inside it can be locked.
 * (An earlier version also required the token to face the viewer, which looked aligned but refused to lock.)
 */
export function isAligned(position: Vec3, angle: number): boolean {
  return Math.abs(project(position, angle).x) < 0.14;
}

export interface Neighbor {
  text: string;
  position: Vec3;
  distance: number;
}

export function nearestWords(scenario: ScenarioFixture, tokenId: string, count = scenario.vectorSpace.neighborCount): Neighbor[] {
  const origin = scenario.vectorSpace.tokenPositions[tokenId];
  if (!origin) return [];
  return scenario.vectorSpace.words
    .map((word) => ({ ...word, distance: Math.hypot(word.position[0] - origin[0], word.position[1] - origin[1], word.position[2] - origin[2]) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/** The next token station 2 asks for, or null when the visitor has locked the maximum. */
export function nextLockTarget(scenario: ScenarioFixture, lockedTokenIds: string[]): string | null {
  if (lockedTokenIds.length >= scenario.vectorSpace.maxLocks) return null;
  return scenario.vectorSpace.lockOrder.find((id) => !lockedTokenIds.includes(id)) ?? null;
}

export function tokenText(scenario: ScenarioFixture, tokenId: string): string {
  return scenario.inputTokens.find((token) => token.id === tokenId)?.text.trim() ?? tokenId;
}

/**
 * Which way to turn, and how many detents, to bring a token into the aiming band.
 * Used for the on-screen arrow so the visitor never has to guess the direction.
 */
export function turnHint(position: Vec3, angle: number, step: number): { direction: -1 | 1; steps: number } | null {
  if (isAligned(position, angle)) return null;
  for (let steps = 1; steps <= Math.ceil((Math.PI * 2) / step); steps += 1) {
    if (isAligned(position, angle - steps * step)) return { direction: -1, steps };
    if (isAligned(position, angle + steps * step)) return { direction: 1, steps };
  }
  return null;
}

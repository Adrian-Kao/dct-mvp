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

/** The aiming band in the middle of the screen. A token must sit inside it, facing the viewer, to be locked. */
export function isAligned(position: Vec3, angle: number): boolean {
  const point = project(position, angle);
  return Math.abs(point.x) < 0.14 && point.depth > 0;
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

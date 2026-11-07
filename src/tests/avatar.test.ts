import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { createInitialState, experienceReducer } from "../app/experienceReducer";
import { buildDefaultAvatar, modelNumberFrom, normalizeLandmarks, pickMainFace } from "../data/avatar";

const scenario = validateScenario(rawScenario);

describe("station 0 virtual image", () => {
  it("builds a deterministic default face inside the unit box", () => {
    const a = buildDefaultAvatar(42);
    const b = buildDefaultAvatar(42);
    expect(a).toEqual(b);
    expect(a.source).toBe("default");
    expect(a.points.length).toBeGreaterThan(150);
    expect(a.edges.length).toBeGreaterThan(a.points.length);
    expect(a.points.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
    expect(modelNumberFrom(42)).toBe("#0042");
  });

  it("mirrors camera landmarks and keeps only valid mesh edges", () => {
    const landmarks = [{ x: 0.4, y: 0.3 }, { x: 0.6, y: 0.3 }, { x: 0.5, y: 0.6 }];
    const avatar = normalizeLandmarks(landmarks, [{ start: 0, end: 1 }, { start: 1, end: 0 }, { start: 1, end: 2 }, { start: 2, end: 9 }], 7);
    expect(avatar.source).toBe("camera");
    expect(avatar.edges).toEqual([[0, 1], [1, 2]]);
    expect(avatar.points[0][0]).toBeGreaterThan(avatar.points[1][0]); // mirrored like a mirror
  });

  it("picks the biggest face when friends stand in frame", () => {
    const small = [{ x: 0.1, y: 0.1 }, { x: 0.15, y: 0.16 }];
    const big = [{ x: 0.35, y: 0.25 }, { x: 0.65, y: 0.7 }];
    expect(pickMainFace([small, big])).toBe(1);
    expect(pickMainFace([])).toBe(-1);
  });

  it("only accepts the avatar on the ready entrance, and forgets it on restart", () => {
    const avatar = buildDefaultAvatar(1);
    let state = createInitialState(scenario.id);
    expect(experienceReducer(state, { type: "AVATAR_SET", avatar }).avatar).toBeNull(); // still entering
    state = experienceReducer(state, { type: "TRANSITION_READY", transitionId: state.transitionId!, meta: { runId: state.runId, sceneInstanceId: state.sceneInstanceId } });
    state = experienceReducer(state, { type: "AVATAR_SET", avatar });
    expect(state.avatar?.modelNumber).toBe("#0001");
    state = experienceReducer(state, { type: "RESET_EXPERIENCE" });
    expect(state.avatar).toBeNull();
  });
});

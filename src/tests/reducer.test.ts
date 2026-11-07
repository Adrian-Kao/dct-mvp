import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { createInitialState, experienceReducer, type ExperienceState } from "../app/experienceReducer";
import { selectAnswer, selectStrongestLinks, selectVisibleAnswer } from "../app/selectors";

const scenario = validateScenario(rawScenario);

function finishEntry(state: ExperienceState): ExperienceState {
  if (state.transitionId === null) return state;
  return experienceReducer(state, { type: "TRANSITION_READY", transitionId: state.transitionId, meta: { runId: state.runId, sceneInstanceId: state.sceneInstanceId } });
}

function sceneState(scene: "attention" | "generation"): ExperienceState {
  return finishEntry(experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene, scenario }));
}

function metaOf(state: ExperienceState) {
  return { runId: state.runId, sceneInstanceId: state.sceneInstanceId };
}

describe("station 3 attention dial", () => {
  it("moves one detent per rotation, wraps around, and records visited tokens", () => {
    let state = sceneState("attention");
    expect(state.attention.focusIndex).toBe(0);
    state = experienceReducer(state, { type: "ATTENTION_ROTATE", delta: -1, scenario });
    expect(state.attention.focusIndex).toBe(scenario.inputTokens.length - 1);
    state = experienceReducer(state, { type: "ATTENTION_ROTATE", delta: 1, scenario });
    state = experienceReducer(state, { type: "ATTENTION_ROTATE", delta: 1, scenario });
    expect(state.attention.focusIndex).toBe(1);
    expect(state.attention.visitedTokenIds).toEqual(["t06", "t01", "t02"]);
    expect(state.attention.complete).toBe(false);
  });

  it("completes only after every keyword has been visited, then keeps the three strongest links", () => {
    let state = sceneState("attention");
    state = experienceReducer(state, { type: "ATTENTION_FOCUS", tokenId: "t03", scenario });
    state = experienceReducer(state, { type: "ATTENTION_FOCUS", tokenId: "t04", scenario });
    expect(state.attention.complete).toBe(false);
    state = experienceReducer(state, { type: "ATTENTION_FOCUS", tokenId: "t05", scenario });
    expect(state.attention.complete).toBe(true);
    const links = selectStrongestLinks(state, scenario);
    expect(links).toHaveLength(3);
    expect(links.map((link) => [link.fromId, link.toId].sort().join("|"))).toEqual(["t04|t05", "t03|t04", "t03|t05"]);
  });

  it("ignores the dial while the scene is not ready", () => {
    const entering = experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "attention", scenario });
    expect(experienceReducer(entering, { type: "ATTENTION_ROTATE", delta: 1, scenario })).toBe(entering);
  });
});

describe("station 4 pump generation", () => {
  it("releases one bubble per pump and appends tokens only when bubbles pop", () => {
    let state = sceneState("generation");
    const meta = metaOf(state);
    state = experienceReducer(state, { type: "GENERATION_PUMP", scenario, meta });
    state = experienceReducer(state, { type: "GENERATION_PUMP", scenario, meta });
    expect(state.generation).toMatchObject({ pumpCount: 2, releasedCount: 2, appendedCount: 0 });
    expect(selectVisibleAnswer(state, scenario)).toBe("");
    state = experienceReducer(state, { type: "GENERATION_BUBBLE_POP", index: 0, scenario, meta });
    expect(selectVisibleAnswer(state, scenario)).toBe(scenario.answer.tokens[0]);
    const unreleased = experienceReducer(state, { type: "GENERATION_BUBBLE_POP", index: 5, scenario, meta });
    expect(unreleased).toBe(state);
  });

  it("stops when pumping stops and finishes the exact answer after the last token", () => {
    let state = sceneState("generation");
    const meta = metaOf(state);
    const total = scenario.answer.tokens.length;
    for (let index = 0; index < total + 3; index += 1) state = experienceReducer(state, { type: "GENERATION_PUMP", scenario, meta });
    expect(state.generation.releasedCount).toBe(total);
    expect(selectAnswer(state, scenario)).toBeNull();
    for (let index = 0; index < total; index += 1) state = experienceReducer(state, { type: "GENERATION_BUBBLE_POP", index, scenario, meta });
    expect(state.generation.complete).toBe(true);
    expect(selectAnswer(state, scenario)?.fullAnswer).toBe(scenario.answer.tokens.join(""));
  });

  it("ignores stale pump callbacks from an earlier run or scene", () => {
    const state = sceneState("generation");
    const stale = experienceReducer(state, { type: "GENERATION_PUMP", scenario, meta: { runId: state.runId - 1, sceneInstanceId: state.sceneInstanceId } });
    expect(stale).toBe(state);
    const reset = experienceReducer(state, { type: "RESET_EXPERIENCE" });
    expect(reset.runId).toBe(state.runId + 1);
    expect(reset.scene).toBe("input");
    expect(reset.generation.releasedCount).toBe(0);
    expect(reset.attention.visitedTokenIds).toEqual([]);
  });
});

describe("presenter and restart", () => {
  it("injects a complete safe path for downstream presenter jumps", () => {
    const state = experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "summary", scenario });
    expect(state.attention.complete).toBe(true);
    expect(state.attention.source).toBe("presenter");
    expect(state.generation.complete).toBe(true);
    expect(selectAnswer(state, scenario)?.answerId).toBe(scenario.answer.id);
  });

  it("uses the short restart transition for Summary while emergency reset invalidates it immediately", () => {
    let state = finishEntry(experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "summary", scenario }));
    state = experienceReducer(state, { type: "REQUEST_SUMMARY_RESTART" });
    expect(state).toMatchObject({ scene: "summary", scenePhase: "exiting", transitionMode: "restart", transitionVisualPhase: "locking" });
    const transitionId = state.transitionId!;
    const reset = experienceReducer(state, { type: "RESET_EXPERIENCE" });
    expect(reset).toMatchObject({ scene: "input", scenePhase: "entering", transitionMode: "entry", transitionVisualPhase: "blackHold" });
    const stale = experienceReducer(reset, { type: "TRANSITION_VISUAL_PHASE", phase: "coreReady", transitionId, meta: { runId: state.runId, sceneInstanceId: state.sceneInstanceId } });
    expect(stale).toBe(reset);
  });
});

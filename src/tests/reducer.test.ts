import { describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { createInitialState, experienceReducer, type ExperienceState } from "../app/experienceReducer";

const scenario = validateScenario(rawScenario);

function predictionState(): ExperienceState {
  return experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "prediction", routeId: "emotion", scenario });
}

describe("experience reducer guards", () => {
  it("requires a primary attention focus and clears downstream on change", () => {
    let state: ExperienceState = { ...createInitialState(scenario.id), scene: "attention" };
    expect(experienceReducer(state, { type: "ATTENTION_CONFIRM", scenario })).toBe(state);
    state = experienceReducer(state, { type: "ATTENTION_SET_PRIMARY", primaryId: "emotion", scenario });
    state = experienceReducer(state, { type: "ATTENTION_SET_SECONDARY", secondaryId: "family", scenario });
    state = experienceReducer(state, { type: "ATTENTION_CONFIRM", scenario });
    expect(state.attention.confirmed).toBe(true);
    state = experienceReducer(state, { type: "ATTENTION_SET_PRIMARY", primaryId: "family", scenario });
    expect(state.attention.confirmed).toBe(false);
    expect(state.attention.secondaryId).toBeNull();
    expect(state.prediction.choices).toEqual([]);
  });

  it("rejects candidates before ready and appends only at the guarded round handoff", () => {
    let state = predictionState();
    state = { ...state, prediction: { ...state.prediction, phase: "influx" } };
    const blocked = experienceReducer(state, { type: "PREDICTION_SELECT", candidateId: "emotional", text: " emotional", scenario });
    expect(blocked).toBe(state);
    state = { ...state, prediction: { ...state.prediction, phase: "awaitingChoice" } };
    state = experienceReducer(state, { type: "PREDICTION_SELECT", candidateId: "emotional", text: " emotional", scenario });
    const doubleClick = experienceReducer(state, { type: "PREDICTION_SELECT", candidateId: "vivid", text: " vivid", scenario });
    expect(doubleClick.prediction.pendingCandidateId).toBe("emotional");
    state = experienceReducer(state, { type: "REQUEST_PREDICTION_TRANSFER" });
    expect(state.prediction.choices).toEqual([]);
    expect(state.scenePhase).toBe("exiting");
    const meta = { runId: state.runId, sceneInstanceId: state.sceneInstanceId };
    const transitionId = state.transitionId!;
    state = experienceReducer(state, { type: "PREDICTION_TRANSFER_SWAP", transitionId, meta, scenario });
    expect(state.prediction.round).toBe(2);
    expect(state.prediction.choices).toHaveLength(1);
    expect(state.scene).toBe("prediction");
    const repeated = experienceReducer(state, { type: "PREDICTION_TRANSFER_SWAP", transitionId, meta, scenario });
    expect(repeated.prediction.choices).toHaveLength(1);
  });

  it("keeps stage progress on the first prediction transfer and reaches generation only after round two", () => {
    let state = predictionState();
    state = { ...state, prediction: { ...state.prediction, phase: "awaitingChoice" } };
    state = experienceReducer(state, { type: "PREDICTION_SELECT", candidateId: "emotional", text: " emotional", scenario });
    state = experienceReducer(state, { type: "REQUEST_PREDICTION_TRANSFER" });
    const firstTransitionId = state.transitionId!;
    const firstMeta = { runId: state.runId, sceneInstanceId: state.sceneInstanceId };
    state = experienceReducer(state, { type: "PREDICTION_TRANSFER_SWAP", transitionId: firstTransitionId, meta: firstMeta, scenario });
    expect(state.scene).toBe("prediction");
    expect(state.prediction.round).toBe(2);
    const secondInstanceMeta = { runId: state.runId, sceneInstanceId: state.sceneInstanceId };
    state = experienceReducer(state, { type: "TRANSITION_READY", transitionId: firstTransitionId, meta: secondInstanceMeta });
    state = experienceReducer(state, { type: "PREDICTION_SET_PHASE", phase: "awaitingChoice", meta: secondInstanceMeta });
    state = experienceReducer(state, { type: "PREDICTION_SELECT", candidateId: "experiences", text: " experiences", scenario });
    state = experienceReducer(state, { type: "REQUEST_PREDICTION_TRANSFER" });
    const secondTransitionId = state.transitionId!;
    const secondMeta = { runId: state.runId, sceneInstanceId: state.sceneInstanceId };
    state = experienceReducer(state, { type: "PREDICTION_TRANSFER_SWAP", transitionId: secondTransitionId, meta: secondMeta, scenario });
    expect(state.scene).toBe("generation");
    expect(state.prediction.choices.map((choice) => choice.candidateId)).toEqual(["emotional", "experiences"]);
  });

  it("ignores stale run and scene callbacks", () => {
    const state = predictionState();
    const changed = experienceReducer(state, { type: "PREDICTION_SET_PHASE", phase: "awaitingChoice", meta: { runId: state.runId - 1, sceneInstanceId: state.sceneInstanceId } });
    expect(changed).toBe(state);
    const reset = experienceReducer(state, { type: "RESET_EXPERIENCE" });
    expect(reset.runId).toBe(state.runId + 1);
    expect(reset.scene).toBe("input");
    expect(reset.prediction.choices).toEqual([]);
    expect(reset.exploredConceptIds).toEqual([]);
  });

  it("injects complete safe fixtures for downstream presenter jumps", () => {
    const state = experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "summary", routeId: "identity", scenario });
    expect(state.attention.primaryId).toBe("family");
    expect(state.prediction.choices.map((choice) => choice.candidateId)).toEqual(["shared", "stories"]);
    expect(state.prediction.choices.every((choice) => choice.source === "presenter")).toBe(true);
    expect(state.generation.complete).toBe(true);
  });

  it("uses the short restart transition for Summary while emergency reset invalidates it immediately", () => {
    let state = experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "summary", routeId: "emotion", scenario });
    state = experienceReducer(state, { type: "REQUEST_SUMMARY_RESTART" });
    expect(state).toMatchObject({ scene: "summary", scenePhase: "exiting", transitionMode: "restart", transitionVisualPhase: "locking" });
    const transitionId = state.transitionId!;
    const reset = experienceReducer(state, { type: "RESET_EXPERIENCE" });
    expect(reset).toMatchObject({ scene: "input", scenePhase: "ready", transitionId: null, transitionMode: null, transitionVisualPhase: "idle" });
    const stale = experienceReducer(reset, { type: "TRANSITION_VISUAL_PHASE", phase: "coreReady", transitionId, meta: { runId: state.runId, sceneInstanceId: state.sceneInstanceId } });
    expect(stale).toBe(reset);
  });
});

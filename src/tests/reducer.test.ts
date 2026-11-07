import { afterEach, describe, expect, it } from "vitest";
import rawScenario from "../data/scenario.json";
import { validateScenario } from "../data/validateScenario";
import { configureCards, createInitialState, experienceReducer, type ExperienceState } from "../app/experienceReducer";
import { selectAnswer, selectVisibleAnswer } from "../app/selectors";
import { isAligned, nearestWords } from "../data/vectorSpace";

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

describe("station 2 star field", () => {
  function vectorState(): ExperienceState {
    return finishEntry(experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "vector", scenario }));
  }

  it("refuses to lock until the asked-for token is turned into the aiming band", () => {
    let state = vectorState();
    const target = scenario.vectorSpace.lockOrder[0];
    expect(isAligned(scenario.vectorSpace.tokenPositions[target], state.vector.angle)).toBe(false);
    expect(experienceReducer(state, { type: "VECTOR_LOCK", scenario })).toBe(state);
    let turns = 0;
    while (!isAligned(scenario.vectorSpace.tokenPositions[target], state.vector.angle) && turns < 80) {
      state = experienceReducer(state, { type: "VECTOR_ROTATE", delta: 0.12 });
      turns += 1;
    }
    expect(turns).toBeLessThan(80);
    state = experienceReducer(state, { type: "VECTOR_LOCK", scenario });
    expect(state.vector.lockedTokenIds).toEqual([target]);
  });

  it("links a locked word to its nearest stars, with the far-away 黑洞 never among them", () => {
    for (const id of scenario.vectorSpace.lockOrder) {
      const near = nearestWords(scenario, id).map((word) => word.text);
      expect(near).toHaveLength(scenario.vectorSpace.neighborCount);
      expect(near).not.toContain("黑洞");
    }
    expect(nearestWords(scenario, "t04").map((word) => word.text)).toEqual(["記憶", "距離", "愛"]);
  });
});

describe("station 3 probability wheel", () => {
  const indexOf = (round: number, text: string) => scenario.prediction.rounds[round].candidates.findIndex((candidate) => candidate.text === text);

  it("keeps a drawn word only when it is the answer's next word; a miss means spin again", () => {
    let state = sceneState("attention");
    expect(state.prediction).toMatchObject({ round: 0, complete: false });
    state = experienceReducer(state, { type: "PREDICTION_PICK", scenario, candidateIndex: indexOf(0, "因為"), greedy: false });
    expect(state.prediction).toMatchObject({ round: 0, missesThisRound: 1 });
    expect(state.prediction.picks[0]).toMatchObject({ text: "因為", kept: false });
    state = experienceReducer(state, { type: "PREDICTION_PICK", scenario, candidateIndex: indexOf(0, "想念"), greedy: true });
    expect(state.prediction).toMatchObject({ round: 1, missesThisRound: 0 });
    state = experienceReducer(state, { type: "PREDICTION_PICK", scenario, candidateIndex: indexOf(1, "一個"), greedy: false });
    state = experienceReducer(state, { type: "PREDICTION_PICK", scenario, candidateIndex: indexOf(2, "人"), greedy: false });
    expect(state.prediction.complete).toBe(true);
    expect(experienceReducer(state, { type: "PREDICTION_PICK", scenario, candidateIndex: 0, greedy: false })).toBe(state);
  });

  it("ignores the wheel while the scene is not ready", () => {
    const entering = experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "attention", scenario });
    expect(experienceReducer(entering, { type: "PREDICTION_PICK", scenario, candidateIndex: 0, greedy: false })).toBe(entering);
  });
});

describe("station 4 pump generation", () => {
  it("releases one bubble per pump and appends tokens only when bubbles pop", () => {
    let state = sceneState("generation");
    const meta = metaOf(state);
    state = experienceReducer(state, { type: "GENERATION_PUMP", scenario, meta });
    state = experienceReducer(state, { type: "GENERATION_PUMP", scenario, meta });
    // The first words were already drawn on the station 3 wheel.
    const drawn = scenario.prediction.rounds.length;
    expect(state.generation).toMatchObject({ pumpCount: 2, releasedCount: drawn + 2, appendedCount: drawn });
    expect(selectVisibleAnswer(state, scenario)).toBe(scenario.answer.tokens.slice(0, drawn).join(""));
    state = experienceReducer(state, { type: "GENERATION_BUBBLE_POP", index: drawn, scenario, meta });
    expect(selectVisibleAnswer(state, scenario)).toBe(scenario.answer.tokens.slice(0, drawn + 1).join(""));
    const unreleased = experienceReducer(state, { type: "GENERATION_BUBBLE_POP", index: drawn + 5, scenario, meta });
    expect(unreleased).toBe(state);
  });

  it("stops when pumping stops and finishes the exact answer after the last token", () => {
    let state = sceneState("generation");
    const meta = metaOf(state);
    const total = scenario.answer.tokens.length;
    for (let index = 0; index < total + 3; index += 1) state = experienceReducer(state, { type: "GENERATION_PUMP", scenario, meta });
    expect(state.generation.releasedCount).toBe(total);
    expect(selectAnswer(state, scenario)).toBeNull();
    for (let index = scenario.prediction.rounds.length; index < total; index += 1) state = experienceReducer(state, { type: "GENERATION_BUBBLE_POP", index, scenario, meta });
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
    expect(reset.generation.pumpCount).toBe(0);
    expect(reset.prediction.picks).toEqual([]);
  });
});

describe("station title cards", () => {
  afterEach(() => configureCards(false));

  it("shows an intro card when a station is ready and holds the next station behind an outro card", () => {
    configureCards(true);
    let state = createInitialState(scenario.id);
    // The intro card is up before the station finishes entering, so its screen never shows first.
    expect(state.card).toEqual({ kind: "intro", scene: "input" });
    state = finishEntry(state);
    expect(state.card).toEqual({ kind: "intro", scene: "input" });
    state = experienceReducer(state, { type: "CARD_DONE" });
    expect(state.card).toBeNull();
    state = experienceReducer(state, { type: "REQUEST_TRANSITION", target: "tokenization" });
    expect(state.card).toEqual({ kind: "outro", scene: "input", target: "tokenization" });
    expect(state.scenePhase).toBe("ready");
    expect(experienceReducer(state, { type: "REQUEST_TRANSITION", target: "tokenization" })).toBe(state);
    state = experienceReducer(state, { type: "CARD_DONE" });
    expect(state.card).toBeNull();
    expect(state.scenePhase).toBe("exiting");
    expect(state.transitionTarget).toBe("tokenization");
    state = experienceReducer(state, { type: "TRANSITION_SWAP", target: "tokenization", transitionId: state.transitionId!, meta: metaOf(state) });
    expect(state.scene).toBe("tokenization");
    expect(state.card).toEqual({ kind: "intro", scene: "tokenization" });
  });

  it("has no cards on the summary and none when cards are off", () => {
    configureCards(true);
    const summary = finishEntry(experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "summary", scenario }));
    expect(summary.card).toBeNull();
    configureCards(false);
    expect(finishEntry(createInitialState(scenario.id)).card).toBeNull();
  });
});

describe("presenter and restart", () => {
  it("injects a complete safe path for downstream presenter jumps", () => {
    const state = experienceReducer(createInitialState(scenario.id), { type: "LOAD_PRESENTER_FIXTURE", scene: "summary", scenario });
    expect(state.prediction.complete).toBe(true);
    expect(state.prediction.source).toBe("presenter");
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

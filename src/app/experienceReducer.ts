import { buildDefaultAvatar, type Avatar } from "../data/avatar";
import { isAligned, nextLockTarget } from "../data/vectorSpace";
import type { ScenarioFixture } from "../data/scenarioTypes";
import type { TransitionMode, TransitionVisualPhase } from "../motion/transitionTypes";
import type { SceneId } from "./sceneOrder";

export type InputSource = "user" | "presenter" | "autoplay";

export interface ExperienceState {
  scenarioId: string;
  runId: number;
  sceneInstanceId: number;
  scene: SceneId;
  scenePhase: "entering" | "ready" | "exiting";
  transitionId: number | null;
  transitionTarget: SceneId | null;
  transitionMode: TransitionMode | null;
  transitionVisualPhase: TransitionVisualPhase;
  /** Station 0: the visitor's virtual image. Node coordinates only, cleared on every reset. */
  avatar: Avatar | null;
  /** Station 2: turntable angle (radians) and the question tokens locked into a constellation. */
  vector: {
    angle: number;
    lockedTokenIds: string[];
  };
  /** Station 3: the probability wheel. One round per predicted word; a miss means "spin again". */
  prediction: {
    round: number;
    picks: PredictionPick[];
    missesThisRound: number;
    complete: boolean;
    source: InputSource;
  };
  /** Station 4: each pump releases one bubble; each popped bubble appends one answer token. */
  generation: {
    pumpCount: number;
    releasedCount: number;
    appendedCount: number;
    complete: boolean;
  };
  /**
   * The black title card shown when a station starts (intro) or after its "next" button (outro).
   * While an outro is up the transition waits; it starts when the card is dismissed.
   */
  card: StationCardState | null;
  settings: {
    quality: "low" | "medium" | "high";
    reducedMotion: boolean;
    presenterOpen: boolean;
  };
}

export interface StationCardState {
  kind: "intro" | "outro";
  scene: SceneId;
  /** Outro only: where the visitor goes next. */
  target?: SceneId;
}

export interface PredictionPick {
  round: number;
  text: string;
  probability: number;
  /** True when the drawn word is the one this exhibition's answer continues with. */
  kept: boolean;
  /** True when the pick was "take the most likely word" instead of a random spin. */
  greedy: boolean;
}

export type GuardMeta = { runId: number; sceneInstanceId: number };

export type ExperienceAction =
  | { type: "AVATAR_SET"; avatar: Avatar }
  | { type: "VECTOR_ROTATE"; delta: number }
  | { type: "VECTOR_LOCK"; scenario: ScenarioFixture }
  | { type: "PREDICTION_PICK"; scenario: ScenarioFixture; candidateIndex: number; greedy: boolean }
  | { type: "GENERATION_PUMP"; scenario: ScenarioFixture; meta: GuardMeta }
  | { type: "GENERATION_BUBBLE_POP"; index: number; scenario: ScenarioFixture; meta: GuardMeta }
  | { type: "REQUEST_TRANSITION"; target: SceneId }
  | { type: "REQUEST_SUMMARY_RESTART" }
  | { type: "CARD_DONE" }
  | { type: "TRANSITION_VISUAL_PHASE"; phase: TransitionVisualPhase; transitionId: number; meta: GuardMeta }
  | { type: "TRANSITION_SWAP"; target: SceneId; transitionId: number; meta: GuardMeta }
  | { type: "TRANSITION_READY"; transitionId: number; meta: GuardMeta }
  | { type: "RESET_EXPERIENCE" }
  | { type: "LOAD_PRESENTER_FIXTURE"; scene: SceneId; scenario: ScenarioFixture }
  | { type: "REPLAY_SCENE"; scenario: ScenarioFixture }
  | { type: "SET_QUALITY"; quality: ExperienceState["settings"]["quality"] }
  | { type: "SET_REDUCED_MOTION"; reducedMotion: boolean }
  | { type: "TOGGLE_PRESENTER"; open?: boolean };

/** How many answer words station 3 draws; station 4's pump starts after them. Set once per scenario. */
let predictedCount = 3;

/** Scenes that get a black title card when they start and when they end. */
const CARD_SCENES: SceneId[] = ["input", "tokenization", "vector", "attention", "generation", "output"];
let cardsEnabled = false;

/** Title cards are on in the exhibition and off by default (unit tests, browser automation). */
export function configureCards(enabled: boolean): void {
  cardsEnabled = enabled;
}

export function configureForScenario(scenario: ScenarioFixture): void {
  predictedCount = scenario.prediction.rounds.length;
}

function emptyPrediction(source: InputSource = "user"): ExperienceState["prediction"] {
  return { round: 0, picks: [], missesThisRound: 0, complete: false, source };
}

function completePrediction(scenario: ScenarioFixture, source: InputSource): ExperienceState["prediction"] {
  const picks = scenario.prediction.rounds.map((round, index) => {
    const candidate = round.candidates.find((item) => item.text === scenario.answer.tokens[index])!;
    return { round: index, text: candidate.text, probability: candidate.probability, kept: true, greedy: false };
  });
  return { round: picks.length, picks, missesThisRound: 0, complete: true, source };
}

export const VECTOR_START_ANGLE = -0.5;

function emptyVector(): ExperienceState["vector"] {
  return { angle: VECTOR_START_ANGLE, lockedTokenIds: [] };
}

function completeVector(scenario: ScenarioFixture): ExperienceState["vector"] {
  return { angle: 0, lockedTokenIds: scenario.vectorSpace.lockOrder.slice(0, Math.min(3, scenario.vectorSpace.maxLocks)) };
}

/** Station 4 starts with the words already drawn in station 3 on the answer line. */
function emptyGeneration(): ExperienceState["generation"] {
  return { pumpCount: 0, releasedCount: predictedCount, appendedCount: predictedCount, complete: false };
}

function completeGeneration(scenario: ScenarioFixture): ExperienceState["generation"] {
  const total = scenario.answer.tokens.length;
  return { pumpCount: total, releasedCount: total, appendedCount: total, complete: true };
}

export function createInitialState(scenarioId: string, reducedMotion = false): ExperienceState {
  return {
    scenarioId,
    runId: 1,
    sceneInstanceId: 1,
    scene: "input",
    scenePhase: "entering",
    transitionId: 1001,
    transitionTarget: "input",
    transitionMode: "entry",
    transitionVisualPhase: "blackHold",
    avatar: null,
    card: null,
    vector: emptyVector(),
    prediction: emptyPrediction(),
    generation: emptyGeneration(),
    settings: { quality: "medium", reducedMotion, presenterOpen: false },
  };
}

function startTransition(state: ExperienceState, target: SceneId): ExperienceState {
  return {
    ...state,
    scenePhase: "exiting",
    transitionId: state.sceneInstanceId + state.runId * 1000,
    transitionTarget: target,
    transitionMode: "scene",
    transitionVisualPhase: "locking",
  };
}

function validMeta(state: ExperienceState, meta: GuardMeta): boolean {
  return state.runId === meta.runId && state.sceneInstanceId === meta.sceneInstanceId;
}

export function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case "AVATAR_SET":
      if (state.scene !== "input" || state.scenePhase !== "ready") return state;
      return { ...state, avatar: action.avatar };
    case "VECTOR_ROTATE": // The big turntable spins the whole star field around its vertical axis.
      if (state.scene !== "vector" || state.scenePhase !== "ready") return state;
      return { ...state, vector: { ...state.vector, angle: state.vector.angle + action.delta } };
    case "VECTOR_LOCK": { // Lock button: only works when the asked-for token sits in the aiming band.
      if (state.scene !== "vector" || state.scenePhase !== "ready") return state;
      const target = nextLockTarget(action.scenario, state.vector.lockedTokenIds);
      const position = target ? action.scenario.vectorSpace.tokenPositions[target] : undefined;
      if (!target || !position || !isAligned(position, state.vector.angle)) return state;
      return { ...state, vector: { ...state.vector, lockedTokenIds: [...state.vector.lockedTokenIds, target] } };
    }
    case "PREDICTION_PICK": { // The wheel stopped on a candidate (the scene draws it; the reducer records it).
      if (state.scene !== "attention" || state.scenePhase !== "ready" || state.prediction.complete) return state;
      const round = action.scenario.prediction.rounds[state.prediction.round];
      const candidate = round?.candidates[action.candidateIndex];
      if (!round || !candidate) return state;
      const kept = candidate.text === action.scenario.answer.tokens[state.prediction.round];
      const pick = { round: state.prediction.round, text: candidate.text, probability: candidate.probability, kept, greedy: action.greedy };
      const nextRound = kept ? state.prediction.round + 1 : state.prediction.round;
      return {
        ...state,
        prediction: {
          ...state.prediction,
          round: nextRound,
          picks: [...state.prediction.picks, pick],
          missesThisRound: kept ? 0 : state.prediction.missesThisRound + 1,
          complete: nextRound >= action.scenario.prediction.rounds.length,
          source: "user",
        },
      };
    }
    case "GENERATION_PUMP": { // One press of the station 4 pump releases one bubble.
      if (!validMeta(state, action.meta) || state.scene !== "generation" || state.scenePhase !== "ready" || state.generation.complete) return state;
      if (state.generation.releasedCount >= action.scenario.answer.tokens.length) return state;
      return { ...state, generation: { ...state.generation, pumpCount: state.generation.pumpCount + 1, releasedCount: state.generation.releasedCount + 1 } };
    }
    case "GENERATION_BUBBLE_POP": { // A bubble reached the surface: its token joins the answer, in order.
      if (!validMeta(state, action.meta) || state.scene !== "generation" || state.scenePhase !== "ready" || state.generation.complete) return state;
      if (action.index < state.generation.appendedCount || action.index >= state.generation.releasedCount) return state;
      const appendedCount = action.index + 1;
      return { ...state, generation: { ...state.generation, appendedCount, complete: appendedCount >= action.scenario.answer.tokens.length } };
    }
    case "REQUEST_TRANSITION":
      if (state.scenePhase !== "ready" || state.transitionId !== null || state.card !== null || action.target === state.scene) return state;
      if (cardsEnabled && CARD_SCENES.includes(state.scene)) return { ...state, card: { kind: "outro", scene: state.scene, target: action.target } };
      return startTransition(state, action.target);
    case "CARD_DONE": {
      const card = state.card;
      if (!card) return state;
      const cleared = { ...state, card: null };
      return card.kind === "outro" && card.target && state.scenePhase === "ready" ? startTransition(cleared, card.target) : cleared;
    }
    case "REQUEST_SUMMARY_RESTART":
      if (state.scene !== "summary" || state.scenePhase !== "ready" || state.transitionId !== null) return state;
      return {
        ...state,
        scenePhase: "exiting",
        transitionId: state.sceneInstanceId + state.runId * 1000,
        transitionTarget: "input",
        transitionMode: "restart",
        transitionVisualPhase: "locking",
      };
    case "TRANSITION_VISUAL_PHASE":
      if (!validMeta(state, action.meta) || state.transitionId !== action.transitionId) return state;
      return { ...state, transitionVisualPhase: action.phase };
    case "TRANSITION_SWAP":
      if (!validMeta(state, action.meta) || state.transitionMode !== "scene" || state.transitionId !== action.transitionId || state.transitionTarget !== action.target || state.scenePhase !== "exiting") return state;
      return { ...state, scene: action.target, sceneInstanceId: state.sceneInstanceId + 1, scenePhase: "entering", transitionVisualPhase: "blackSwap" };
    case "TRANSITION_READY":
      if (state.runId !== action.meta.runId || state.sceneInstanceId !== action.meta.sceneInstanceId || state.transitionId !== action.transitionId || state.scenePhase !== "entering") return state;
      return {
        ...state,
        scenePhase: "ready",
        transitionId: null,
        transitionTarget: null,
        transitionMode: null,
        transitionVisualPhase: "idle",
        card: cardsEnabled && CARD_SCENES.includes(state.scene) ? { kind: "intro", scene: state.scene } : null,
      };
    case "RESET_EXPERIENCE": {
      const fresh = createInitialState(state.scenarioId, state.settings.reducedMotion);
      const runId = state.runId + 1;
      const sceneInstanceId = state.sceneInstanceId + 1;
      return { ...fresh, runId, sceneInstanceId, transitionId: runId * 1000 + sceneInstanceId, settings: { ...state.settings, presenterOpen: false } };
    }
    case "LOAD_PRESENTER_FIXTURE": {
      const needsPrediction = ["generation", "output", "summary"].includes(action.scene);
      const needsAnswer = action.scene === "output" || action.scene === "summary";
      return {
        ...state,
        runId: state.runId + 1,
        sceneInstanceId: state.sceneInstanceId + 1,
        scene: action.scene,
        scenePhase: "entering",
        transitionId: (state.runId + 1) * 1000 + state.sceneInstanceId + 1,
        transitionTarget: action.scene,
        transitionMode: "entry",
        transitionVisualPhase: "blackHold",
        card: null,
        avatar: action.scene === "input" ? null : (state.avatar ?? buildDefaultAvatar()),
        vector: action.scene === "vector" || action.scene === "input" || action.scene === "tokenization" ? emptyVector() : completeVector(action.scenario),
        prediction: needsPrediction ? completePrediction(action.scenario, "presenter") : emptyPrediction("presenter"),
        generation: needsAnswer ? completeGeneration(action.scenario) : emptyGeneration(),
        settings: { ...state.settings, presenterOpen: false },
      };
    }
    case "REPLAY_SCENE": {
      const vector = state.scene === "vector" ? emptyVector() : state.vector;
      const avatar = state.scene === "input" ? null : state.avatar;
      const prediction = state.scene === "attention" ? emptyPrediction(state.prediction.source) : state.prediction;
      const generation = state.scene === "generation" ? emptyGeneration() : state.generation;
      const runId = state.runId + 1;
      const sceneInstanceId = state.sceneInstanceId + 1;
      return { ...state, runId, sceneInstanceId, scenePhase: "entering", transitionId: runId * 1000 + sceneInstanceId, transitionTarget: state.scene, transitionMode: "entry", transitionVisualPhase: "blackHold", card: null, avatar, vector, prediction, generation, settings: { ...state.settings, presenterOpen: false } };
    }
    case "SET_QUALITY":
      return { ...state, settings: { ...state.settings, quality: action.quality } };
    case "SET_REDUCED_MOTION":
      return { ...state, settings: { ...state.settings, reducedMotion: action.reducedMotion } };
    case "TOGGLE_PRESENTER":
      return { ...state, settings: { ...state.settings, presenterOpen: action.open ?? !state.settings.presenterOpen } };
    default:
      return state;
  }
}

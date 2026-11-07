import { keywordsComplete } from "../data/attention";
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
  /** Station 3: the dial pointer and which tokens it has rested on. */
  attention: {
    focusIndex: number;
    visitedTokenIds: string[];
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
  settings: {
    quality: "low" | "medium" | "high";
    reducedMotion: boolean;
    presenterOpen: boolean;
  };
}

export type GuardMeta = { runId: number; sceneInstanceId: number };

export type ExperienceAction =
  | { type: "AVATAR_SET"; avatar: Avatar }
  | { type: "VECTOR_ROTATE"; delta: number }
  | { type: "VECTOR_LOCK"; scenario: ScenarioFixture }
  | { type: "ATTENTION_ROTATE"; delta: 1 | -1; scenario: ScenarioFixture }
  | { type: "ATTENTION_FOCUS"; tokenId: string; scenario: ScenarioFixture }
  | { type: "GENERATION_PUMP"; scenario: ScenarioFixture; meta: GuardMeta }
  | { type: "GENERATION_BUBBLE_POP"; index: number; scenario: ScenarioFixture; meta: GuardMeta }
  | { type: "REQUEST_TRANSITION"; target: SceneId }
  | { type: "REQUEST_SUMMARY_RESTART" }
  | { type: "TRANSITION_VISUAL_PHASE"; phase: TransitionVisualPhase; transitionId: number; meta: GuardMeta }
  | { type: "TRANSITION_SWAP"; target: SceneId; transitionId: number; meta: GuardMeta }
  | { type: "TRANSITION_READY"; transitionId: number; meta: GuardMeta }
  | { type: "RESET_EXPERIENCE" }
  | { type: "LOAD_PRESENTER_FIXTURE"; scene: SceneId; scenario: ScenarioFixture }
  | { type: "REPLAY_SCENE"; scenario: ScenarioFixture }
  | { type: "SET_QUALITY"; quality: ExperienceState["settings"]["quality"] }
  | { type: "SET_REDUCED_MOTION"; reducedMotion: boolean }
  | { type: "TOGGLE_PRESENTER"; open?: boolean };

/** The pointer starts on 會, which is not a keyword, so every discovery needs a real turn of the dial. */
export const ATTENTION_START_INDEX = 2;

function emptyAttention(source: InputSource = "user"): ExperienceState["attention"] {
  return { focusIndex: ATTENTION_START_INDEX, visitedTokenIds: [], complete: false, source };
}

export const VECTOR_START_ANGLE = -0.5;

function emptyVector(): ExperienceState["vector"] {
  return { angle: VECTOR_START_ANGLE, lockedTokenIds: [] };
}

function completeVector(scenario: ScenarioFixture): ExperienceState["vector"] {
  return { angle: 0, lockedTokenIds: scenario.vectorSpace.lockOrder.slice(0, Math.min(3, scenario.vectorSpace.maxLocks)) };
}

function emptyGeneration(): ExperienceState["generation"] {
  return { pumpCount: 0, releasedCount: 0, appendedCount: 0, complete: false };
}

function completeAttention(scenario: ScenarioFixture, source: InputSource): ExperienceState["attention"] {
  const ids = scenario.inputTokens.map((token) => token.id);
  const focusIndex = Math.max(0, ids.indexOf(scenario.attention.keywordTokenIds.at(-1) ?? ids[0]));
  return { focusIndex, visitedTokenIds: [...scenario.attention.keywordTokenIds], complete: true, source };
}

function completeGeneration(scenario: ScenarioFixture): ExperienceState["generation"] {
  const total = scenario.answer.tokens.length;
  return { pumpCount: total, releasedCount: total, appendedCount: total, complete: true };
}

function focusToken(state: ExperienceState, scenario: ScenarioFixture, focusIndex: number): ExperienceState {
  const token = scenario.inputTokens[focusIndex];
  if (!token) return state;
  // A token counts as visited when the pointer lands on it (that is when its discovery is shown).
  const visitedTokenIds = state.attention.visitedTokenIds.includes(token.id) ? state.attention.visitedTokenIds : [...state.attention.visitedTokenIds, token.id];
  return {
    ...state,
    attention: { ...state.attention, focusIndex, visitedTokenIds, complete: keywordsComplete(scenario, visitedTokenIds), source: "user" },
  };
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
    vector: emptyVector(),
    attention: emptyAttention(),
    generation: emptyGeneration(),
    settings: { quality: "medium", reducedMotion, presenterOpen: false },
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
    case "ATTENTION_ROTATE": { // One detent of the station 3 dial.
      if (state.scene !== "attention" || state.scenePhase !== "ready") return state;
      const count = action.scenario.inputTokens.length;
      return focusToken(state, action.scenario, (state.attention.focusIndex + action.delta + count) % count);
    }
    case "ATTENTION_FOCUS": { // Touch / mouse fallback for the dial.
      if (state.scene !== "attention" || state.scenePhase !== "ready") return state;
      const index = action.scenario.inputTokens.findIndex((token) => token.id === action.tokenId);
      if (index < 0) return state;
      return focusToken(state, action.scenario, index);
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
      if (state.scenePhase !== "ready" || state.transitionId !== null || action.target === state.scene) return state;
      return {
        ...state,
        scenePhase: "exiting",
        transitionId: state.sceneInstanceId + state.runId * 1000,
        transitionTarget: action.target,
        transitionMode: "scene",
        transitionVisualPhase: "locking",
      };
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
      return { ...state, scenePhase: "ready", transitionId: null, transitionTarget: null, transitionMode: null, transitionVisualPhase: "idle" };
    case "RESET_EXPERIENCE": {
      const fresh = createInitialState(state.scenarioId, state.settings.reducedMotion);
      const runId = state.runId + 1;
      const sceneInstanceId = state.sceneInstanceId + 1;
      return { ...fresh, runId, sceneInstanceId, transitionId: runId * 1000 + sceneInstanceId, settings: { ...state.settings, presenterOpen: false } };
    }
    case "LOAD_PRESENTER_FIXTURE": {
      const needsAttention = ["generation", "output", "summary"].includes(action.scene);
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
        avatar: action.scene === "input" ? null : (state.avatar ?? buildDefaultAvatar()),
        vector: action.scene === "vector" || action.scene === "input" || action.scene === "tokenization" ? emptyVector() : completeVector(action.scenario),
        attention: needsAttention ? completeAttention(action.scenario, "presenter") : emptyAttention("presenter"),
        generation: needsAnswer ? completeGeneration(action.scenario) : emptyGeneration(),
        settings: { ...state.settings, presenterOpen: false },
      };
    }
    case "REPLAY_SCENE": {
      const vector = state.scene === "vector" ? emptyVector() : state.vector;
      const avatar = state.scene === "input" ? null : state.avatar;
      const attention = state.scene === "attention" ? emptyAttention(state.attention.source) : state.attention;
      const generation = state.scene === "generation" ? emptyGeneration() : state.generation;
      const runId = state.runId + 1;
      const sceneInstanceId = state.sceneInstanceId + 1;
      return { ...state, runId, sceneInstanceId, scenePhase: "entering", transitionId: runId * 1000 + sceneInstanceId, transitionTarget: state.scene, transitionMode: "entry", transitionVisualPhase: "blackHold", avatar, vector, attention, generation, settings: { ...state.settings, presenterOpen: false } };
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

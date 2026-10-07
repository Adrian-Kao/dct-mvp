import type { AttentionId, RouteId, ScenarioFixture } from "../data/scenarioTypes";
import { presenterFixtures } from "../data/presenterFixtures";
import type { TransitionMode, TransitionVisualPhase } from "../motion/transitionTypes";
import type { SceneId } from "./sceneOrder";

export type PredictionPhase =
  | "arrival"
  | "influx"
  | "compression"
  | "distribution"
  | "awaitingChoice"
  | "commit"
  | "complete";

export type InputSource = "user" | "presenter" | "autoplay";

export interface PredictionChoice {
  round: 1 | 2;
  candidateId: string;
  text: string;
  source: InputSource;
}

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
  exploredConceptIds: string[];
  attention: {
    primaryId: AttentionId | null;
    secondaryId: AttentionId | null;
    confirmed: boolean;
    source: InputSource;
  };
  prediction: {
    round: 1 | 2;
    phase: PredictionPhase;
    pendingCandidateId: string | null;
    choices: PredictionChoice[];
  };
  generation: {
    visibleChunkCount: number;
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
  | { type: "INPUT_CONFIRMED" }
  | { type: "VECTOR_TOGGLE"; conceptId: string; scenario: ScenarioFixture }
  | { type: "ATTENTION_SET_PRIMARY"; primaryId: AttentionId; scenario: ScenarioFixture }
  | { type: "ATTENTION_SET_SECONDARY"; secondaryId: AttentionId | null; scenario: ScenarioFixture }
  | { type: "ATTENTION_CONFIRM"; scenario: ScenarioFixture }
  | { type: "PREDICTION_SET_PHASE"; phase: PredictionPhase; meta: GuardMeta }
  | { type: "PREDICTION_SELECT"; candidateId: string; text: string; scenario: ScenarioFixture }
  | { type: "REQUEST_PREDICTION_TRANSFER" }
  | { type: "PREDICTION_TRANSFER_SWAP"; transitionId: number; meta: GuardMeta; scenario: ScenarioFixture }
  | { type: "GENERATION_TICK"; visibleChunkCount: number; meta: GuardMeta }
  | { type: "GENERATION_COMPLETED"; meta: GuardMeta }
  | { type: "REQUEST_TRANSITION"; target: SceneId }
  | { type: "REQUEST_SUMMARY_RESTART" }
  | { type: "TRANSITION_VISUAL_PHASE"; phase: TransitionVisualPhase; transitionId: number; meta: GuardMeta }
  | { type: "TRANSITION_SWAP"; target: SceneId; transitionId: number; meta: GuardMeta }
  | { type: "TRANSITION_READY"; transitionId: number; meta: GuardMeta }
  | { type: "RESET_EXPERIENCE" }
  | { type: "LOAD_PRESENTER_FIXTURE"; scene: SceneId; routeId: RouteId; scenario: ScenarioFixture }
  | { type: "REPLAY_SCENE"; scenario: ScenarioFixture }
  | { type: "SET_QUALITY"; quality: ExperienceState["settings"]["quality"] }
  | { type: "SET_REDUCED_MOTION"; reducedMotion: boolean }
  | { type: "TOGGLE_PRESENTER"; open?: boolean };

function emptyAttention(source: InputSource = "user"): ExperienceState["attention"] {
  return { primaryId: null, secondaryId: null, confirmed: false, source };
}

function emptyPrediction(): ExperienceState["prediction"] {
  return { round: 1, phase: "arrival", pendingCandidateId: null, choices: [] };
}

export function createInitialState(scenarioId: string, reducedMotion = false): ExperienceState {
  return {
    scenarioId,
    runId: 1,
    sceneInstanceId: 1,
    scene: "input",
    scenePhase: "ready",
    transitionId: null,
    transitionTarget: null,
    transitionMode: null,
    transitionVisualPhase: "idle",
    exploredConceptIds: [],
    attention: emptyAttention(),
    prediction: emptyPrediction(),
    generation: { visibleChunkCount: 0, complete: false },
    settings: { quality: "medium", reducedMotion, presenterOpen: false },
  };
}

function validMeta(state: ExperienceState, meta: GuardMeta): boolean {
  return state.runId === meta.runId && state.sceneInstanceId === meta.sceneInstanceId;
}

function routeForPrimary(scenario: ScenarioFixture, id: AttentionId | null): RouteId | null {
  return scenario.attentionOptions.find((option) => option.id === id)?.routeId ?? null;
}

function currentCandidates(state: ExperienceState, scenario: ScenarioFixture) {
  const routeId = routeForPrimary(scenario, state.attention.primaryId);
  const route = scenario.routes.find((item) => item.id === routeId);
  if (!route) return [];
  if (state.prediction.round === 1) return route.round1;
  const firstId = state.prediction.choices.find((choice) => choice.round === 1)?.candidateId;
  return firstId ? (route.round2ByFirst[firstId] ?? []) : [];
}

export function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case "INPUT_CONFIRMED":
      if (state.scene !== "input" || state.scenePhase !== "ready") return state;
      return state;
    case "VECTOR_TOGGLE": { // Purely visual/exploratory state.
      if (state.scene !== "vector" || state.scenePhase !== "ready") return state;
      const valid = action.scenario.vectorNodes.some((node) => node.id === action.conceptId && node.selectable);
      if (!valid) return state;
      const selected = state.exploredConceptIds.includes(action.conceptId);
      if (!selected && state.exploredConceptIds.length >= 2) return state;
      return {
        ...state,
        exploredConceptIds: selected
          ? state.exploredConceptIds.filter((id) => id !== action.conceptId)
          : [...state.exploredConceptIds, action.conceptId],
      };
    }
    case "ATTENTION_SET_PRIMARY": {
      if (state.scene !== "attention" || state.scenePhase !== "ready") return state;
      if (!action.scenario.attentionOptions.some((option) => option.id === action.primaryId)) return state;
      return {
        ...state,
        attention: {
          ...state.attention,
          primaryId: action.primaryId,
          secondaryId: state.attention.secondaryId === action.primaryId ? null : state.attention.secondaryId,
          confirmed: false,
          source: "user",
        },
        prediction: emptyPrediction(),
        generation: { visibleChunkCount: 0, complete: false },
      };
    }
    case "ATTENTION_SET_SECONDARY": {
      if (state.scene !== "attention" || state.scenePhase !== "ready") return state;
      if (action.secondaryId === state.attention.primaryId) return state;
      if (action.secondaryId && !action.scenario.attentionOptions.some((option) => option.id === action.secondaryId)) return state;
      return { ...state, attention: { ...state.attention, secondaryId: action.secondaryId, confirmed: false } };
    }
    case "ATTENTION_CONFIRM":
      if (state.scene !== "attention" || state.scenePhase !== "ready" || !routeForPrimary(action.scenario, state.attention.primaryId)) return state;
      return {
        ...state,
        attention: { ...state.attention, confirmed: true },
        prediction: emptyPrediction(),
        generation: { visibleChunkCount: 0, complete: false },
      };
    case "PREDICTION_SET_PHASE":
      if (!validMeta(state, action.meta) || state.scene !== "prediction" || state.scenePhase !== "ready") return state;
      if (state.prediction.pendingCandidateId && action.phase !== "commit") return state;
      return { ...state, prediction: { ...state.prediction, phase: action.phase } };
    case "PREDICTION_SELECT": { // The reducer is the real interaction lock, not CSS.
      if (state.scene !== "prediction" || state.scenePhase !== "ready" || state.prediction.phase !== "awaitingChoice" || state.prediction.pendingCandidateId) return state;
      const candidate = currentCandidates(state, action.scenario).find((item) => item.id === action.candidateId && item.text === action.text);
      if (!candidate) return state;
      return { ...state, prediction: { ...state.prediction, pendingCandidateId: candidate.id, phase: "commit" } };
    }
    case "REQUEST_PREDICTION_TRANSFER":
      if (state.scene !== "prediction" || state.scenePhase !== "ready" || state.transitionId !== null || state.prediction.phase !== "commit" || !state.prediction.pendingCandidateId) return state;
      return {
        ...state,
        scenePhase: "exiting",
        transitionId: state.sceneInstanceId + state.runId * 1000,
        transitionTarget: state.prediction.round === 1 ? "prediction" : "generation",
        transitionMode: "prediction",
        transitionVisualPhase: "locking",
      };
    case "PREDICTION_TRANSFER_SWAP": { // The controlled handoff is the only append point.
      if (!validMeta(state, action.meta) || state.scene !== "prediction" || state.scenePhase !== "exiting" || state.transitionMode !== "prediction" || state.transitionId !== action.transitionId || !state.prediction.pendingCandidateId) return state;
      const candidate = currentCandidates(state, action.scenario).find((item) => item.id === state.prediction.pendingCandidateId);
      if (!candidate) return state;
      const choice: PredictionChoice = {
        round: state.prediction.round,
        candidateId: candidate.id,
        text: candidate.text,
        source: "user",
      };
      if (state.prediction.round === 1) {
        return {
          ...state,
          sceneInstanceId: state.sceneInstanceId + 1,
          scenePhase: "entering",
          transitionVisualPhase: "entering",
          prediction: { round: 2, phase: "arrival", pendingCandidateId: null, choices: [choice] },
        };
      }
      return {
        ...state,
        scene: "generation",
        sceneInstanceId: state.sceneInstanceId + 1,
        scenePhase: "entering",
        transitionVisualPhase: "entering",
        prediction: { ...state.prediction, phase: "complete", pendingCandidateId: null, choices: [...state.prediction.choices, choice] },
        generation: { visibleChunkCount: 0, complete: false },
      };
    }
    case "GENERATION_TICK":
      if (!validMeta(state, action.meta) || state.scene !== "generation" || state.scenePhase !== "ready" || state.generation.complete) return state;
      return { ...state, generation: { ...state.generation, visibleChunkCount: Math.max(state.generation.visibleChunkCount, action.visibleChunkCount) } };
    case "GENERATION_COMPLETED":
      if (!validMeta(state, action.meta) || state.scene !== "generation" || state.scenePhase !== "ready") return state;
      return { ...state, generation: { ...state.generation, complete: true } };
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
      return { ...state, scene: action.target, sceneInstanceId: state.sceneInstanceId + 1, scenePhase: "entering", transitionVisualPhase: "entering" };
    case "TRANSITION_READY":
      if (state.runId !== action.meta.runId || state.sceneInstanceId !== action.meta.sceneInstanceId || state.transitionId !== action.transitionId || state.scenePhase !== "entering") return state;
      return { ...state, scenePhase: "ready", transitionId: null, transitionTarget: null, transitionMode: null, transitionVisualPhase: "idle" };
    case "RESET_EXPERIENCE": {
      const fresh = createInitialState(state.scenarioId, state.settings.reducedMotion);
      return { ...fresh, runId: state.runId + 1, sceneInstanceId: state.sceneInstanceId + 1, settings: { ...state.settings, presenterOpen: false } };
    }
    case "LOAD_PRESENTER_FIXTURE": {
      const fixture = presenterFixtures[action.routeId];
      const downstream = ["generation", "output", "summary"].includes(action.scene);
      const choices: PredictionChoice[] = downstream
        ? [
            { round: 1, candidateId: fixture.firstId, text: action.scenario.routes.find((route) => route.id === fixture.routeId)?.round1.find((item) => item.id === fixture.firstId)?.text ?? "", source: "presenter" },
            { round: 2, candidateId: fixture.secondId, text: action.scenario.routes.find((route) => route.id === fixture.routeId)?.round2ByFirst[fixture.firstId]?.find((item) => item.id === fixture.secondId)?.text ?? "", source: "presenter" },
          ]
        : [];
      const needsAttention = ["prediction", "generation", "output", "summary"].includes(action.scene);
      return {
        ...state,
        runId: state.runId + 1,
        sceneInstanceId: state.sceneInstanceId + 1,
        scene: action.scene,
        scenePhase: "ready",
        transitionId: null,
        transitionTarget: null,
        transitionMode: null,
        transitionVisualPhase: "idle",
        exploredConceptIds: [],
        attention: needsAttention
          ? { primaryId: fixture.primaryId, secondaryId: null, confirmed: true, source: "presenter" }
          : emptyAttention("presenter"),
        prediction: downstream
          ? { round: 2, phase: "complete", pendingCandidateId: null, choices }
          : emptyPrediction(),
        generation: {
          visibleChunkCount: action.scene === "output" || action.scene === "summary" ? Number.MAX_SAFE_INTEGER : 0,
          complete: action.scene === "output" || action.scene === "summary",
        },
        settings: { ...state.settings, presenterOpen: false },
      };
    }
    case "REPLAY_SCENE": {
      let prediction = state.prediction;
      let generation = state.generation;
      if (state.scene === "prediction") prediction = emptyPrediction();
      if (state.scene === "generation") generation = { visibleChunkCount: 0, complete: false };
      return { ...state, runId: state.runId + 1, sceneInstanceId: state.sceneInstanceId + 1, scenePhase: "ready", transitionId: null, transitionTarget: null, transitionMode: null, transitionVisualPhase: "idle", prediction, generation, settings: { ...state.settings, presenterOpen: false } };
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

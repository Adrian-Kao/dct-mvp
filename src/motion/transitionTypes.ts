import type { SceneId } from "../app/sceneOrder";

export type TransitionItemRole = "retained" | "discarded" | "chrome";

export type TransitionVisualPhase =
  | "idle"
  | "locking"
  | "resolvingChoice"
  | "compacting"
  | "converging"
  | "coreReady"
  | "exiting"
  | "blackSwap"
  | "blackHold"
  | "enteringCore"
  | "centerHold"
  | "expanding";

export type TransitionMode = "scene" | "prediction" | "restart" | "entry";

export interface TransitionSnapshotItem {
  id: string;
  role: TransitionItemRole;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransitionSnapshot {
  transitionId: number;
  runId: number;
  sceneInstanceId: number;
  from: SceneId;
  to: SceneId;
  mode: TransitionMode;
  predictionRound: 1 | 2 | null;
  width: number;
  height: number;
  center: { x: 0.5; y: 0.5 };
  items: TransitionSnapshotItem[];
  hasDiscarded: boolean;
  reducedMotion: boolean;
}

export const STAGE_CENTER = { x: 0.5, y: 0.5 } as const;

import type { ExperienceState } from "../app/experienceReducer";
import { STAGE_CENTER, type TransitionItemRole, type TransitionSnapshot, type TransitionSnapshotItem } from "./transitionTypes";

function isRole(value: string | undefined): value is TransitionItemRole {
  return value === "retained" || value === "discarded" || value === "chrome";
}

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0.02;
}

export function captureSceneExitSnapshot(stage: HTMLElement, state: ExperienceState): TransitionSnapshot {
  if (state.transitionId === null || !state.transitionTarget || !state.transitionMode) {
    throw new Error("Cannot capture a transition without a locked transition identity");
  }
  const stageRect = stage.getBoundingClientRect();
  const renderer = stage.dataset.renderer ?? "webgl";
  const items: TransitionSnapshotItem[] = [];
  const elements = Array.from(stage.querySelectorAll<HTMLElement>("[data-transition-item='true']"));
  elements.forEach((element, elementIndex) => {
    const source = element.dataset.transitionSource;
    if (source && source !== "dom" && source !== renderer) return;
    const role = element.dataset.transitionRole;
    if (!isRole(role) || !isVisible(element)) return;
    const rect = element.getBoundingClientRect();
    const slices = Math.max(1, Math.min(4, Number.parseInt(element.dataset.transitionSlices ?? "1", 10) || 1));
    for (let slice = 0; slice < slices; slice += 1) {
      const sliceHeight = rect.height / slices;
      items.push({
        id: `${element.dataset.transitionId ?? `item-${elementIndex}`}${slices > 1 ? `-slice-${slice}` : ""}`,
        role,
        x: (rect.left - stageRect.left + rect.width / 2) / stageRect.width,
        y: (rect.top - stageRect.top + sliceHeight * (slice + 0.5)) / stageRect.height,
        width: rect.width / stageRect.width,
        height: sliceHeight / stageRect.height,
      });
    }
  });

  // A valid scene adapter should always expose retained data. Keep this diagnostic
  // fallback centered so a layout race cannot strand the transition off-screen.
  if (!items.some((item) => item.role === "retained")) {
    items.push({ id: `${state.scene}-retained-fallback`, role: "retained", x: 0.5, y: 0.5, width: 0.02, height: 0.02 });
  }

  return {
    transitionId: state.transitionId,
    runId: state.runId,
    sceneInstanceId: state.sceneInstanceId,
    from: state.scene,
    to: state.transitionTarget,
    mode: state.transitionMode,
    predictionRound: state.scene === "prediction" ? state.prediction.round : null,
    width: stageRect.width,
    height: stageRect.height,
    center: STAGE_CENTER,
    items,
    hasDiscarded: items.some((item) => item.role === "discarded"),
    reducedMotion: state.settings.reducedMotion,
  };
}

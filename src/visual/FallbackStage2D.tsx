import type { ExperienceState } from "../app/experienceReducer";

interface Props {
  state: ExperienceState;
}

/** Low-power background. Scene content (star field, dial, pump) is DOM and renders the same in both modes. */
export function FallbackStage2D({ state }: Props) {
  return <div className={`fallback-stage fallback-${state.scene}`} aria-hidden="true" />;
}

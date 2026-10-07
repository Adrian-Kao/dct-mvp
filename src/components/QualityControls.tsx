import { useExperience } from "../app/ExperienceProvider";

export function QualityControls() {
  const { state, dispatch } = useExperience();
  return (
    <fieldset className="quality-controls">
      <legend>視覺品質</legend>
      <div className="segmented-control">
        {(["low", "medium", "high"] as const).map((quality) => (
          <button
            key={quality}
            type="button"
            className={state.settings.quality === quality ? "is-active" : ""}
            aria-pressed={state.settings.quality === quality}
            onClick={() => dispatch({ type: "SET_QUALITY", quality })}
          >
            {quality[0].toUpperCase() + quality.slice(1)}
          </button>
        ))}
      </div>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={state.settings.reducedMotion}
          onChange={(event) => dispatch({ type: "SET_REDUCED_MOTION", reducedMotion: event.target.checked })}
        />
        <span>減少動態</span>
      </label>
    </fieldset>
  );
}

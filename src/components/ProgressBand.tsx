import { useExperience } from "../app/ExperienceProvider";
import { sceneLabels, sceneOrder, type SceneId } from "../app/sceneOrder";

/** The station strip along the top. It only lights up once the visitor has become a model. */
const stations: Array<{ scene: SceneId; label: string }> = [
  { scene: "input", label: "入口" },
  { scene: "tokenization", label: "切字" },
  { scene: "vector", label: "向量" },
  { scene: "attention", label: "接龍" },
  { scene: "generation", label: "生成" },
  { scene: "output", label: "輸出" },
];

export function ProgressBand() {
  const { state } = useExperience();
  const sceneIndex = sceneOrder.indexOf(state.scene);
  const current = Math.min(sceneIndex, stations.length - 1);
  const lit = state.avatar !== null;
  const position = ((current + 0.5) / stations.length) * 100;
  return (
    <div className={`progress-band${lit ? " is-lit" : ""}`} aria-label={`${sceneLabels[state.scene]}，第 ${sceneIndex + 1} 幕，共 ${sceneOrder.length} 幕`} data-progress-station={state.scene}>
      <ol>
        {stations.map((station, index) => (
          <li key={station.scene} className={index < current ? "is-done" : index === current ? "is-current" : ""}>
            <span>{index === 0 ? "站 0" : `站 ${index}`}</span>
            {station.label}
          </li>
        ))}
      </ol>
      {lit && state.avatar && (
        <span className="progress-avatar" style={{ left: `${position}%` }} data-progress-avatar={state.avatar.modelNumber}>
          <i aria-hidden="true" />
          {state.avatar.modelNumber}
        </span>
      )}
    </div>
  );
}

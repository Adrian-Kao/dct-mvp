import type { ReactNode } from "react";

export interface MissionStep {
  /** Keyboard keys that stand in for this station's physical control, e.g. ["←", "→"]. */
  keys?: string[];
  text: ReactNode;
  done?: boolean;
}

interface Props {
  station: string;
  task: ReactNode;
  steps: MissionStep[];
  /** One plain sentence about what the visitor just learned; shown once the station is done. */
  learned?: ReactNode;
  showLearned?: boolean;
}

/** Game-style instruction card: what you are doing here, how to do it, and what it means. */
export function MissionCard({ station, task, steps, learned, showLearned = false }: Props) {
  return (
    <aside className="mission-card" aria-label={`${station} 任務`} data-entry-target="true" data-entry-order="2">
      <p className="mission-station">{station}</p>
      <p className="mission-task"><span>你的任務</span>{task}</p>
      <ol className="mission-steps">
        {steps.map((step, index) => (
          <li key={index} className={step.done ? "is-done" : ""}>
            <i aria-hidden="true">{step.done ? "✓" : index + 1}</i>
            <span>
              {step.text}
              {step.keys && <> {step.keys.map((key) => <kbd key={key}>{key}</kbd>)}</>}
            </span>
          </li>
        ))}
      </ol>
      {learned && showLearned && <p className="mission-learned" role="status"><span>你剛剛學到</span>{learned}</p>}
    </aside>
  );
}

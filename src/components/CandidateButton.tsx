import type { ChoiceFixture } from "../data/scenarioTypes";

interface Props {
  candidate: ChoiceFixture;
  index: number;
  revealed: boolean;
  showWeight: boolean;
  disabled: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}

export function CandidateButton({ candidate, index, revealed, showWeight, disabled, selected, dimmed, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`candidate candidate-${index}${selected ? " is-selected" : ""}${dimmed ? " is-dimmed" : ""}${revealed ? " is-visible" : ""}`}
      disabled={disabled}
      aria-pressed={selected}
      data-transition-item="true"
      data-transition-id={`prediction-${candidate.id}`}
      data-transition-role={selected ? "retained" : "discarded"}
      data-transition-source="dom"
      onClick={onSelect}
    >
      <span className="candidate-word">{candidate.text.trim()}</span>
      {showWeight && <span className="candidate-weight">示意機率 {Math.round(candidate.weight * 100)}%</span>}
      <span className="candidate-action">選擇此文字</span>
    </button>
  );
}

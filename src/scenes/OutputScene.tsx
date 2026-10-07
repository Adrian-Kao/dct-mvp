import { useExperience } from "../app/ExperienceProvider";
import { selectAnswer } from "../app/selectors";
import { SceneHeading } from "../components/SceneHeading";

export function OutputScene() {
  const { state, dispatch, scenario } = useExperience();
  const answer = selectAnswer(state, scenario);
  if (!answer) return (
    <div className="scene-shell error-shell"><h1>找不到完整回答</h1><button type="button" onClick={() => dispatch({ type: "RESET_EXPERIENCE" })}>重新開始</button></div>
  );
  return (
    <div className="scene-shell output-shell">
      <div data-transition-item="true" data-transition-id="output-question" data-transition-role="retained" data-transition-source="dom">
        <SceneHeading eyebrow="07 · THE ANSWER" title={scenario.question} description={scenario.questionZh} />
      </div>
      <article className="answer-card" data-transition-item="true" data-transition-id="output-answer" data-transition-role="retained" data-transition-source="dom" data-transition-slices="3">
        <p>{answer.fullAnswer}</p>
        <small>藝術／教學示例回答 · {answer.answerId}</small>
      </article>
      <div className="scene-controls">
        <span>特效已退去；回答不會再被改寫。</span>
        <button type="button" className="primary-button" onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "summary" })}>查看這次的路徑</button>
      </div>
    </div>
  );
}

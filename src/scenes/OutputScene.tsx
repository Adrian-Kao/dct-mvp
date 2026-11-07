import { useExperience } from "../app/ExperienceProvider";
import { selectAnswer } from "../app/selectors";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";

export function OutputScene() {
  const { state, dispatch, scenario } = useExperience();
  const answer = selectAnswer(state, scenario);
  if (!answer) return (
    <div className="scene-shell error-shell"><h1>找不到完整回答</h1><button type="button" onClick={() => dispatch({ type: "RESET_EXPERIENCE" })}>重新開始</button></div>
  );
  return (
    <div className="scene-shell output-shell">
      <div data-entry-target="true" data-entry-order="1" data-transition-item="true" data-transition-id="output-question" data-transition-role="retained" data-transition-source="dom">
        <SceneHeading eyebrow="站 5 · OUTPUT 輸出" title={scenario.question} description="上一位觀眾的問題" />
      </div>
      <MissionCard
        station="站 5 · 輸出"
        task="這是你剛剛以模型身分，一塊一塊生成出來的完整答案。"
        steps={[
          { text: "讀一讀這段答案" },
          { text: "按「查看這次的路徑」，回顧你做了什麼" },
        ]}
        learned="你完整生成了一個答案，卻不知道它對提問的人代表什麼。生成答案，不等於理解答案。"
        showLearned
      />
      <article className="answer-card" data-entry-target="true" data-entry-order="2" data-transition-item="true" data-transition-id="output-answer" data-transition-role="retained" data-transition-source="dom" data-transition-slices="3">
        <p>{answer.fullAnswer}</p>
      </article>
      <div className="scene-controls" data-entry-target="true" data-entry-order="4">
        <button type="button" className="primary-button" onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "summary" })}>查看這次的路徑</button>
      </div>
    </div>
  );
}

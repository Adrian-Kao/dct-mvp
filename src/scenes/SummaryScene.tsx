import { useExperience } from "../app/ExperienceProvider";
import { selectAnswer } from "../app/selectors";
import { SceneHeading } from "../components/SceneHeading";

export function SummaryScene() {
  const { state, dispatch, scenario } = useExperience();
  const answer = selectAnswer(state, scenario);
  const optionLabel = (id: string | null) => scenario.attentionOptions.find((item) => item.id === id)?.label ?? "未選擇";
  const presenterPath = state.attention.source === "presenter" || state.prediction.choices.some((choice) => choice.source === "presenter");
  if (!answer) return (
    <div className="scene-shell error-shell"><h1>路徑紀錄不完整</h1><button type="button" onClick={() => dispatch({ type: "RESET_EXPERIENCE" })}>重新開始</button></div>
  );
  return (
    <div className="scene-shell summary-shell">
      <SceneHeading eyebrow="08 · YOUR PATH" title="What shaped this answer?" description="畫面互動與內容分支被分開記錄，不會把探索誤說成生成原因。" />
      <article className="receipt" data-entry-target="true" data-entry-order="1" data-transition-item="true" data-transition-id="summary-receipt" data-transition-role="retained" data-transition-source="dom">
        <header>
          <span>BEFORE THE ANSWER</span><strong>PATH RECEIPT</strong><small>{presenterPath ? "演示預設路徑" : "本次互動路徑"}</small>
        </header>
        <dl>
          <div><dt>QUESTION</dt><dd>{scenario.question}</dd></div>
          <div><dt>EXPLORED</dt><dd>{state.exploredConceptIds.length ? state.exploredConceptIds.join(" · ") : "未選擇"}</dd></div>
          <div><dt>PRIMARY FOCUS</dt><dd>{optionLabel(state.attention.primaryId)}</dd></div>
          <div><dt>SECONDARY FOCUS</dt><dd>{optionLabel(state.attention.secondaryId)}</dd></div>
          <div><dt>PREDICTION 01</dt><dd>{state.prediction.choices.find((choice) => choice.round === 1)?.text.trim() ?? "未選擇"}</dd></div>
          <div><dt>PREDICTION 02</dt><dd>{state.prediction.choices.find((choice) => choice.round === 2)?.text.trim() ?? "未選擇"}</dd></div>
          <div><dt>ANSWER ID</dt><dd><code>{answer.answerId}</code></dd></div>
        </dl>
        <p className="receipt-answer">{answer.fullAnswer}</p>
        <footer>
          <p>探索：影響畫面提示與紀錄</p>
          <p>主焦點與兩次預測：決定這條回答路徑</p>
          <p>輔助焦點：影響光流與紀錄</p>
        </footer>
      </article>
      <div className="scene-controls" data-entry-target="true" data-entry-order="4">
        <span>紀錄只存在目前瀏覽器記憶體，不會上傳。</span>
        <button type="button" className="primary-button" onClick={() => dispatch({ type: "REQUEST_SUMMARY_RESTART" })}>重新體驗</button>
      </div>
    </div>
  );
}

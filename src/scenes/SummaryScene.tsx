import { useExperience } from "../app/ExperienceProvider";
import { selectAnswer, selectStrongestLinks } from "../app/selectors";
import { SceneHeading } from "../components/SceneHeading";

export function SummaryScene() {
  const { state, dispatch, scenario } = useExperience();
  const answer = selectAnswer(state, scenario);
  const tokenText = (id: string) => scenario.inputTokens.find((token) => token.id === id)?.text.trim() ?? id;
  const links = selectStrongestLinks(state, scenario);
  const presenterPath = state.attention.source === "presenter";
  if (!answer) return (
    <div className="scene-shell error-shell"><h1>路徑紀錄不完整</h1><button type="button" onClick={() => dispatch({ type: "RESET_EXPERIENCE" })}>重新開始</button></div>
  );
  return (
    <div className="scene-shell summary-shell">
      <SceneHeading eyebrow="回顧 · YOUR PATH" title="這個答案是怎麼來的？" />
      <article className="receipt" data-entry-target="true" data-entry-order="1" data-transition-item="true" data-transition-id="summary-receipt" data-transition-role="retained" data-transition-source="dom">
        <header>
          <span>BEFORE THE ANSWER</span><strong>路徑收據</strong><small>{presenterPath ? "演示預設路徑" : "本次互動路徑"}</small>
        </header>
        <dl>
          <div><dt>問題</dt><dd>{scenario.question}</dd></div>
          <div><dt>站 2 鎖定的字</dt><dd>{state.vector.lockedTokenIds.length ? state.vector.lockedTokenIds.map(tokenText).join(" · ") : "未鎖定"}</dd></div>
          <div><dt>站 3 轉盤走過</dt><dd>{state.attention.visitedTokenIds.length ? state.attention.visitedTokenIds.map(tokenText).join(" → ") : "未轉動"}</dd></div>
          <div><dt>站 3 最強連線</dt><dd>{links.length ? links.map((link) => `${tokenText(link.fromId)}—${tokenText(link.toId)}`).join(" · ") : "無"}</dd></div>
          <div><dt>站 4 壓泵次數</dt><dd>{state.generation.pumpCount}</dd></div>
          <div><dt>答案編號</dt><dd><code>{answer.answerId}</code></dd></div>
        </dl>
        <p className="receipt-answer">{answer.fullAnswer}</p>
      </article>
      <div className="scene-controls" data-entry-target="true" data-entry-order="4">
        <button type="button" className="primary-button" onClick={() => dispatch({ type: "REQUEST_SUMMARY_RESTART" })}>重新體驗</button>
      </div>
    </div>
  );
}

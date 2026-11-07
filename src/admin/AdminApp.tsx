import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { clueHits, cluesFor } from "../data/clues";
import { clearActiveScenario, defaultScenario, loadActiveScenario, saveActiveScenario } from "../data/scenarioStore";
import type { ScenarioFixture } from "../data/scenarioTypes";
import { validateScenario } from "../data/validateScenario";
import { topOther } from "../data/attention";
import { defaultAttention, draftScenario, isContent, layoutVectorSpace, neighborsOf, normalizeRow } from "./buildScenario";
import { loadTokenizer, type CutMode, type Tokenizer } from "./tokenizer";
import "./admin.css";

const SEPARATOR = "|";
const join = (pieces: string[]) => pieces.join(SEPARATOR);
const split = (text: string) => text.split(SEPARATOR).filter((piece) => piece.length > 0);

/** Normalize every attention row so it adds to 1, then run the same validator the exhibition uses. */
function finalize(draft: ScenarioFixture): ScenarioFixture {
  const weights = Object.fromEntries(Object.entries(draft.attention.weights).map(([id, row]) => [id, normalizeRow(row)]));
  const notes = Object.fromEntries(Object.entries(draft.attention.notes ?? {}).filter(([, note]) => note.trim()));
  return validateScenario({ ...draft, attention: { ...draft.attention, weights, notes } });
}

export default function AdminApp() {
  const initial = useMemo(() => loadActiveScenario(), []);
  const [tokenizer, setTokenizer] = useState<Tokenizer | null>(null);
  const [mode, setMode] = useState<CutMode>("word");
  const [question, setQuestion] = useState(initial.scenario.question);
  const [answer, setAnswer] = useState(initial.scenario.answer.tokens.join(""));
  const [questionPieces, setQuestionPieces] = useState(join(initial.scenario.inputTokens.map((token) => token.text)));
  const [answerPieces, setAnswerPieces] = useState(join(initial.scenario.answer.tokens));
  const [draft, setDraft] = useState<ScenarioFixture>(initial.scenario);
  const [neighborText, setNeighborText] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(neighborsOf(initial.scenario)).map(([id, words]) => [id, words.join("、")])));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(initial.custom ? { kind: "ok", text: "目前展場使用的是後台存的題目。" } : null);

  useEffect(() => {
    document.title = "後台 · Before the Answer";
    document.documentElement.classList.add("admin-page");
    loadTokenizer().then(setTokenizer).catch(() => setMessage({ kind: "error", text: "tokenizer 載入失敗，請重新整理。" }));
    return () => document.documentElement.classList.remove("admin-page");
  }, []);

  const fail = (error: unknown) => setMessage({ kind: "error", text: error instanceof Error ? error.message.replace("Invalid scenario: ", "資料有問題：") : String(error) });

  const syncFields = (scenario: ScenarioFixture) => {
    setQuestion(scenario.question);
    setAnswer(scenario.answer.tokens.join(""));
    setQuestionPieces(join(scenario.inputTokens.map((token) => token.text)));
    setAnswerPieces(join(scenario.answer.tokens));
    setNeighborText(Object.fromEntries(Object.entries(neighborsOf(scenario)).map(([id, words]) => [id, words.join("、")])));
    setDraft(scenario);
  };

  const autoCut = () => {
    if (!tokenizer) return;
    setQuestionPieces(join(tokenizer.cut(question.trim(), mode)));
    setAnswerPieces(join(tokenizer.cut(answer.trim(), mode)));
    setMessage({ kind: "ok", text: "已切好。可以直接改「|」的位置，再按「產生每一站」。" });
  };

  const generate = () => {
    if (!tokenizer) return;
    try {
      const q = question.trim();
      const a = answer.trim();
      const qp = split(questionPieces);
      const ap = split(answerPieces);
      if (qp.join("") !== q) throw new Error("問題的切字拼回去跟問題不一樣，請先按「自動切字」或檢查「|」。");
      if (ap.join("") !== a) throw new Error("答案的切字拼回去跟答案不一樣，請先按「自動切字」或檢查「|」。");
      const scenario = validateScenario(draftScenario({ question: q, answer: a, questionPieces: qp, answerPieces: ap }, tokenizer));
      syncFields(scenario);
      setMessage({ kind: "ok", text: "每一站都產生好了，往下檢查、修改，最後按「儲存並套用到展場」。" });
    } catch (error) {
      fail(error);
    }
  };

  const relayout = (lockOrder = draft.vectorSpace.lockOrder) => {
    const neighbors = Object.fromEntries(lockOrder.map((id) => [id, (neighborText[id] ?? "").split(/[、,，\s]+/u).filter(Boolean)]));
    const vectorSpace = layoutVectorSpace(draft.inputTokens, lockOrder, neighbors, draft.seed);
    setDraft({ ...draft, vectorSpace });
  };

  const toggleLock = (id: string) => {
    const lockOrder = draft.vectorSpace.lockOrder.includes(id) ? draft.vectorSpace.lockOrder.filter((item) => item !== id) : [...draft.vectorSpace.lockOrder, id].slice(0, 4);
    if (!lockOrder.length) return;
    relayout(lockOrder);
  };

  const toggleKeyword = (id: string) => {
    const current = draft.attention.keywordTokenIds;
    const keywordTokenIds = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    if (!keywordTokenIds.length) return;
    setDraft({ ...draft, attention: { ...draft.attention, keywordTokenIds } });
  };

  const setWeight = (rowId: string, index: number, percent: number) => {
    const row = [...draft.attention.weights[rowId]];
    row[index] = Math.max(0.001, percent / 100);
    setDraft({ ...draft, attention: { ...draft.attention, weights: { ...draft.attention.weights, [rowId]: row } } });
  };

  const save = () => {
    try {
      const scenario = finalize(draft);
      saveActiveScenario(scenario);
      setDraft(scenario);
      setMessage({ kind: "ok", text: "已儲存。展場頁面重新整理後，就會用這一題。" });
    } catch (error) {
      fail(error);
    }
  };

  const restoreDefault = () => {
    clearActiveScenario();
    syncFields(defaultScenario);
    setMessage({ kind: "ok", text: "已恢復預設題目「為什麼人會想念一個人？」。展場重新整理後生效。" });
  };

  const exportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(finalize(draft), null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${draft.id}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      fail(error);
    }
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      syncFields(validateScenario(JSON.parse(await file.text())));
      setMessage({ kind: "ok", text: `已匯入 ${file.name}，檢查後按「儲存並套用到展場」。` });
    } catch (error) {
      fail(error);
    }
  };

  const tokens = draft.inputTokens;
  const uniqueContent = tokens.filter((token, index) => isContent(token.text) && tokens.findIndex((other) => other.text === token.text) === index);
  const clues = cluesFor(draft, draft.vectorSpace.lockOrder);
  const hits = clueHits(draft.answer.tokens.join(""), clues);

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">BEFORE THE ANSWER · 後台</p>
          <h1>設定這一輪的題目</h1>
        </div>
        <div className="admin-actions">
          <a href="./" target="_blank" rel="noreferrer">開啟展場 ↗</a>
          <button type="button" onClick={exportJson}>匯出 JSON</button>
          <label className="admin-file">匯入 JSON<input type="file" accept="application/json,.json" onChange={(event) => void importJson(event)} /></label>
          <button type="button" onClick={restoreDefault}>恢復預設題目</button>
          <button type="button" className="admin-primary" onClick={save}>儲存並套用到展場</button>
        </div>
      </header>
      {message && <p className={`admin-message is-${message.kind}`} role="status">{message.text}</p>}

      <section className="admin-card">
        <h2><span>1</span>題目與答案</h2>
        <label className="admin-field">上一位觀眾的問題（站 0 封在彈珠裡，站 1 打開）
          <input value={question} onChange={(event) => setQuestion(event.target.value)} />
        </label>
        <label className="admin-field">答案（站 4 一塊一塊壓出來，站 5 完整顯示）
          <textarea rows={3} value={answer} onChange={(event) => setAnswer(event.target.value)} />
        </label>
        <div className="admin-row">
          <label className="admin-inline">切字方式
            <select value={mode} onChange={(event) => setMode(event.target.value as CutMode)}>
              <option value="word">以詞為單位（好讀，示意）</option>
              <option value="o200k">真實 GPT-4o tokenizer（o200k，中文常一字一塊）</option>
            </select>
          </label>
          <button type="button" disabled={!tokenizer} onClick={autoCut}>{tokenizer ? "自動切字" : "tokenizer 載入中……"}</button>
        </div>
        <label className="admin-field">問題的切法（用「|」分開，可以手動調整）
          <input value={questionPieces} onChange={(event) => setQuestionPieces(event.target.value)} />
        </label>
        <label className="admin-field">答案的切法（用「|」分開，每一塊就是壓一次泵冒出來的字）
          <textarea rows={3} value={answerPieces} onChange={(event) => setAnswerPieces(event.target.value)} />
        </label>
        <button type="button" className="admin-primary" disabled={!tokenizer} onClick={generate}>產生每一站</button>
        <p className="admin-hint">「產生每一站」會重新排好下面站 1 到站 5 的內容（覆蓋目前的修改）。</p>
      </section>

      <section className="admin-card">
        <h2><span>站 1</span>切字：句子裂成這幾塊，翻面後是編號</h2>
        <div className="admin-chips">
          {tokens.map((token) => (
            <span key={token.id} className="admin-chip"><b>{token.text}</b><small>#{token.tokenId}{tokenizer && tokenizer.pieces(token.text).length > 1 ? `（示意；o200k 是 ${tokenizer.pieces(token.text).join("·")}）` : ""}</small></span>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2><span>站 2</span>向量：要鎖定的字，和它們的線索字</h2>
        <p className="admin-hint">勾選觀眾要鎖定的字（依勾選順序，最多 4 個）。每個字最近的 3 個字就是線索，會在答案裡發亮，所以建議填答案裡出現的詞。改完按「重新排星空」。</p>
        <table className="admin-table">
          <thead><tr><th>鎖定</th><th>字</th><th>順序</th><th>線索字（用、分開）</th></tr></thead>
          <tbody>
            {uniqueContent.map((token) => {
              const order = draft.vectorSpace.lockOrder.indexOf(token.id);
              return (
                <tr key={token.id}>
                  <td><input type="checkbox" checked={order >= 0} onChange={() => toggleLock(token.id)} aria-label={`鎖定 ${token.text}`} /></td>
                  <td>{token.text}</td>
                  <td>{order >= 0 ? order + 1 : "—"}</td>
                  <td>{order >= 0 ? <input value={neighborText[token.id] ?? ""} onChange={(event) => setNeighborText({ ...neighborText, [token.id]: event.target.value })} aria-label={`${token.text} 的線索字`} /> : <span className="admin-muted">（不鎖定）</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="admin-row">
          <button type="button" onClick={() => relayout()}>重新排星空</button>
          <span className="admin-muted">至少鎖 {draft.vectorSpace.minLocks} 個才能前進 · 星空背景字 {draft.vectorSpace.words.length} 個</span>
        </div>
      </section>

      <section className="admin-card">
        <h2><span>站 3</span>注意力：關鍵字、權重和白話解釋</h2>
        <p className="admin-hint">每一列是「這個字去看其他字」的比例，存檔時自動調成加起來 100%。打勾的是觀眾要找的關鍵字，解釋會在指針停到它時出現。</p>
        <div className="admin-scroll">
          <table className="admin-table admin-weights">
            <thead><tr><th>關鍵字</th><th>由誰去看 ↓ / 被看 →</th>{tokens.map((token) => <th key={token.id}>{token.text}</th>)}<th>最在意</th></tr></thead>
            <tbody>
              {tokens.map((row) => {
                const values = draft.attention.weights[row.id] ?? [];
                const total = values.reduce((sum, value) => sum + value, 0) || 1;
                const top = topOther({ ...draft, attention: { ...draft.attention, weights: { ...draft.attention.weights, [row.id]: values.map((value) => value / total) } } }, row.id);
                return (
                  <tr key={row.id}>
                    <td><input type="checkbox" checked={draft.attention.keywordTokenIds.includes(row.id)} onChange={() => toggleKeyword(row.id)} aria-label={`${row.text} 是關鍵字`} /></td>
                    <th scope="row">{row.text}</th>
                    {values.map((value, index) => (
                      <td key={index}><input type="number" min={0} max={100} step={1} value={Math.round((value / total) * 100)} onChange={(event) => setWeight(row.id, index, Number(event.target.value))} aria-label={`${row.text} 看 ${tokens[index]?.text}`} /></td>
                    ))}
                    <td className="admin-muted">{top ? `${top.text} ${Math.round(top.weight * 100)}%` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setDraft({ ...draft, attention: { ...defaultAttention(tokens, draft.attention.keywordTokenIds), notes: draft.attention.notes } })}>依關鍵字重算預設權重</button>
        {draft.attention.keywordTokenIds.map((id) => {
          const token = tokens.find((item) => item.id === id);
          return (
            <label key={id} className="admin-field">「{token?.text}」的白話解釋（可留空）
              <input value={draft.attention.notes?.[id] ?? ""} onChange={(event) => setDraft({ ...draft, attention: { ...draft.attention, notes: { ...draft.attention.notes, [id]: event.target.value } } })} />
            </label>
          );
        })}
      </section>

      <section className="admin-card">
        <h2><span>站 4・5</span>生成與輸出</h2>
        <p className="admin-hint">觀眾要壓 {draft.answer.tokens.length} 次泵。發亮的是站 2 線索字（觀眾全部鎖定時）。</p>
        <p className="admin-answer">
          {draft.answer.tokens.map((piece, index) => <span key={index} className={hits.some((hit) => piece.includes(hit.word)) ? "is-hit" : ""}>{piece}</span>)}
        </p>
        <p className="admin-muted">{hits.length ? `會發亮：${hits.map((hit) => `${hit.word}（←${hit.from}）`).join("、")}` : "目前沒有線索字出現在答案裡，建議到站 2 把答案裡的詞填成線索。"}</p>
      </section>
    </main>
  );
}

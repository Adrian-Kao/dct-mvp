import { useEffect, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";

export function TokenizationScene() {
  const { state, dispatch, scenario } = useExperience();
  const [phase, setPhase] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);
  useEffect(() => {
    if (state.scenePhase !== "ready") return;
    const scale = state.settings.reducedMotion ? 0.2 : 1;
    const timers = [
      window.setTimeout(() => setPhase(1), 500 * scale),
      window.setTimeout(() => setPhase(2), 1350 * scale),
      window.setTimeout(() => setPhase(3), 2350 * scale),
      window.setTimeout(() => { setFocused(null); setPhase(4); }, 4550 * scale),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [state.sceneInstanceId, state.scenePhase, state.settings.reducedMotion]);
  return (
    <div className={`scene-shell tokenization-shell token-phase-${phase}`}>
      <SceneHeading eyebrow="站 1 · TOKENIZATION 切字" title="AI 不是一個字一個字讀，而是一塊一塊讀。" />
      <MissionCard
        station="站 1 · 切字"
        task="看系統把問題切成一小塊一小塊（token），每一塊再換成一個數字編號。"
        steps={[
          { text: "看句子在哪裡被切開", done: phase >= 2 },
          { text: "每一塊翻面，變成數字編號（token ID）", done: phase >= 3 },
          { text: "按「帶著編號前往站 2」", done: false },
        ]}
        learned="AI 讀到的不是文字，而是一串編號。切在哪裡由 tokenizer 決定；同一個字（人）永遠是同一個編號。"
        showLearned={phase >= 3}
      />
      <div className="token-workbench" data-entry-target="true" data-entry-order="1">
        <p className="token-question" aria-hidden={phase >= 2}>{scenario.question}</p>
        <div className="scan-line" aria-hidden="true" />
        <div className="token-row" aria-label={`${scenario.inputTokens.length} 個 token`}>
          {scenario.inputTokens.map((token, index) => (
            <button
              type="button"
              key={token.id}
              className="token-chip"
              data-transition-item="true"
              data-transition-id={token.id}
              data-transition-role="retained"
              data-transition-source="dom"
              onMouseEnter={() => setFocused(token.id)}
              onMouseLeave={() => setFocused(null)}
              onFocus={() => setFocused(token.id)}
              onBlur={() => setFocused(null)}
            >
              <span>{token.text.startsWith(" ") && <i aria-hidden="true">␠</i>}{token.text.trim() || token.text}</span>
              <small>{phase >= 3 ? `#${token.tokenId}` : "　"}</small>
              {focused === token.id && <em role="tooltip">第 {index + 1} / {scenario.inputTokens.length} 塊 · 「{token.text}」→ 編號 {token.tokenId}</em>}
            </button>
          ))}
        </div>
      </div>
      <div className="scene-controls" data-entry-target="true" data-entry-order="4">
        <button type="button" className="primary-button" disabled={phase < 4 || state.scenePhase !== "ready"} onClick={() => dispatch({ type: "REQUEST_TRANSITION", target: "vector" })}>帶著編號前往站 2</button>
      </div>
    </div>
  );
}

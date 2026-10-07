import { useEffect, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
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
      window.setTimeout(() => dispatch({ type: "REQUEST_TRANSITION", target: "vector" }), 5200 * scale),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [dispatch, state.sceneInstanceId, state.scenePhase, state.settings.reducedMotion]);
  return (
    <div className={`scene-shell tokenization-shell token-phase-${phase}`}>
      <SceneHeading eyebrow="02 · FIXED SEGMENTATION" title="A sentence becomes visible units." description="這一站完全自動；查看任一片段不會改變後續。" />
      <div className="token-workbench">
        <p className="token-question">{scenario.question}</p>
        <div className="scan-line" aria-hidden="true" />
        <div className="token-row" aria-label="六個固定示意文字單位">
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
              <small>{token.id}</small>
              {focused === token.id && <em role="tooltip">示意單位 {index + 1} / {scenario.inputTokens.length} · 原始片段「{token.text}」</em>}
            </button>
          ))}
        </div>
      </div>
      <p className="scene-note">此處為固定切分示意，實際 tokenizer 的切分可能不同。</p>
      <p className="interaction-hint">無需操作 · 系統將自動前往概念空間</p>
    </div>
  );
}

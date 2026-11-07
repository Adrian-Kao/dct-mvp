import { useCallback, useEffect, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";

type InputPhase = "idle" | "holding" | "transcript" | "transferring";

export function InputScene() {
  const { state, dispatch, scenario } = useExperience();
  const [phase, setPhase] = useState<InputPhase>("idle");
  const [longEnough, setLongEnough] = useState(false);
  const [message, setMessage] = useState("按住手機上的圓形按鈕，接下這個問題。");
  const startedAt = useRef(0);
  const holdTimer = useRef<number | null>(null);
  const transferTimer = useRef<number | null>(null);
  const submitted = useRef(false);

  const cancelHolding = useCallback((hint = "已取消，請再按住一下。") => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    startedAt.current = 0;
    setLongEnough(false);
    setPhase((current) => current === "holding" ? "idle" : current);
    setMessage(hint);
  }, []);

  useEffect(() => {
    const handleBlur = () => cancelHolding("輸入已安全取消，請重新按住。");
    const handleVisibility = () => document.hidden && cancelHolding("輸入已安全取消，請重新按住。");
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
      if (transferTimer.current) window.clearTimeout(transferTimer.current);
    };
  }, [cancelHolding]);

  const begin = () => {
    if (phase !== "idle" || state.scenePhase !== "ready" || submitted.current) return;
    startedAt.current = performance.now();
    setPhase("holding");
    setLongEnough(false);
    setMessage("繼續按住……");
    holdTimer.current = window.setTimeout(() => {
      setLongEnough(true);
      setMessage("放開以送出");
    }, 600);
  };

  const finish = () => {
    if (phase !== "holding" || submitted.current) return;
    const duration = performance.now() - startedAt.current;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (duration < 600) {
      cancelHolding("按得太短了，請再按住一下。");
      return;
    }
    submitted.current = true;
    setPhase("transcript");
    setMessage("問題已接下，準備進入站 1。");
    dispatch({ type: "INPUT_CONFIRMED" });
    transferTimer.current = window.setTimeout(() => {
      setPhase("transferring");
      dispatch({ type: "REQUEST_TRANSITION", target: "tokenization" });
    }, state.settings.reducedMotion ? 350 : 1200);
  };

  return (
    <div className="scene-shell input-shell">
      <SceneHeading eyebrow="站 0 · INPUT 入口" title="有人問了一個問題。" />
      <MissionCard
        station="站 0 · 入口"
        task="從現在起，你是一個語言模型。你手上的問題不是你的，是上一位觀眾留下的。"
        steps={[
          { text: "按住手機上的圓形按鈕", keys: ["按住"], done: phase !== "idle" },
          { text: "看到「放開送出」再放開", done: phase === "transcript" || phase === "transferring" },
        ]}
        learned="接下來你不是問問題的人，而是回答問題的 AI。"
        showLearned={phase === "transcript" || phase === "transferring"}
      />
      <div className={`phone-frame phase-${phase}`} data-entry-target="true" data-entry-order="1">
        <div className="phone-speaker" />
        <div className="phone-screen">
          <p className="phone-brand">BEFORE THE ANSWER</p>
          {(phase === "transcript" || phase === "transferring") ? (
            <div className="input-transcript">
              <span>上一位觀眾的問題</span>
              <strong data-transition-item="true" data-transition-id="input-question" data-transition-role="retained" data-transition-source="dom">{scenario.question}</strong>
            </div>
          ) : (
            <>
              <div className={`waveform${phase === "holding" ? " is-active" : ""}`} aria-hidden="true">
                {Array.from({ length: 19 }, (_, index) => <i key={index} style={{ "--wave-index": index } as React.CSSProperties} />)}
              </div>
              <button
                type="button"
                className={`hold-button${longEnough ? " is-ready" : ""}`}
                aria-label="按住提問"
                onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); begin(); }}
                onPointerUp={finish}
                onPointerCancel={() => cancelHolding()}
                onKeyDown={(event) => {
                  if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); begin(); }
                }}
                onKeyUp={(event) => {
                  if (event.key === " " || event.key === "Enter") { event.preventDefault(); finish(); }
                }}
              >
                <span>{longEnough ? "RELEASE" : "HOLD"}</span>
                <small>{longEnough ? "放開送出" : "按住提問"}</small>
              </button>
            </>
          )}
        </div>
      </div>
      <p className="interaction-hint" role="status" data-entry-target="true" data-entry-order="3">{message}</p>
    </div>
  );
}

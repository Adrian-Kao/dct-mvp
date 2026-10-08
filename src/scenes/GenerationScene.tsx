import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { selectAnswer } from "../app/selectors";
import { SceneHeading } from "../components/SceneHeading";
import { buildGenerationLoopSteps, loopStepDuration } from "../data/generationLoop";

export function GenerationScene() {
  const { state, dispatch, scenario } = useExperience();
  const answer = selectAnswer(state, scenario);
  const remainingText = answer?.remainingText ?? "";
  const [steps] = useState(() => buildGenerationLoopSteps(remainingText));
  const scope = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HTMLDivElement>(null);
  const transferRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const step = steps[state.generation.stepIndex];
  const visibleCount = Math.min(answer?.remainingText.length ?? 0, state.generation.visibleCharacterCount);
  const visible = answer?.remainingText.slice(0, visibleCount) ?? "";
  const lastAppended = steps.find((item) => item.endCharacter === visibleCount);

  useLayoutEffect(() => {
    if (state.scenePhase !== "ready" || !remainingText || !step || !scope.current || !trackRef.current || !engineRef.current || !transferRef.current || !measureRef.current) return;
    const meta = { runId: state.runId, sceneInstanceId: state.sceneInstanceId };
    const duration = loopStepDuration(step.index, state.settings.reducedMotion);
    const stageRect = trackRef.current.getBoundingClientRect();
    const engineRect = engineRef.current.getBoundingClientRect();
    const targetRect = measureRef.current.getClientRects()[0] ?? measureRef.current.getBoundingClientRect();
    const startX = engineRect.left + engineRect.width / 2 - stageRect.left;
    const startY = engineRect.top + engineRect.height / 2 - stageRect.top;
    const targetX = targetRect.left + Math.min(8, targetRect.width / 2) - stageRect.left;
    const targetY = targetRect.top + targetRect.height / 2 - stageRect.top;
    const orb = transferRef.current;
    const predictRings = scope.current.querySelectorAll(".loop-predict-ring");
    const feedback = scope.current.querySelector<HTMLElement>(".loop-feedback-route");
    const resolved = scope.current.querySelector<HTMLElement>(".loop-resolved-dot");
    gsap.set(orb, { x: startX, y: startY, opacity: 0, scale: 0.35 });
    gsap.set(resolved, { opacity: 0, scale: 0.3 });
    const timeline = gsap.timeline();
    timeline.call(() => dispatch({ type: "GENERATION_SET_PHASE", phase: "context", meta }));
    timeline.to(feedback, { opacity: 0.45, duration: duration * 0.1 });
    timeline.call(() => dispatch({ type: "GENERATION_SET_PHASE", phase: "predict", meta }));
    timeline.fromTo(predictRings, { opacity: 0.12, scale: 0.72 }, { opacity: 0.84, scale: 1, duration: duration * 0.2, stagger: duration * 0.025, ease: "power2.out" });
    timeline.call(() => dispatch({ type: "GENERATION_SET_PHASE", phase: "resolve", meta }));
    timeline.to(predictRings, { opacity: 0.16, scale: 0.66, duration: duration * 0.1, stagger: duration * 0.018 });
    timeline.to(resolved, { opacity: 1, scale: 1, duration: duration * 0.08, ease: "back.out(2)" }, "<");
    timeline.call(() => dispatch({ type: "GENERATION_SET_PHASE", phase: "send", meta }));
    timeline.set(orb, { opacity: 1, x: startX, y: startY, scale: 0.55 });
    timeline.to(orb, { x: targetX, y: targetY, scale: 1, duration: duration * 0.27, ease: "power2.inOut" });
    timeline.call(() => dispatch({ type: "GENERATION_APPEND_STEP", stepIndex: step.index, visibleCharacterCount: step.endCharacter, meta }));
    timeline.call(() => dispatch({ type: "GENERATION_SET_PHASE", phase: "append", meta }));
    timeline.to(orb, { opacity: 0.9, scale: 1.7, duration: duration * 0.06, ease: "power2.out" });
    timeline.call(() => dispatch({ type: "GENERATION_SET_PHASE", phase: "feedback", meta }));
    timeline.to(orb, { x: startX, y: startY, opacity: 0.12, scale: 0.4, duration: duration * 0.15, ease: "power2.in" });
    timeline.to(feedback, { opacity: 0.9, duration: duration * 0.05 });
    if (step.index === steps.length - 1) {
      timeline.call(() => dispatch({ type: "GENERATION_COMPLETED", meta }));
      timeline.to({}, { duration: state.settings.reducedMotion ? 0.16 : 0.8 });
      timeline.call(() => dispatch({ type: "REQUEST_TRANSITION", target: "output" }));
    } else {
      timeline.call(() => dispatch({ type: "GENERATION_ADVANCE_STEP", stepIndex: step.index + 1, meta }));
    }
    const handleVisibility = () => document.hidden ? timeline.pause() : timeline.resume();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); timeline.kill(); };
  }, [dispatch, remainingText, state.generation.stepIndex, state.runId, state.sceneInstanceId, state.scenePhase, state.settings.reducedMotion, step, steps]);

  if (!answer) return <InvalidState />;
  const beforeHighlight = lastAppended ? visible.slice(0, lastAppended.startCharacter) : visible;
  const highlighted = lastAppended ? visible.slice(lastAppended.startCharacter) : "";
  const progress = answer.remainingText.length ? visibleCount / answer.remainingText.length : 1;
  return (
    <div ref={scope} className="scene-shell generation-shell" data-loop-phase={state.generation.loopPhase} data-loop-step={state.generation.stepIndex}>
      <SceneHeading eyebrow="06 · PREDICTION LOOP" title="NOW WATCH IT REPEAT." description={<>你剛才選出的內容，會成為接下來每一步的上下文。<small className="loop-disclaimer">固定文字片段的生成示意；不是即時模型運算。</small></>} />
      <div className="generation-loop-stage" ref={trackRef}>
        <section className="loop-engine" ref={engineRef} aria-label="固定資料循環引擎" data-entry-target="true" data-entry-order="1" data-transition-item="true" data-transition-id="generation-engine" data-transition-role="chrome" data-transition-source="dom">
          <div className="loop-context-core"><i /><span>CONTEXT</span></div>
          <div className="loop-predict-ring ring-a" /><div className="loop-predict-ring ring-b" /><div className="loop-predict-ring ring-c" />
          <div className="loop-resolved-dot" aria-hidden="true" />
          <div className="loop-feedback-route" aria-hidden="true" />
        </section>
        <section className="loop-text-panel" data-entry-target="true" data-entry-order="2">
          <article className="generation-copy" data-transition-item="true" data-transition-id="generation-answer" data-transition-role="retained" data-transition-source="dom" data-transition-slices="5">
            <span className="selected-prefix">{answer.selectedPrefix}</span><span>{beforeHighlight}</span>{highlighted && <mark>{highlighted}</mark>} {!state.generation.complete && <i className="typing-caret" aria-hidden="true" />}
          </article>
          {step && <article className="generation-copy loop-measure" aria-hidden="true"><span className="selected-prefix">{answer.selectedPrefix}</span><span>{visible}</span><span ref={measureRef}>{step.rawText}</span></article>}
        </section>
        <div className="loop-transfer-dot" ref={transferRef} aria-hidden="true" />
      </div>
      <ol className="loop-step-labels" aria-label="循環順序" data-entry-target="true" data-entry-order="3">
        {(["predict", "send", "append", "feedback"] as const).map((phase, index) => <li key={phase} className={state.generation.loopPhase === phase || (phase === "feedback" && state.generation.loopPhase === "context") ? "is-active" : ""}>{["PREDICT", "APPEND", "UPDATE CONTEXT", "REPEAT"][index]}</li>)}
      </ol>
      <div className="generation-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, progress * 100)}%` }} /></div>
      <p className="interaction-hint">{state.generation.complete ? "完整文字已回流至上下文" : `循環 ${Math.min(state.generation.stepIndex + 1, steps.length)} / ${steps.length}`}</p>
      {state.generation.complete && <p className="sr-only" aria-live="polite">完整回答：{answer.fullAnswer}</p>}
    </div>
  );
}

function InvalidState() {
  const { dispatch } = useExperience();
  return <div className="scene-shell error-shell" role="alert"><h1>這條路徑尚未完成</h1><p>Generation 需要一個已確認的主焦點和兩次文字選擇。</p><button type="button" className="primary-button" onClick={() => dispatch({ type: "RESET_EXPERIENCE" })}>重新開始</button></div>;
}

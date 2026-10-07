import { useEffect, useRef, useState, type ReactNode } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { sceneLabels, sceneOrder } from "../app/sceneOrder";
import { SimulationInfo } from "./SimulationInfo";
import { PresenterPanel } from "./PresenterPanel";

interface Props {
  children: ReactNode;
  renderer2d: boolean;
  visual: ReactNode;
  transfer: ReactNode;
}

export function StageFrame({ children, renderer2d, visual, transfer }: Props) {
  const { state, dispatch } = useExperience();
  const [infoOpen, setInfoOpen] = useState(false);
  const infoButton = useRef<HTMLButtonElement>(null);
  const stageIndex = sceneOrder.indexOf(state.scene) + 1;
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "d" && !event.repeat) {
        event.preventDefault();
        dispatch({ type: "TOGGLE_PRESENTER" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dispatch]);
  const closeInfo = () => {
    setInfoOpen(false);
    window.setTimeout(() => infoButton.current?.focus(), 0);
  };
  return (
    <main
      id="stage-root"
      className={`stage quality-${state.settings.quality}${state.settings.reducedMotion ? " reduced-motion" : ""}`}
      data-renderer={renderer2d ? "fallback" : "webgl"}
      data-transition-phase={state.transitionVisualPhase}
      data-transition-mode={state.transitionMode ?? undefined}
    >
      {visual}
      <div className="stage-vignette" aria-hidden="true" />
      <header className="stage-header">
        <a href="#scene-content" className="skip-link">跳到場景內容</a>
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <span>BEFORE THE ANSWER</span>
        </div>
        <div className="stage-progress" aria-label={`第 ${stageIndex} 幕，共 8 幕`}>
          <span>{sceneLabels[state.scene]}</span>
          <strong>{String(stageIndex).padStart(2, "0")} <i>/ 08</i></strong>
        </div>
        <div className="header-actions">
          <button ref={infoButton} type="button" onClick={() => setInfoOpen(true)}>關於這個示意</button>
          <button type="button" onClick={() => dispatch({ type: "TOGGLE_PRESENTER" })}>演示工具 <kbd>D</kbd></button>
        </div>
      </header>
      <section id="scene-content" className={`scene-layer scene-${state.scene}`} data-phase={state.scenePhase}>
        {children}
      </section>
      {transfer}
      <footer className="stage-footer">
        <span>互動示意・預設資料</span>
        <span>{renderer2d ? "目前使用低效能示意模式" : state.settings.reducedMotion ? "減少動態模式" : "本機互動演示"}</span>
      </footer>
      <div className="size-warning" role="status">建議使用 1280×720 以上視窗；目前仍可繼續操作。</div>
      <SimulationInfo open={infoOpen} onClose={closeInfo} />
      {state.settings.presenterOpen && <PresenterPanel key={`${state.scene}-${state.sceneInstanceId}`} />}
    </main>
  );
}

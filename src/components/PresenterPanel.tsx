import { useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import type { RouteId } from "../data/scenarioTypes";
import { sceneLabels, sceneOrder, type SceneId } from "../app/sceneOrder";
import { QualityControls } from "./QualityControls";

export function PresenterPanel() {
  const { state, dispatch, scenario } = useExperience();
  const [scene, setScene] = useState<SceneId>(state.scene);
  const [route, setRoute] = useState<RouteId>("emotion");
  return (
    <aside className="presenter-panel" aria-label="演示工具">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">PRESENTER</p>
          <h2>演示工具</h2>
        </div>
        <button type="button" className="icon-button" aria-label="關閉演示工具" onClick={() => dispatch({ type: "TOGGLE_PRESENTER", open: false })}>×</button>
      </div>
      <label>
        <span>場景</span>
        <select value={scene} onChange={(event) => setScene(event.target.value as SceneId)}>
          {sceneOrder.map((id, index) => <option key={id} value={id}>{String(index + 1).padStart(2, "0")} · {sceneLabels[id]}</option>)}
        </select>
      </label>
      <label>
        <span>安全預設路線</span>
        <select value={route} onChange={(event) => setRoute(event.target.value as RouteId)}>
          {scenario.routes.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.labelZh}</option>)}
        </select>
      </label>
      <button type="button" className="primary-button" onClick={() => dispatch({ type: "LOAD_PRESENTER_FIXTURE", scene, routeId: route, scenario })}>跳至所選場景</button>
      <div className="panel-actions">
        <button type="button" onClick={() => dispatch({ type: "REPLAY_SCENE", scenario })}>重播當幕</button>
        <button type="button" onClick={() => dispatch({ type: "RESET_EXPERIENCE" })}>重新開始</button>
      </div>
      <QualityControls />
      <p className="panel-note">快捷鍵 D 開／關。直接跳到後段會使用演示預設路徑，並在 Summary 清楚標示。</p>
    </aside>
  );
}

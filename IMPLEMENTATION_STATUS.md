# IMPLEMENTATION STATUS

記錄日期：2026-10-08（Asia/Taipei）
範圍：`Before_the_Answer_MVP_Integrated_Upgrade.md` 六項 P0 整合升級

## 結果摘要

六項 P0 已完成。固定 `scenario.json`、三條回答路線、27 個 `buildAnswer` 結果、兩輪使用者選擇、八幕順序、Summary、Presenter、Reset、WebGL、2D fallback 與低動態模式均保留；沒有加入模型、麥克風、攝影機、後端、Model choose、模型首選或人機比較。

所有進場現在共用：

`blackSwap → blackHold → enteringCore → centerHold → expanding → ready`

在 `blackSwap / blackHold / enteringCore / centerHold` 期間，`stage-blackout` 以純黑 `#000` 覆蓋背景、DOM、Canvas、Drei Html、標題、按鈕、頁尾與場景 chrome；唯一可見的場景元素是同一顆主傳送光點及拖尾。抵達 normalized `(0.5, 0.5)` 後，資料粒子由中央飛向實際量測的接收區域，目標內容在粒子到達時依序生成，header/footer 最後出現。

## 六項 P0

### 1. Tokenization 原句殘留

- `token-question` 在六張卡片接管後改為 `opacity: 0`、`visibility: hidden`、`pointer-events: none`，並同步 `aria-hidden`。
- 離場快照只有六張 token 卡片是 retained，不會形成第七顆資料點。
- 重播因 scene instance remount 會從原句重新開始。
- 證據：`artifacts/integrated-upgrade/2d-token-00-six-cards-no-source.png`；自動檢查 computed style 與六卡數量。

### 2. 未選字詞消散後重新出現

- retained／discarded／chrome 沿用快照資料契約；discarded 從 `resolvingChoice` 外散後，在 `compacting` 起永久 `visibility: hidden`，直到舊場景被交換，不再回到普通 opacity。
- DOM 候選、Attention 節點、Vector 2D 控制、WebGL node/line 與 Prediction 粒子均使用單調狀態；被選資料才收縮並匯入中央。
- 既有 reducer 的 pending choice、transition id、run id 與 scene instance 守門仍防止連點和舊 callback。
- 證據：`2d-prediction-r1-01-unselected-outward.png`、`02-selected-compact.png`、`03-selected-to-center.png`；E2E 在 compacting 驗證未選候選為 hidden。

### 3. Attention 座標與版面錯位

- SVG viewBox 改為 Attention map 的實際 pixel width/height；端點取每個 button 的實際 bounding-box center，不再混用百分比 y 與 `0 0 100 80`。
- 使用 `ResizeObserver`、window resize 與 `document.fonts.ready` 重算；線條 `pointer-events: none`。
- 節點 border 固定 2px，只換顏色，不因選取造成版面位移。
- Attention shell 分為標題、map、bottom controls 三區，移除負 margin 重疊。
- 實測 1280×720、1366×768、1440×900、1920×1080，所有五條線端點誤差皆 `≤ 3px`。
- 證據：`2d-attention-geometry-1920x1080.png`。

### 4. Prediction 資料依序流入字詞並被吸收

- WebGL 粒子從三個入口流向中央、壓縮，再依候選 1→2→3 的 stagger wave 分流。
- `.candidate-word` 的實際 DOM 中心會經 camera unproject 轉成 WebGL z=0 world target；resize 時重算。2D 使用相同 DOM bounding boxes，不再使用固定候選座標。
- 每群抵達字詞時 tail、depth 與 brightness 歸零，粒子消失、字詞點亮；沒有等待期間的無限 orbit 或 respawn。
- `awaitingChoice` 只由最後一批 absorption 完成 callback 觸發，PredictionScene 不再用另一個 distribution timer 提前開放。
- Round 2 使用 Round 1 約 65% 時長。等待一秒後 2D 粒子 computed opacity 全為 0。
- 證據：`2d-prediction-r2-00-wave-a.png`～`02-wave-c-absorb.png`、`webgl-prediction-00-distribution-a.png`～`02-absorbed-clean.png`。

### 5. 第 6 幕 Prediction Loop

- 舊的獨立 `GENERATION_TICK`／typing timer 已移除。
- `buildGenerationLoopSteps` 產生 deterministic `LoopStep`（rawText、start/end character）；前 3 輪慢速，其後 1.0→0.65→0.4 秒，再加速至 0.25 秒。
- 每一步由同一條 GSAP timeline 控制：context → predict → resolve → send → 抵達插入座標後 `GENERATION_APPEND_STEP` → feedback → 下一步。
- 傳送光點的座標以引擎－文字共同軌道的 bounding box 為基準，抵達隱藏 preview 中下一段 raw text 的實際排版位置才 append；回流完成才 advance step。
- 頁籤隱藏會 pause 同一 timeline；reset／scene identity 變更會 kill 舊 timeline。
- 27 條固定答案均通過 `steps.rawText.join("") === remainingText` 與 `selectedPrefix + remainingText === fullAnswer`。
- E2E MutationObserver 驗證同一步的 `predict → send → append → feedback` 順序，且所有文字長度增加只發生在 `append` 相位。
- 證據：`2d-loop-00-predict.png`～`04-output-ready.png`。

### 6. 所有新畫面的純黑進場與中央四散展開

- 初次 Input、一般換幕、Prediction R1→R2、R2→Generation、Presenter jump/replay、Summary restart 後的 Input 都走同一 entry controller。
- `TransferOrbOverlay` 新增 pure-black gate 與 36 個中央 scatter particles；場景以 `data-entry-target / data-entry-order` 指定接收區域。
- Canvas 與 Drei Html 位於 black gate 下方；視覺層在 expanding 開始才開啟，目標內容隨資料粒子抵達逐項生成，chrome 最後顯示。
- 舊主光點與拖尾完全越界後才 `blackSwap`；交換後仍只有同一顆主光點從入口回到舞台中心。
- Reduced Motion 與 2D 保留相同事件順序，只縮短時長。Presenter 緊急 Reset 仍立即讓舊 transition id 失效；Summary 不自動離場。
- 證據：Token `04`～`09`、Prediction 的 `black-before-* / center-before-* / *-scatter`，以及 `webgl-entry-00`～`02`。

## 主要修改檔案

- 狀態／資料契約：`src/app/experienceReducer.ts`、`src/data/generationLoop.ts`。
- 共用轉場：`src/motion/transitionTypes.ts`、`TransitionController.tsx`、`TransferOrbOverlay.tsx`。
- 場景：`src/scenes/InputScene.tsx`、`TokenizationScene.tsx`、`VectorScene.tsx`、`AttentionScene.tsx`、`PredictionScene.tsx`、`GenerationScene.tsx`、`OutputScene.tsx`、`SummaryScene.tsx`。
- WebGL／2D：`src/visual/PredictionParticles.tsx`、`StageCanvas.tsx`、`FallbackStage2D.tsx`、`BackgroundParticles.tsx`、`VectorWorld.tsx`、`visualConfig.ts`。
- 版面／進場標記：`src/components/SceneHeading.tsx`、`src/styles/globals.css`、`src/styles/stage.css`。
- 驗收：`src/tests/generationLoop.test.ts`、更新既有 reducer／interaction tests、`e2e/integrated-upgrade.spec.ts`、更新既有 E2E 與 `playwright.config.ts`。
- 新證據：`artifacts/integrated-upgrade/`。原有 `artifacts/transition-evidence/` 已保留，舊測試重跑會改寫至新證據目錄下的 `legacy-regression/`。

## 實際驗證結果

執行環境：Windows、Node.js 24.19.0、npm 11.17.0、Chromium 1366×768（Attention 另測四種 viewport）。

- `npm.cmd run typecheck`：通過，0 TypeScript errors。
- `npm.cmd run lint`：通過，0 ESLint errors/warnings。
- `npm.cmd run test`：通過，6 test files、16 tests。
- `npm.cmd run build`：通過；608 modules。輸出 JS 1,306.01 kB／gzip 369.35 kB，CSS 33.83 kB／gzip 8.35 kB。只有 Vite `>500 kB` bundle warning。
- `npm.cmd run test:e2e`：通過，10/10 Chromium tests，單 worker 2.7 分鐘。
- `e2e/integrated-upgrade.spec.ts`：4/4；實際播放 2D Token、四尺寸 Attention、2D Prediction + Loop、WebGL Prediction。
- `e2e/transition-visual.spec.ts` 最終針對共用轉場防護重跑：2/2；Tokenization 與兩輪 Prediction 的中央收束／傳送均通過。
- WebGL：確認單一持續 Canvas、有限 distribution、absorption 完成後可選、無外部 request；截圖為實際 Chromium／SwiftShader 畫面。
- 2D：完整八幕低動態路線、兩輪選擇、Generation Loop、Output、Summary 均走完；路線結果 `emotion:emotional:experiences`。
- Console：E2E 無 application error。單元測試有 Three CJS deprecation warning，來源為現有 R3F／Three 測試載入方式。
- `git diff --check`：通過；只有 Windows 全域 gitignore 權限與 LF→CRLF 提示，未影響專案。

## 證據位置

`artifacts/integrated-upgrade/` 目前包含 42 張 PNG（約 12.9 MB）與索引 README：

- Token chronological frames：`2d-token-00`～`09`。
- Prediction R1/R2 chronological frames：`2d-prediction-r1-*`、`2d-prediction-r2-*`。
- Prediction Loop chronological frames：`2d-loop-00`～`04`。
- WebGL：`webgl-entry-*`、`webgl-prediction-*`。
- Attention：`2d-attention-geometry-1920x1080.png`，另由同一測試程式實測四種尺寸。
- 舊轉場測試的新輸出：`legacy-regression/`。

這些不是終點截圖：檔名順序包含原位收縮、外散、向中央匯集、唯一核心、越界、純黑、入口、中央停留、向外資料束、目標生成、Prediction 三波吸收與 Loop 四個因果相位。

## 未驗證項目

- 未在最終展示筆電／實體投影機量測 GPU FPS、VRAM、熱降頻或顯示器殘影。
- 未跑 Safari、Firefox、行動瀏覽器與真實無 WebGL 硬體；2D fallback 已由 Chromium 強制模式驗證。
- 未注入真實 `webglcontextlost`，但切換 handler 與 2D 接續路徑保留。
- 未以螢幕閱讀器完成全流程人工走查；鍵盤、button/radio 語意與 focus path 有自動測試覆蓋。

## 已知限制

- Production JS bundle 約 1.31 MB，Vite 會提示超過 500 kB；本次依要求未批次升級或更換工具鏈。
- Headless Chromium WebGL 使用 SwiftShader，能驗證渲染與因果順序，不代表展示筆電的實際 GPU 效能。
- 2D fallback 保留相同座標、順序與吸收完成條件，但粒子深度層次刻意比 WebGL 簡化。
- Three.js CJS deprecation warning 來自現有相依組合；沒有 runtime error。

## 啟動與演示

開發模式：

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

開啟終端顯示的網址。強制 2D：在網址加 `?renderer=2d`。

Production：

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

演示順序：Input 長按 600ms → Tokenization 自動 → Vector 選 0–2 個或直接繼續 → Attention 選主焦點（輔助可不選）→ Prediction 兩輪自行選字 → Prediction Loop → Output → Summary。

按 `D` 開啟 Presenter，可安全跳場、選固定路線、重播、切換品質與 Reduced Motion。Summary「重新體驗」播放短版收束；Presenter「重新開始」是緊急 Reset，立即取消舊動畫並讓 Input 重新走黑場進場。

完整驗證：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

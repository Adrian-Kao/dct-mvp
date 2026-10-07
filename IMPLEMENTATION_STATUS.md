# IMPLEMENTATION STATUS

記錄日期：2026-10-07（Asia/Taipei）

## 已完成

- Vite + React + TypeScript 單頁專案、lockfile 與完整 scripts。
- 八幕端到端流程：Input、Tokenization、Vector、Attention、兩輪 Prediction、Generation、Output、Summary。
- 規格指定的唯一 `scenario.json`、載入時結構驗證、3 條路線、27 個 deterministic 完整答案與無損字串 chunking。
- Input 600 ms 長按／放開、Pointer Events、鍵盤、短按拒絕、blur／visibility／pointercancel 安全取消；無媒體 API。
- Tokenization 固定六片段、自動前進、hover／focus 資料提示。
- Vector 固定九節點 3D 空間、受限旋轉、最多兩個探索概念、零選擇繼續與 Attention 預覽映射。
- Attention 五節點、必選主焦點、可選且不可同項的輔助焦點、三路線映射與下游清理。
- Prediction 兩輪固定候選、候選權重、完整等待、低權重合法路徑、三層 seeded Points 粒子，包含湧入、中央收束、分流、環繞與選中收斂；沒有模型首選或人機比較。
- Generation 保留兩次選擇的 raw prefix，以保留空白的固定片段逐漸加速播放；Output 與 Summary 使用同一份解析結果。
- 持續存在的單一 R3F Canvas、GSAP 共用主光點 Overlay；正常模式先越界再 swap，低動態模式縮短移動。
- reducer 業務狀態、視覺 ref 分離；runId／sceneInstanceId／transitionId 守門、重複選擇 idempotency、reset 與 effect／timeline cleanup。
- Presenter 面板（`D`）：安全跳場、三路線 fixture、重播、reset、品質與減少動態控制。
- `prefers-reduced-motion`、可見減少動態控制、`?renderer=2d`、WebGL context lost 切換與可完成流程的 SVG 2D fallback。
- DOM button／radio 語義、focus 樣式、場景標題 focus、完成後一次性答案文字、說明面板與焦點返回。
- 全程示意標籤、限制說明、無外部字型／素材／API／analytics／登入／儲存。

## 統一中央光點轉場補丁（本次）

- 新增共用 `TransitionSnapshot`，以 `stageRoot` 的 normalized `(0.5, 0.5)` 為唯一核心座標，並明確分類 `retained`、`discarded`、`chrome`。
- 共用 `TransitionController` 現在依序執行 `locking → resolvingChoice（選擇型）→ compacting → converging → coreReady → exiting → swapping → entering → expanding`。舊場景完全離場後才交換資料／場景；下一幕由同一個 Overlay 主光點從對應入口進場。
- `TransferOrbOverlay` 在原資料位置建立小光粒；保留資料才匯入中央，未選資料由各自原位置向外散開且透明消失。核心、拖尾與代理粒子皆裁切於同一 `stageRoot`。
- Tokenization 的六張卡片各自在原位置變成六顆光粒後匯入核心；已移除卡片列下方舊光點，畫面不再同時存在舊光點與新核心。
- Vector 僅保留中央 `childhood` 與最多兩個已探索節點；Attention 僅在確認後保留主／輔焦點；其餘節點使用 discarded 路徑向外消散。
- Prediction 保留原本大量粒子湧入、中央壓縮與三候選分流。選擇後，2D 與 WebGL 粒子都讓未選群向外離開、所選群才往幾何中心 `(0, 0)`／DOM `(50%, 50%)` 收束；中性背景粒子同步淡出。
- Prediction 每輪只在 `PREDICTION_TRANSFER_SWAP` 交換點 append 一次。第一輪交換後仍是第 05 幕且展開第二輪；第二輪才交換到 Generation。沒有自動選最高權重、模型首選或人機比較。
- Input、Generation、Output 均使用同一收束管線；Generation 以三段可見文字區塊收束，不再只處理游標。Summary 保持靜止，只有「重新體驗」觸發短版收束；Presenter 的「重新開始」會立刻失效舊 callback 並取消 Overlay timeline。
- Reduced Motion 仍維持相同因果順序但縮短時長；2D fallback、WebGL、resize 後百分比定位、頁籤隱藏暫停、重播與 reset 均沿用同一轉場身分守門。

## 本次修改檔案

- 狀態與轉場核心：`src/app/experienceReducer.ts`、`src/motion/transitionTypes.ts`、`src/motion/sceneExitSnapshot.ts`、`src/motion/TransitionController.tsx`、`src/motion/TransferOrbOverlay.tsx`。
- 場景資料分類：`src/scenes/InputScene.tsx`、`TokenizationScene.tsx`、`VectorScene.tsx`、`AttentionScene.tsx`、`PredictionScene.tsx`、`GenerationScene.tsx`、`OutputScene.tsx`、`SummaryScene.tsx`。
- 視覺與 fallback：`src/visual/StageCanvas.tsx`、`BackgroundParticles.tsx`、`PredictionParticles.tsx`、`VectorWorld.tsx`、`FallbackStage2D.tsx`、`visualConfig.ts`、`src/styles/stage.css`。
- 框架與語意：`src/components/StageFrame.tsx`、`SceneHeading.tsx`、`CandidateButton.tsx`。
- 驗收：`src/tests/reducer.test.ts`、`src/tests/sceneExitSnapshot.test.ts`、`e2e/transition-visual.spec.ts`、`e2e/webgl.spec.ts`、`artifacts/transition-evidence/*`。

## 已執行驗證

執行環境：Windows、Node.js `v24.19.0`、npm `11.17.0`。

- `npm install`：成功；289 packages，`npm audit` 回報 0 vulnerabilities。
- `npm run typecheck`：通過，無 TypeScript 錯誤。
- `npm run lint`：通過，無 ESLint error／warning。
- `npm test`：通過，5 test files、15 tests。除原有 fixture、27 條資料邊、deterministic 答案、無損 chunk、reducer 守門與互動測試外，新增兩輪受控交換點單次 append、第一輪不增加階段、Summary 短版 restart／緊急 reset、snapshot normalized 中心與 retained／discarded／chrome 分類驗證。
- `npm run build`：通過；Vite production build 完成（607 modules）。輸出 1,294.49 kB JS／366.39 kB gzip、28.25 kB CSS／7.21 kB gzip。
- `npm run test:e2e -- --workers=1`：最終完整執行 6 tests，6/6 通過（約 1.1 分鐘）。包含低權重 `emotion:vivid:events` 路徑、identity Output 安全跳場／reset、完整八幕正常流程、Tokenization 統一轉場、Prediction 兩輪統一轉場，以及 WebGL 單 Canvas 粒子測試。
- 正常流程案以 1366×768、2D、減少動態，從 680 ms 模擬長按完整走過八幕；Vector 選 emotion／family、Attention 主 emotion／輔 family、Prediction 第二輪以鍵盤 Enter 提交，最後得到 `emotion:emotional:experiences` Summary。
- WebGL 案以 1366×768／SwiftShader 確認只有一個 Canvas、Prediction 粒子抵達可選狀態、無外部網路請求，並產生實際畫面截圖。
- 人工檢視 WebGL Prediction 1366×768 截圖：標題、固定前綴、三個候選、示意機率、三群粒子與操作提示均在可視範圍內，無按鈕裁切或文字被粒子遮蔽。
- Chromium 以 1366×768 實際播放並逐影格記錄轉場：Tokenization 六個來源光粒、Prediction 未選散出／所選收束、第一輪進入第二輪、第二輪進入 Generation 均通過。MutationObserver 驗證完整相位順序；`requestAnimationFrame` 取樣驗證 `coreReady` 主光點與舞台中心誤差小於 4 px，且右向離場 normalized x 超過 `1.0` 後才交換。
- 已人工檢視 `artifacts/transition-evidence/` 的 Tokenization、Prediction 兩輪與 WebGL 連續截圖；不只保留終點，包含原始卡片／候選、原位光粒、向中央匯集、未選外散、核心離場、下一幕入口與展開畫面。
- Playwright console error 收集：2D E2E 無 console error。WebGL E2E 無 error；Vite 開發伺服器記錄到 Three.js `Clock` deprecation warning（來自目前 R3F／Three 依賴組合，未影響測試）。

## 未執行驗證

- 尚未在最終實體展示筆電與實際投影／螢幕上量測 FPS、GPU 記憶體或長時間熱降頻。
- 尚未人工逐一檢視 1920×1080、1440×900、1280×720 的每一幕；1366×768 已由 Chromium E2E 與 Prediction 截圖檢查。
- 尚未在 Safari、Firefox 或真實低階／無 WebGL 硬體跑完整流程；2D fallback 由 Chromium 的強制參數驗證。
- 尚未做真實 WebGL context-loss 注入測試、瀏覽器頁籤長時間背景／恢復與連續三輪 GPU 資源 profiling。
- 尚未由螢幕閱讀器完整走查；語義、焦點與鍵盤路徑已實作並部分自動驗證。
- 尚未用高速錄影量測 0.18–0.25 秒核心停留的實體螢幕殘影；瀏覽器內相位與座標已自動逐影格驗證。

## 已知問題／P1

- Production JS 單一 bundle 約 1.28 MB，Vite 會提示超過 500 kB；本機單頁演示可用，但後續可將 Three／Presenter 區塊做 lazy split。
- Headless WebGL 使用 Chromium SwiftShader，只能驗證功能與畫面，不能代表展示筆電的實際粒子效能。
- Three.js `Clock` deprecation warning 來自 R3F 目前內部用法；沒有 console error 或功能失敗，後續依相容版本升級處理。
- 2D fallback 保留完整資料分支與互動，但光流層次刻意比 WebGL 簡化。
- P1 未實作：自動導覽、完整暫停、路徑 JSON 匯出、音效、瀏覽器列印、高級 Bloom／Shader。
- 規格明確排除且未實作：真手機、多螢幕同步、模型／AI API、麥克風、攝影機、後端、真實列印。

## 啟動與演示

首次安裝：

```powershell
npm.cmd install
```

開發模式：

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

開啟終端顯示的本機網址。production 驗證可依序執行：

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

正常演示從 Input 按住 600 ms 開始；Tokenization 自動前進；Vector 可選 0–2 個概念；Attention 選主焦點（輔助可不選）；Prediction 兩輪各自行選一個候選；Generation、Output 到 Summary。Summary 的「重新體驗」會播放短版收束後重置。

按 `D` 開啟演示工具，可安全跳場、切換固定路線、重播當幕、調整品質／減少動態。「重播當幕」會產生新的 run／scene identity；「重新開始」是緊急 Reset，立即取消進行中的轉場。需要強制 2D fallback 時使用 `http://127.0.0.1:5173/?renderer=2d`（連接埠以 Vite 終端輸出為準）。

逐幀證據位於 `artifacts/transition-evidence/`；自動重跑命令：

```powershell
npx.cmd playwright test e2e/transition-visual.spec.ts --workers=1
```

# Before the Answer — Interactive MVP

《Before the Answer》是一個單機、單頁、固定資料的互動敘事原型。觀眾把預設問題送入系統，依序經過 Tokenization、Vector、Attention（轉盤）、Generation（壓泵）、Output 與 Summary。它不執行語言模型，也不使用麥克風、後端或遠端 API。站 0 會用攝影機在本機辨識臉部節點（MediaPipe Face Landmarker），只保留節點座標、不拍照、不上傳，重新開始即刪除；觀眾也可以選「不掃描、用預設影像」。

## 環境與啟動

本次實作與驗證使用：

- Node.js `24.19.0`、npm `11.17.0`
- React `19.3.0`、React DOM `19.3.0`
- React Three Fiber `9.8.1`、Drei `10.7.9`
- Three.js `0.186.1`、GSAP `3.15.0`
- Vite `8.3.3`、TypeScript `6.0.3`

專案宣告 Node.js `>=20.19.0`。安裝與啟動：

```bash
npm install
npm run dev
```

Vite 會輸出本機網址，通常是 `http://localhost:5173`。Production build 與預覽：

```bash
npm run build
npm run preview
```

正常演示只使用已打包的本地程式與系統字型，不需要外網。

臉部辨識的模型放在 `public/models/face_landmarker.task`（約 3.7 MB，已進版控）。WASM 檔在 `npm run dev` / `npm run build` 前由 `scripts/copy-mediapipe-wasm.mjs` 自動從 `node_modules` 複製到 `public/mediapipe/wasm`（不進版控），所以換電腦後先跑一次 `npm install`。`index.html` 設了 `connect-src 'self'`，頁面只能連本機；這也擋掉 MediaPipe 內建送往 Google 的使用紀錄。

攝影機只在 `localhost` 或 https 下能開；`npm run preview -- --host` 用區網 IP 開會被瀏覽器擋，此時請在展示電腦本機開。

## 建議演示路徑

題目是腳本範例「為什麼人會想念一個人？」。每一站右上角有任務卡，寫著你的任務、操作步驟和完成後「你剛剛學到」的一句話。鍵盤暫時代替實體裝置。

1. 站 0 入口：按「開始掃描」（第一次會詢問鏡頭權限）或「不掃描、用預設影像」。掃描光線由上而下掃過、臉變成節點並浮出模型編號後，點選發光的彈珠 token。上方進度帶亮起，你的編號飛到站 1。問題要到站 1 才會打開。
2. 站 1 切字（切西瓜）：句子從下方被拋到空中。按住滑鼠像揮刀一樣劃過句子（或按 `Space` 揮一刀，代替手持陀螺儀）。只有刀落在 tokenizer 的切縫上才會裂開；劈在字中間，或劈在同一個 token 裡（例如「想｜念」）會彈開，並提示該試哪條縫。鍵盤沒辦法瞄準，所以每按一次就切下一條真的切縫。6 刀切完後，字片掉到下方翻面變成 token 編號（兩個「人」是同一個編號），按「帶著編號前往站 2」。
3. 站 2 向量化：`←` `→` 轉動星空（也可拖曳或按 ◀ ▶），星空上方的提示會寫目標字和「往左／往右轉幾格」，照著轉到目標字進入中間的光帶（光帶變金色），按 `Space` 或「鎖定」。鎖定後會拉出最近的 3 個字，線越短越亮。依序鎖定 想念 → 人 → 為什麼 → 一個，至少 2 個、最多 4 個。
4. 站 3 注意力：`←` `→` 轉動轉盤，指針停在哪個字，圓餅與連線就顯示這個字對其他字的注意力比例。關鍵字（為什麼、想念、人）都轉過後，只留下最粗的 3 條線。
5. 站 4 生成：`Space` 或 `↓` 壓泵，每壓一下冒一個水泡，水泡破掉時答案長一塊；停止壓泵，生成就停住。
6. 站 5 輸出：顯示完整答案；點「查看這次的路徑」進入回顧收據。

所有按鈕支援鍵盤焦點、Enter／Space。右上角可開啟說明。

## 演示工具

按 `D` 或右上角「演示工具」開啟面板。面板可：

- 指定七個場景之一並安全跳轉；
- 重播當幕或重新開始；
- 切換 Low／Medium／High 品質；
- 開關「減少動態」。

跳到 Generation 時會補齊已完成的 Attention，壓泵仍需現場操作；跳到 Output 或 Summary 時會注入完整答案，Summary 會標示「演示預設路徑」。一般進度文字不能跳場。

可用 `?renderer=2d` 強制 2D 降級模式，例如 `http://localhost:5173/?renderer=2d`。WebGL 無法使用或 context lost 時也會改用相同業務狀態的 2D 視覺。

## 固定資料與修改位置

- 固定問題、7 個示意 token 與編號、站 2 星空（`vectorSpace`：問題字的位置、121 個背景字、鎖定順序；每個鎖定字最近的 3 個字會變成「線索袋」，在站 4、站 5 的答案裡標出來）、Attention 權重表（`attention.weights`，每列加總為 1）、關鍵字與答案 token 序列（`answer.tokens`）：`src/data/scenario.json`
- JSON 結構與載入驗證：`src/data/scenarioTypes.ts`、`src/data/validateScenario.ts`
- 注意力最強連線與答案組合：`src/data/attention.ts`
- 星空投影、光帶對準判定與最近鄰：`src/data/vectorSpace.ts`
- reducer、事件守門與 stale callback 防護：`src/app/experienceReducer.ts`
- selectors：`src/app/selectors.ts`

`answer.tokens` 的開頭空白是組句資料，請勿在 JSON 中移除。畫面顯示使用 `trim()`，答案組合保留原始字串。

## 視覺與時間軸調整

- 粒子品質、水泡上浮秒數與跨場景秒數：`src/visual/visualConfig.ts`
- seeded 粒子資料與路徑：`src/visual/seededRandom.ts`、`src/visual/particlePaths.ts`
- 背景 Canvas 與 2D fallback：`src/visual/StageCanvas.tsx`、`src/visual/FallbackStage2D.tsx`（站 2 星空在 `src/scenes/VectorScene.tsx`，兩種模式畫面相同）
- 跨場景主光點：`src/motion/TransitionController.tsx`
- 版面、響應式與低動態樣式：`src/styles/stage.css`

Medium 預設約 1,600 粒子，Low 約 600，High 約 2,400。減少動態時仍保留轉盤與壓泵互動，但減少粒子量並縮短大幅移動。

## 檢查指令

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright 第一次執行若本機尚無 Chromium runtime，需先執行：

```bash
npx playwright install chromium
```

本次實際結果與尚未驗證項目記錄在 `IMPLEMENTATION_STATUS.md`。

## 模擬範圍與限制

本 MVP 的 token 切分、概念位置、關聯線、候選示意機率和答案全部是預設資料。它不是真實 tokenizer、embedding、attention tensor、logits、模型推理或內部思考紀錄。粒子數量不代表參數量、算力或計算次數；Generation 的節奏也不代表模型速度。

真手機、多螢幕、語音、攝影機、模型、後端、資料庫、跨裝置同步與實體列印皆未實作。

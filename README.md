# Before the Answer — Interactive MVP

《Before the Answer》是一個單機、單頁、固定資料的互動敘事原型。觀眾把預設問題送入系統，依序經過 Tokenization、Vector、Attention（轉盤）、Generation（壓泵）、Output 與 Summary。它不執行語言模型，也不使用麥克風、攝影機、後端或遠端 API。

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

## 建議演示路徑

1. 在 Input 手機畫面按住圓形按鈕至少 0.6 秒；出現「放開以送出」後放開。這只是模擬波形，不會要求麥克風權限。
2. Tokenization 自動播放。可 hover 或 focus 六個示意文字單位查看資料，但無需操作。
3. Vector 拖曳空白區旋轉空間，選 `emotion` 與 `family`；最多兩個，也可零選擇繼續。
4. Attention（站 3）用鍵盤 `←` `→` 模擬轉盤，一次一格。指針停在哪個字，圓餅與上方連線就顯示「這個字看其他字」的注意力比例；也可以直接點字或按畫面上的 ◀ ▶。三個關鍵字（humans、remember、childhood）都轉過後，只留下最粗的 3 條線，才能按「帶著重點前進」。
5. Generation（站 4）用 `Space` 或 `↓` 模擬壓泵，也可以按「壓一下」。每壓一下冒出一個水泡，水泡浮到水面破掉時，答案往後長一個 token；停止壓泵，生成就停住。最後一個水泡破掉後自動進入 Output。
6. Output 顯示完整回答；點「查看這次的路徑」進入 Summary，核對探索、轉盤走過的字、最強 3 條連線、壓泵次數、answerId 與全文。

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

- 固定問題、六個示意 token、Vector 位置、Attention 權重表（`attention.weights`，每列加總為 1）、關鍵字與答案 token 序列（`answer.tokens`）：`src/data/scenario.json`
- JSON 結構與載入驗證：`src/data/scenarioTypes.ts`、`src/data/validateScenario.ts`
- 注意力最強連線與答案組合：`src/data/attention.ts`
- reducer、事件守門與 stale callback 防護：`src/app/experienceReducer.ts`
- selectors：`src/app/selectors.ts`

`answer.tokens` 的開頭空白是組句資料，請勿在 JSON 中移除。畫面顯示使用 `trim()`，答案組合保留原始字串。

## 視覺與時間軸調整

- 粒子品質、水泡上浮秒數與跨場景秒數：`src/visual/visualConfig.ts`
- seeded 粒子資料與路徑：`src/visual/seededRandom.ts`、`src/visual/particlePaths.ts`
- 單一持續 Canvas、Vector 3D、2D fallback：`src/visual/StageCanvas.tsx`、`src/visual/VectorWorld.tsx`、`src/visual/FallbackStage2D.tsx`
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

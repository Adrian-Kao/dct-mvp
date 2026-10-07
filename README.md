# Before the Answer — Interactive MVP

《Before the Answer》是一個單機、單頁、固定資料的互動敘事原型。觀眾把預設問題送入系統，依序經過 Tokenization、Vector、Attention、兩輪 Prediction、Generation、Output 與 Summary。它不執行語言模型，也不使用麥克風、攝影機、後端或遠端 API。

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
4. Attention 將 `emotion` 設為主焦點、`family` 設為輔助焦點，再讓資訊前進。主焦點決定候選資料；輔助焦點只影響光流與紀錄。
5. Prediction 先等待粒子完成湧入、收束與分流。第一輪選 `emotional`，第二輪選 `experiences`。三個候選都可選，沒有系統首選或正誤。
6. Generation 保留剛選的前綴並加速播放固定後續；Output 會安靜顯示同一份完整回答。
7. 點「查看這次的路徑」進入 Summary，核對探索、主／輔焦點、兩次文字選擇、answerId 與全文。

所有按鈕支援鍵盤焦點、Enter／Space。右上角可開啟說明。

## 演示工具

按 `D` 或右上角「演示工具」開啟面板。面板可：

- 指定八個場景之一並安全跳轉；
- 選擇 emotion、cognition 或 identity 預設路線；
- 重播當幕或重新開始；
- 切換 Low／Medium／High 品質；
- 開關「減少動態」。

直接跳到 Generation、Output 或 Summary 時會注入完整合法 fixture，Summary 會標示「演示預設路徑」。跳到 Prediction 只補齊已確認的 Attention，兩輪文字仍需現場選擇。一般進度文字不能跳場。

可用 `?renderer=2d` 強制 2D 降級模式，例如 `http://localhost:5173/?renderer=2d`。WebGL 無法使用或 context lost 時也會改用相同業務狀態的 2D 視覺。

## 固定資料與修改位置

- 固定問題、六個示意 token、Vector 位置、Attention 映射、候選、權重與回答段落：`src/data/scenario.json`
- JSON 結構與載入驗證：`src/data/scenarioTypes.ts`、`src/data/validateScenario.ts`
- 27 條 deterministic 回答組合：`src/data/buildAnswer.ts`
- 演示跳場預設路徑：`src/data/presenterFixtures.ts`
- reducer、事件守門與 stale callback 防護：`src/app/experienceReducer.ts`
- selectors：`src/app/selectors.ts`

候選 `text` 的開頭空白是組句資料，請勿在 JSON 中移除。畫面顯示使用 `trim()`，答案組合保留原始字串。

## 視覺與時間軸調整

- 粒子品質、候選錨點、Prediction 與跨場景秒數：`src/visual/visualConfig.ts`
- seeded 粒子資料與路徑：`src/visual/seededRandom.ts`、`src/visual/particlePaths.ts`
- Prediction 三層 Points 粒子：`src/visual/PredictionParticles.tsx`
- 單一持續 Canvas、Vector 3D、2D fallback：`src/visual/StageCanvas.tsx`、`src/visual/VectorWorld.tsx`、`src/visual/FallbackStage2D.tsx`
- 跨場景主光點：`src/motion/TransitionController.tsx`
- 版面、響應式與低動態樣式：`src/styles/stage.css`

Medium 預設約 1,600 粒子，Low 約 600，High 約 2,400。減少動態時仍保留分流和兩輪選擇，但減少粒子量並縮短大幅移動。

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

# Before the Answer｜互動演示 MVP 開發規格

> **文件用途：交給 Codex 實作，不是讓 Codex 再寫一份企劃。**
> 版本：1.0｜日期：2026-10-07｜目標：單台筆電、單一網頁、固定資料、可操作的完整體驗。
> 本文件中的設計數值是 MVP 初始設定，不是已完成的效能測試結果。

## 00. 給 Codex 的執行指令

請先完整閱讀本文件，再檢查目前目錄與既有專案規範，實作《Before the Answer》的可運行前端 MVP。不要只交付 wireframe、靜態截圖、簡報、計畫或沒有連起來的元件。

若專案已存在，沿用相容的工具與目錄，保留使用者既有檔案；不要為了套模板清空專案。若目錄為空，建立本文件指定的 Vite + React + TypeScript 專案。依「開發順序」完成 P0，並實際執行能執行的檢查。遇到工具或執行環境限制，明確記錄，不得假稱已通過測試。

本文件是完整需求來源。先完成端到端流程與所有分支，再完成粒子高潮和轉場，最後補操作回饋、降級與驗收。一般視覺細節可自行合理決定；不得重新引入已排除的功能。無須為非阻塞的美術選項停下來追問。

### 不可變更的需求

| 項目 | 本版決定 |
|---|---|
| 使用情境 | 組員在一台筆電觀看與操作，理解未來展場流程與觀眾介入位置。 |
| 輸入 | 畫面中的手機介面；按住按鈕，播放模擬波形；放開顯示固定問題。 |
| 模型 | **完全不串接模型，不呼叫 AI API，不在瀏覽器下載或執行模型。** |
| 語音／鏡頭 | **不使用真麥克風、不錄音、不做語音辨識、不啟用攝影機。** |
| 資料 | 問題、示意 token、概念位置、權重、候選文字、回答皆預設。 |
| Tokenization | 自動拆解，不能手動切割；hover／focus 只能查看。 |
| Vector | 可旋轉概念空間、選擇探索節點；不任意改寫向量座標。 |
| Attention | 觀眾選主焦點，決定後續預設候選資料；可另選輔助焦點。 |
| Prediction | 兩輪可操作的候選文字選擇；**不得顯示 Model choose、Model would choose、模型首選或人機比較。** |
| 視覺高潮 | Prediction 必須有大量光點湧入、匯聚、分流、等待選擇、選定後收斂。 |
| 跨場景 | 光點飛出目前畫面邊界後才切場，從下一畫面的另一側進入。 |
| 顯示器 | 一個全畫面舞台，不做七格儀表板，也不需要實體多螢幕同步。 |
| 結果 | 不同合法選擇對應不同的預設完整回答；不能最後全部回到同一篇。 |
| 結尾 | Output + 個人路徑 Summary；本版不接熱感應印表機。 |

文案主體為繁體中文；階段標題、固定問題、概念詞與候選文字使用英文，必要時附短中文提示。

---

## 01. MVP 目的與範圍

### 1.1 體驗命題

觀眾送出一個問題，看著代表資料的光點穿過不同處理階段。過程中，他先觀看、再探索、再分配關注，最後親自選擇下一個文字，然後放手讓預設生成動畫完成回答。

這是**以 AI 生成概念為題材的互動敘事原型**，不是模型內部真實活動的監視器。

主流程：

```text
INPUT → TOKENIZATION → VECTOR → ATTENTION
      → PREDICTION（選兩次）→ GENERATION → OUTPUT → SUMMARY
```

共 **8 個邏輯場景**；Input 與 Summary 也計入場景。這個數字不是實體 Monitor 數量，不要為了湊七台而增刪核心步驟。

### 1.2 成功的畫面感

整體像一件全螢幕互動裝置，不像一般聊天工具、表單網站或教育簡報。每幕的構圖與動態不同，但有同一顆主光點、同一套字體、同一條資料移動方向。

Prediction 是視覺高潮；Output 必須安靜而可讀。觀眾即使不理解 attention 或機率，也能看懂「大量資訊匯入，出現多種可能，自己選了一個，系統繼續往下」。

### 1.3 明確不做

不做登入、帳號、資料庫、後端、API key、真實 tokenizer、embedding 計算、attention tensor、softmax 計算、backpropagation、LLM 推理、攝影機辨識、真手機連線、多使用者排隊、跨裝置同步、真實列印、支付、實體投幣與部署帳號操作。也不要另建 CMS 或完整遊戲引擎。

可以本機開發並產生靜態網站建置結果；安裝依賴之後，正常演示不得依賴遠端服務、CDN 字體或線上素材。

### 1.4 誠實呈現的底線

在舞台不搶眼但可閱讀的位置持續顯示 `互動示意・預設資料`，並提供「關於這個示意」按鈕。

該說明需包含：

> 此演示使用預設資料，不執行語言模型。畫面中的 token 切分、三維位置、關聯線與候選機率皆為教學／藝術示意。Attention 站的選擇是在切換預寫內容，不是在修改真實模型權重。

具體限制：

- 不虛構數字型 token ID；使用 `t01` 等本地識別碼，標示「示意單位」。
- 候選百分比標示為「示意機率」，只是展示的三個候選內的正規化權重，不代表真實完整詞彙表。
- 三維節點位置是美術配置，不稱為真實 embedding 的三維投影。
- 光點數量、大小、速度不是參數量、算力或實際計算次數。
- 不把大量粒子匯聚說成 attention 單獨直接產生下一個 token；這段是後續處理與候選形成的視覺壓縮。Transformer 的機制可參考原論文，但本作品並不重建它。[R6]
- Generation 顯示的逐段文字是「預設文字片段」，不宣稱每個畫面片段都等於真實模型 token。
- 不加入真實思考紀錄或聲稱重播模型的內部思想。

---

## 02. 使用者輸入如何影響結果

這張表是功能與測試的共同依據。不要讓只有視覺效果的操作，偷偷影響答案。

| 場景 | 使用者輸入 | 即時回饋 | 對後續的影響 | 不會影響 |
|---|---|---|---|---|
| Input | 按住、放開模擬語音按鈕 | 波形與按鈕呼吸，固定問題出現 | 啟動一個新的演示流程 | 問題內容、token、回答路徑 |
| Tokenization | hover／鍵盤 focus 任一示意 token | 放大與顯示索引、文字片段 | 無；可不操作直接觀看 | token 切分、數量、順序與所有分支 |
| Vector | 拖曳旋轉；點選最多兩個概念 | 節點與連線變亮 | 記錄探索概念；只在 Attention 提供柔和提示 | 不自動選 Attention，不改任何候選權重或回答 |
| Attention | 指定一個主焦點；可指定一個不同的輔助焦點 | 主／輔線條強度改變 | **主焦點決定 routeId 與第一輪候選集合**；輔助焦點只影響光流與摘要 | 輔助焦點不產生額外答案分支 |
| Prediction 第 1 輪 | 點選一個候選文字 | 粒子收斂，文字追加到前綴 | **決定第 2 輪候選權重，並決定回答的形容詞與對應說明句** | hover 不改示意機率；不顯示模型首選 |
| Prediction 第 2 輪 | 點選一個候選文字 | 再次收斂，追加到前綴 | **決定回答名詞與對應說明句，完成 answerId** | 不會被後續偷偷改成另一個文字 |
| Generation | 無內容選擇 | 預設後續文字加速展開 | 承接確定的回答路徑，不再分支 | 不抽籤、不重新選路線 |
| Output | 閱讀；開啟路徑摘要 | 清楚顯示完整答案 | 無新的內容變更 | 不重寫答案 |
| Summary | 查看紀錄；重新體驗 | 收據／明信片式摘要 | 重新體驗清除本次選擇 | 不執行真實列印、不上傳資料 |

**因果鏈：**

```text
固定問題
  └─ Vector 探索 → 視覺提示與紀錄（不定答案）
       └─ Attention 主焦點 → routeId
            └─ Prediction 第一選擇 → 第二輪候選資料
                 └─ Prediction 第二選擇 → 固定完整回答
                      └─ Generation = 播放該回答
                           └─ Output／Summary = 同一份結果
```

所有合法路徑必須可重複：相同主焦點類別與相同兩次 Prediction 選擇，得到逐字相同的答案。不同 Vector 選擇或輔助焦點可以有不同紀錄，但不改變該答案。

---

## 03. 技術選型

### 3.1 指定方案

| 技術 | 本案用途 | 限制 |
|---|---|---|
| Vite + TypeScript | 開發、型別檢查與靜態建置 | 不需要 SSR 或 Next.js。 |
| React + React DOM | 場景 UI、互動、邏輯狀態 | 不用 React state 每幀更新每顆粒子。 |
| Three.js + React Three Fiber | Vector 空間、Prediction 粒子、深度與相機 | 根層僅保留一個持續存在的 Canvas。 |
| `@react-three/drei` | 少量 HTML 標籤與必要 3D 輔助工具 | 不使用會默默抓遠端字體／模型的預設資源。 |
| GSAP + `@gsap/react` | 進退場、跨場景光點、Prediction 分段時間軸 | 不再加入另一套主要動畫引擎。 |
| CSS／CSS Modules + SVG | 字體、版面、Attention 線條、波形、手機外框 | 不需要大型 UI 套件。 |
| React Context + `useReducer` | 小型狀態機、選擇紀錄、事件驗證 | 先不引入 Redux／XState 等額外架構。 |
| Vitest + Testing Library | 分支資料、狀態機、互動測試 | 所有 27 條回答分支要可驗證。 |
| Playwright | 能執行時做完整流程與畫面檢查 | 無瀏覽器環境時記錄限制，不假報成功。 |

R3F 官方文件指出 React 與 Fiber 的 major version 必須配對：React 19 搭 Fiber 9，React 18 搭 Fiber 8。新專案優先採 React 19 + Fiber 9，既有專案則維持相容組合；不要混裝。[R1]

Vite 官方指南目前列出 Node.js 20.19+／22.12+ 的相容門檻；實作時仍需檢查所安裝版本與模板的 `engines`。本案可優先使用符合依賴要求的 Node 22.12+ 或較新相容版本，不把版本號誤當為「最新版本」宣稱。[R2]

安裝後提交 lockfile，README 寫出實際使用的 Node、npm、React、Fiber、Three 與 GSAP 版本。不要依賴未鎖定的遠端匯入。

### 3.2 動畫分工

GSAP 管理「何時發生」，R3F 管理「本幀畫在哪裡」。DOM UI 管理可讀文字與可操作按鈕。

例如 GSAP 將 `visualParams.influxProgress` 從 0 動到 1，R3F 的 `useFrame` 讀取這個值，更新粒子的 buffer。不要同時讓 GSAP 和 `useFrame` 對同一個物件座標各自寫值。

使用 `useGSAP` 與 scoped context 清理動畫；在 click handler 內建立的 GSAP 動畫需透過 `contextSafe` 或等效的明確清理方式管理。[R3]

Three／R3F 的快速更新採 refs、可重用物件和 `useFrame`；避免每幀 `setState` 及反覆配置物件。這些是本案粒子架構的依據。[R4]

### 3.3 2D 與 3D 的分工

Input、Tokenization、Output、Summary：DOM／SVG 為主。

Vector：真正的簡單三維節點空間，沒有模型資產；可旋轉整個節點群。

Attention：固定可讀的 DOM／SVG 節點關係圖，加少量深度與光流；不另做複雜 3D 操作。

Prediction：真正的三維粒子＋穩定的 DOM 候選文字。候選文字不隨粒子旋轉，始終可讀、可鍵盤操作。

Generation：DOM 文字＋背景精簡粒子；不要每個字都變成獨立 3D mesh。

---

## 04. 視覺規範與舞台布局

### 4.1 整體調性

深色背景、發光文字與資料粒子、少量線條、空間深度。避免現成科幻儀表板、滿版小數字、無關裝飾與大面積玻璃卡片。

以下為可直接使用的初始設計 token；這是美術建議，非效能或標準要求：

```css
--bg: #080b12;
--surface: #111925;
--text: #edf3f8;
--muted: #a5b2c2;
--signal: #8eeaff;
--choice: #ffd28a;
--line: #304a5f;
--radius: 18px;
```

主資料光點為冷色；使用者選定狀態可使用暖色與實心外框。不能只靠顏色區別主焦點、輔助焦點和未選狀態，還要有文字與輪廓。

主光點建議約 12–18 CSS px 核心，加柔和光暈；這顆「敘事主光點」不同於背景的數百／數千顆裝飾粒子。

### 4.2 版面

主要驗收尺寸：1920×1080、1440×900、1366×768；1280×720 也應可完成流程。低於建議尺寸顯示不阻塞的提示，可自然調整版面，不讓重要按鈕被切掉。

- 全畫面舞台，以視窗尺寸為準，使用安全邊距，主要場景不依賴捲動。
- 頂部：作品名、階段名稱、目前進度 `01 / 08`。
- 中央：該階段主要視覺。
- 底部：一句操作提示、必要的確認／繼續按鈕。
- 右上角：說明與演示工具入口。
- Output／Summary 在短視窗允許內容區捲動，控制列保留可用。

字級以 `clamp()` 處理：場景標題約 36–64 px，主要問題約 28–44 px，候選文字約 24–34 px，一般提示 16–20 px，示意標籤不低於 12–14 px。字型使用本地 system stack，不新增外部字體請求。

### 4.3 每幕只保留一個主要任務

觀看幕不強迫多按一次；操作幕則必須有清楚的「現在可以做什麼」提示。不要把技術長文覆蓋在粒子高潮之上，長說明放進資訊面板。

---

## 05. 光點跨場景轉場規則

### 5.1 核心規則

**舊畫面的光點完全越過舞台邊界 → 切換場景內容 → 下一畫面出現同一顆光點。**

不能舊畫面還在移動就先換成新場景，也不能新畫面無故另長出一顆不相干的光點。

第一段手機輸入使用「向上送出」；後續主要使用「往右離開、由左進入」。Prediction 可在切入後增加多方向裝飾光流，但要保留一條主要的來路。

### 5.2 共用 Overlay

在所有場景上方維持一個 `TransferOrbOverlay`，以 DOM 元素呈現跨場景主光點。Overlay 不跟著 scene 元件卸載。

用舞台 normalized coordinates 儲存位置，`x=0..1`、`y=0..1` 為可見範圍。超出可見區域的座標可使用 `-0.10`、`1.10`。尺寸變更時依當下舞台尺寸換算，不寫死 1920 px。

### 5.3 預設轉場時間軸

| 階段 | 起始建議 | 行為 |
|---|---:|---|
| Lock | 立即 | 鎖定內容選擇，建立唯一 transitionId。 |
| Gather | 0.25 秒 | 目前資料／詞片匯入主光點。已完成收斂的 Prediction 可省略。 |
| Exit | 0.65 秒 | 光點加速飛至舞台外；舊內容降低亮度。 |
| Swap | 約 0.08 秒 | 只有光點不可見時才切換 scene；重設下一幕入場位置。 |
| Enter | 0.65 秒 | 主光點從另一側進入，帶出下一幕資料。 |
| Ready | 完成事件 | 下一幕開始自己的時間軸或開放互動。 |

這些秒數是動畫參數，不是製作工期。提供統一的 motion scale，減少動態模式另用淡入／淡出，不做穿越鏡頭。

### 5.4 各段出口／入口

| 從 → 到 | 出口 | 入口 |
|---|---|---|
| Input → Tokenization | 手機上方，最後越過舞台頂端 | 下一幕底部中央 |
| Tokenization → Vector | 右側中線 | 左側中線，進入中央節點 |
| Vector → Attention | 右側中線 | 左側，展開關係線 |
| Attention → Prediction | 主焦點光路匯向右側 | 左側主光流；之後增加上／下／遠方粒子 |
| Prediction → Generation | 第二次選定的詞片收成光點，從右側送出 | 左側進入答案文字起點 |
| Generation → Output | 完成句子旁的主光點向右移出 | 從左側進入並淡化，留下完整答案 |
| Output → Summary | 使用者點擊後，由答案末端向下送出 | 從摘要上方進入，帶出收據紙面 |

Summary 重新開始可使用短淡出返回 Input，不必假裝又做一次推理。

### 5.5 控制權與清理

只允許一個 `TransitionController` 修改當前場景。完成 callback 應同時驗證 `runId`、`sceneInstanceId`、`transitionId`；舊 callback 不得在 reset 或跳場後把觀眾拉回舊流程。重複 click 或按鍵不得重複轉場。

---

## 06. 逐幕實作規格

### Scene 0｜INPUT

**目標：模擬問題從手機送入系統。**

中央放一個簡潔的手機外框。螢幕內有作品名、圓形 `按住提問 / HOLD TO ASK` 按鈕，底部註明「演示輸入：不啟用麥克風」。可在手機外加入一行：「先把一個問題交給系統。」

狀態：`idle → holding → transcript → transferring`。

按住按鈕時，播放以數學波形產生的 SVG 條形動畫，不读取音量。達到 600 ms 後顯示「放開以送出」；少於 600 ms 放開則回到 idle，提示再按住一下。持續按住不自動送出；放開才送出固定問題。

針對滑鼠使用 Pointer Events 與 pointer capture。支援焦點在按鈕時，按住 Space／Enter、放開送出；忽略鍵盤自動重複事件。`pointercancel`、window blur 與離開頁面應取消 holding，不得卡在錄音狀態。

固定問題出現，停留約 1.2 秒。文字縮向一顆主光點；光點先向手機上緣移動，再越過整個舞台頂端，切入 Tokenization。問題不因按住時長改變。

驗收：沒有任何麥克風／攝影機權限提示；固定問題正確；短按不會誤送；重複放開不會開兩次流程。

### Scene 1｜TOKENIZATION

**目標：把完整句子轉成示意文字單位；這一幕完全自動。**

入場光點展開成問題，依序經過「完整句子 → 掃描線 → 固定切分 → 獨立文字片段 → 小光點」。整段初始約 4.5–5.5 秒，不要求手動切割或按下一步。

使用資料中的 `inputTokens`，不可隨機切字。保留每個 token 的原始文字與空白；將它們 join 後必須完全重建問題。

可以將空白以淡色 `␠` 作為查看時的輔助表示，但實際文字不能真的插入該符號。hover／focus 顯示「示意單位 2 / 6」、原始文字片段；`t02` 是本地識別碼，不是假造的模型 token ID。

切分預覽至少保留約 2 秒可觀察，再把六個示意單位轉成六個語義光點。裝飾粒子可以增加，但不得讓數量標示誤認為有更多輸入 token。

此幕旁注：`此處為固定切分示意，實際 tokenizer 的切分可能不同。`

驗收：完全不操作也能抵達 Vector；查看 token 不改變後續；離場後沒有殘留 tooltip。

### Scene 2｜VECTOR / EMBEDDING

**目標：用空間與距離讓人探索關聯，不讓人修改真實 embedding。**

中央 `childhood`，八個周邊概念使用固定三維位置。節點是小光點，文字面向觀眾。入場時先見到平面詞片，再緩慢拉開 z 軸與視差，顯示空間感。

操作提示：`拖曳旋轉空間，點選最多 2 個你想探索的概念。`

拖曳空白區域旋轉整個節點 group，而非單獨拖走一個詞。限制水平／垂直旋轉幅度，避免文字全部倒過來或看不到。點選節點會切換選取；最多選兩個。若已選兩個又點第三個，不自動替換，顯示「最多選 2 個，請先取消其中一個」。

拖曳移動超過 6 CSS px 時判定為旋轉，不在 pointerup 誤觸節點。可提供「重置視角」小按鈕；零選擇也能按「繼續」。

選取後，中央到該概念的連線變亮，有少量粒子沿線移動；最多兩個已探索概念顯示在底部。

選擇只記到 `exploredConceptIds`。下一幕依 `vectorPreviewMap` 給相關 Attention 節點一圈柔和的虛線提示，不預先填入主焦點。須可見 `前一站探索提示，不是已選焦點`。

驗收：可以旋轉、選／取消、無選擇繼續；不因 Vector 選不同而改變相同 Attention＋Prediction 的答案。

### Scene 3｜ATTENTION

**目標：觀眾決定這次希望強調的方向，選擇會有可追蹤的後果。**

上方固定問題；中間五個概念節點：emotion、brain、experience、identity、family。每個皆附短中文名稱。

操作分兩層但不做複雜表單：

1. 主焦點：必選一個，用 radiogroup 或等效的明確單選操作。
2. 輔助焦點：可選一個不同節點，可不選，用較小的選項列；不得與主焦點相同。

介面明示：`主焦點會決定接下來的候選文字；輔助焦點只影響光流與紀錄。`

主焦點設定後，其線條明亮、較粗；輔助焦點有中等亮度；其餘仍保留微弱連線，**不把其他資訊完全刪掉**。此強弱是視覺設定，不顯示為「模型 attention 權重」。

主焦點改變時，若原輔助焦點變成同一項，自動清除輔助焦點。只有按下「讓資訊繼續前進」才提交並轉場。未選主焦點時按鈕 disabled，旁邊有文字原因。

映射：emotion → emotion；brain／experience → cognition；identity／family → identity。主焦點不同但映射到同一類時，可得到相同候選組，Summary 仍保留實際選的詞。

確認後，亮線逐漸碎成光點，先沿主／輔光路流動，再向右側匯出，導入 Prediction 的粒子風暴。沒有輔助焦點時全部主光流走主方向；有輔助時可用約 75%／25% 的視覺份量，但不顯示成模型數值。

驗收：主焦點必選、輔助不可同項；無任何真實模型資訊；切換主焦點會正確重置下游選擇。

### Scene 4｜PREDICTION

**目標：整件 MVP 的高潮，讓資料風暴收斂成觀眾的兩次選擇。**

舞台上方有前綴：

```text
Humans remember childhood because
```

展示三個候選文字。每個候選有固定位置的文字按鈕、示意百分比與粒子吸引中心。不能出現模型首選、勝負、答對答錯、建議選項、預先勾選或「最高機率應該選」的提示。

第一輪以完整的粒子場景導入；第二輪用較短但清楚的重複，讓人知道「相同流程再來一次」。兩輪都必須等待使用者選擇，不可在互動版逾時自動選最高權重。

hover／focus 可以加亮輪廓、讓附近少量裝飾粒子繞行，**不得改百分比或重新計算分支**。click／Enter／Space 才提交。

選定後鎖定該輪。未選候選淡出，其粒子可崩解並轉向選中的字；觀眾所選即使權重較低，也有完整收斂效果。選中的 raw token 文字追加到前綴，不覆蓋或重排。

第二輪候選由第一輪的選擇查表取得；權重有實際不同，但全部是固定示意資料。第二輪完成後，顯示 `接下來，交給系統續寫。`，將新形成的光點送往 Generation。

這裡的「系統續寫」僅指播放預寫後續，不呼叫模型。粒子時間軸詳見下一節。

### Scene 5｜GENERATION

**目標：從觀眾慢速選擇，切換到系統快速完成文字的節奏。**

入場直接保留先前前綴＋兩個已選詞，例如：

```text
Humans remember childhood because emotional experiences
```

禁止清空它再換一個開頭。已選文字可短暫用暖色標記，其餘預設後續從右邊繼續出現。

自 `buildAnswer()` 取得唯一全文，僅播放 `fullAnswer.slice(selectedPrefix.length)` 的剩餘內容。使用能保留空格與標點的固定文字片段，讓片段 join 後等於 remaining text；不可用會丟失空格的 split/join。

初始約 90–120 ms 顯示一個片段，逐漸加速至約 35–55 ms。這是美術節奏，不宣稱是真實模型速度。背景以少量粒子循環與淡化的節點／連線符號提示重複運算，不把前幾幕全部重掛成多視窗。

不提供第三次內容選擇。完成後停留約 0.8 秒，讓光點離場再進 Output。不要加入暴閃、鏡頭抖動或不可閱讀的變形。

驗收：選擇前綴被完整保留；全部顯示完成後逐字等於 Output；沒有在動畫中隨機改變字句。

### Scene 6｜OUTPUT

**目標：強烈動態之後，回到安靜的閱讀。**

只留下問題、完整答案與簡單標題 `THE ANSWER`。背景光點收斂至極低量或停止；不再展示候選機率。

使用者可以閱讀，不自動跳 Summary。下方提供「查看這次的路徑」，點擊後才以主光點轉場進 Summary。主答案只用本案英文預設文案；不要自行添加未對齊分支的中文翻譯版。

角落仍有 `互動示意・預設資料` 與說明入口。這是藝術／教學示例回答，不呈現成經過科學驗證的記憶學解釋。

### Scene 7｜SUMMARY / TAKE AWAY

**目標：明確呈現哪些選擇真正留下了痕跡。**

中間是一張長收據／明信片式紙面，依序包含：固定問題、探索概念、主焦點、輔助焦點、兩次 Prediction 文字、answerId、完整回答。

同時以小字區分：

```text
探索：影響畫面提示與紀錄
主焦點與兩次預測：決定這條回答路徑
輔助焦點：影響光流與紀錄
```

沒有探索或輔助選項時顯示「未選擇」，不要補上系統捏造的偏好。P0 只需紙面預覽與「重新體驗」。JSON 匯出或瀏覽器列印可列 P1；不整合實體印表機。

重新體驗會清除選擇、回答、hover、舊時間軸，回到乾淨的 Input。可保留低動態／品質等裝置設定，但不保留上一位觀眾的路徑。

---

## 07. Prediction 的粒子高潮詳細規格

### 7.1 第一輪分段

| 內部 phase | 初始時長 | 視覺行為 | 可以選候選嗎？ |
|---|---:|---|---|
| `arrival` | 0.5 秒 | Attention 主光流從左進入；前綴在上方穩定出現。 | 否 |
| `influx` | 1.8 秒 | 大量粒子由左、上下側與深處湧入；速度與密度逐漸上升。 | 否 |
| `compression` | 0.9 秒 | 粒子經過中央收束區，形成旋流或流線，避免只像散亂星空。 | 否 |
| `distribution` | 1.2 秒 | 三個候選文字出現；粒子向三個固定吸引中心分流。 | 否 |
| `awaitingChoice` | 無限等待 | 流速放慢，顯示百分比與操作提示；候選穩定可讀。 | **是** |
| `commit` | 0.8 秒 | 選中的文字獲得主光流，其餘淡出；百分比不偷偷改值。 | 否 |
| `append` | 0.45 秒 | 選中詞片飛進前綴，留下字串；下一輪準備。 | 否 |

第二輪把 `arrival/influx/compression/distribution` 總長縮短至約 1.5 秒；仍保留無限的 `awaitingChoice` 和完整 `commit/append`。兩次使用者選擇都不可省略。

### 7.2 粒子層次

至少有三層視覺：遠處慢速細點、中景主光流、近景少量較大拖尾。近景不要掃過候選文字的正面；文字所在區域留閱讀空間。

同一幕的粒子可經歷「湧入 → 收束 → 分流 → 環繞 → 向所選收斂」。不必模擬真實物理，使用可控路徑插值即可。不要為了引力效果寫全粒子兩兩作用的 O(N²) 系統。

候選粒子份額可依示意權重決定；這是視覺編碼，不是實際模型運算。權重顯示與粒子份額要大致一致，但不可把粒子數量當作精確科學量。

### 7.3 權重與選擇回饋

按畫面從左到右對應 fixture 中的候選順序；不因權重高低重新排序，更不要自動把最大值置中。三個字同樣可點，選擇沒有正誤。

進入 `awaitingChoice` 才顯示百分比。第一次播放先有視覺，再有數字，避免整幕變成統計圖表。

例如 emotion 第一輪展示 `emotional 46% / meaningful 32% / vivid 22%`。使用者選 vivid 後，畫面仍然把 22% 視為原本的示意權重，不把它突然改成「模型 100% 信心」。收斂代表**使用者已提交**，不是模型信心變成百分之百。

### 7.4 核心品質門檻

觀眾尚未點選時，必須明顯看見「大量資料湧入並分到不同候選」。只在 click 後噴一次粒子、不做前段湧入，視為未完成。

至少有一條能從 Attention 視覺延續到 Prediction 的主光路。任意背景星空、下雪效果、滑鼠尾巴不能替代這個效果。

---

## 08. 固定資料與分支設計

### 8.1 規模

固定一個問題；Attention 映射三條主路線；每條路線第一輪三個候選；每個第一選擇都有三個第二輪候選。

因此有 **3 × 3 × 3 = 27 個完整回答結果**。以固定段落拼接組成，不需要手工寫 27 個互不關聯的頁面。

Attention 五個主焦點可映射到三條路線；輔助焦點與 Vector 探索不增加內容分支，避免組合爆炸。

### 8.2 唯一資料來源

下列 JSON 應存為 `src/data/scenario.json` 或等價的型別化資料檔。候選文字與回答文案不得分散硬編碼在多個場景。

`text` 開頭的空白必須保留；畫面按鈕可顯示 `text.trim()`，組句時只能使用原始 `text`。

`weight` 是本地示意權重，三個候選各組合計 1。所有說明段落是本 MVP 的預寫示例，不視為學術主張或即時 AI 輸出。

```json
{
  "id": "childhood-v1",
  "question": "Why do humans remember childhood?",
  "questionZh": "人類為什麼會記得童年？",
  "answerPrefix": "Humans remember childhood because",
  "seed": 72931,
  "tokensAreIllustrative": true,
  "probabilitiesAreIllustrative": true,
  "inputTokens": [
    {
      "id": "t01",
      "text": "Why"
    },
    {
      "id": "t02",
      "text": " do"
    },
    {
      "id": "t03",
      "text": " humans"
    },
    {
      "id": "t04",
      "text": " remember"
    },
    {
      "id": "t05",
      "text": " childhood"
    },
    {
      "id": "t06",
      "text": "?"
    }
  ],
  "vectorNodes": [
    {
      "id": "childhood",
      "label": "childhood",
      "position": [
        0,
        0,
        0
      ],
      "selectable": false
    },
    {
      "id": "emotion",
      "label": "emotion",
      "position": [
        -2.5,
        1.2,
        0.4
      ],
      "selectable": true
    },
    {
      "id": "family",
      "label": "family",
      "position": [
        -1.4,
        -1.5,
        1.2
      ],
      "selectable": true
    },
    {
      "id": "identity",
      "label": "identity",
      "position": [
        1.8,
        1.4,
        -0.5
      ],
      "selectable": true
    },
    {
      "id": "brain",
      "label": "brain",
      "position": [
        2.6,
        -0.6,
        0.2
      ],
      "selectable": true
    },
    {
      "id": "experience",
      "label": "experience",
      "position": [
        0.2,
        -1.8,
        -1.1
      ],
      "selectable": true
    },
    {
      "id": "memory",
      "label": "memory",
      "position": [
        -0.7,
        2.0,
        -1.3
      ],
      "selectable": true
    },
    {
      "id": "school",
      "label": "school",
      "position": [
        -2.2,
        -0.3,
        -1.6
      ],
      "selectable": true
    },
    {
      "id": "growth",
      "label": "growth",
      "position": [
        1.2,
        0.2,
        1.8
      ],
      "selectable": true
    }
  ],
  "vectorPreviewMap": {
    "emotion": "emotion",
    "family": "family",
    "identity": "identity",
    "brain": "brain",
    "experience": "experience",
    "memory": "brain",
    "school": "experience",
    "growth": "experience"
  },
  "attentionOptions": [
    {
      "id": "emotion",
      "label": "emotion",
      "labelZh": "情緒",
      "routeId": "emotion"
    },
    {
      "id": "brain",
      "label": "brain",
      "labelZh": "認知",
      "routeId": "cognition"
    },
    {
      "id": "experience",
      "label": "experience",
      "labelZh": "經驗",
      "routeId": "cognition"
    },
    {
      "id": "identity",
      "label": "identity",
      "labelZh": "自我認同",
      "routeId": "identity"
    },
    {
      "id": "family",
      "label": "family",
      "labelZh": "家庭關係",
      "routeId": "identity"
    }
  ],
  "routes": [
    {
      "id": "emotion",
      "labelZh": "情緒觀點",
      "round1": [
        {
          "id": "emotional",
          "text": " emotional",
          "weight": 0.46
        },
        {
          "id": "meaningful",
          "text": " meaningful",
          "weight": 0.32
        },
        {
          "id": "vivid",
          "text": " vivid",
          "weight": 0.22
        }
      ],
      "round2ByFirst": {
        "emotional": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.48
          },
          {
            "id": "moments",
            "text": " moments",
            "weight": 0.32
          },
          {
            "id": "events",
            "text": " events",
            "weight": 0.2
          }
        ],
        "meaningful": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.37
          },
          {
            "id": "moments",
            "text": " moments",
            "weight": 0.43
          },
          {
            "id": "events",
            "text": " events",
            "weight": 0.2
          }
        ],
        "vivid": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.29
          },
          {
            "id": "moments",
            "text": " moments",
            "weight": 0.36
          },
          {
            "id": "events",
            "text": " events",
            "weight": 0.35
          }
        ]
      },
      "leadSuffix": " can connect the past with feelings that still matter in the present.",
      "firstTailByFirst": {
        "emotional": "This view focuses on the feelings associated with a memory, rather than treating the past as a neutral record.",
        "meaningful": "This view focuses on why an experience matters to the person remembering it, not simply on when it happened.",
        "vivid": "This view focuses on the details that feel especially present when someone returns to a memory."
      },
      "secondTailBySecond": {
        "experiences": "The emphasis here is on what an experience means to someone now.",
        "moments": "The emphasis here is on a small moment that carries personal meaning.",
        "events": "The emphasis here is on an event and the feelings attached to it."
      }
    },
    {
      "id": "cognition",
      "labelZh": "認知觀點",
      "round1": [
        {
          "id": "early",
          "text": " early",
          "weight": 0.42
        },
        {
          "id": "repeated",
          "text": " repeated",
          "weight": 0.35
        },
        {
          "id": "familiar",
          "text": " familiar",
          "weight": 0.23
        }
      ],
      "round2ByFirst": {
        "early": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.5
          },
          {
            "id": "events",
            "text": " events",
            "weight": 0.3
          },
          {
            "id": "routines",
            "text": " routines",
            "weight": 0.2
          }
        ],
        "repeated": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.26
          },
          {
            "id": "events",
            "text": " events",
            "weight": 0.24
          },
          {
            "id": "routines",
            "text": " routines",
            "weight": 0.5
          }
        ],
        "familiar": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.28
          },
          {
            "id": "events",
            "text": " events",
            "weight": 0.31
          },
          {
            "id": "routines",
            "text": " routines",
            "weight": 0.41
          }
        ]
      },
      "leadSuffix": " can give people a way to recognize change across time.",
      "firstTailByFirst": {
        "early": "This view uses early experience as a reference point for noticing what has changed and what still feels familiar.",
        "repeated": "This view draws attention to repetition: a route to school, a recurring activity, or an everyday pattern.",
        "familiar": "This view follows the contrast between something recognizable and something that feels new."
      },
      "secondTailBySecond": {
        "experiences": "The emphasis here is on connections between one experience and another.",
        "events": "The emphasis here is on relating particular events across time.",
        "routines": "The emphasis here is on recurring activities rather than a single exceptional event."
      }
    },
    {
      "id": "identity",
      "labelZh": "身分與關係觀點",
      "round1": [
        {
          "id": "personal",
          "text": " personal",
          "weight": 0.44
        },
        {
          "id": "shared",
          "text": " shared",
          "weight": 0.34
        },
        {
          "id": "formative",
          "text": " formative",
          "weight": 0.22
        }
      ],
      "round2ByFirst": {
        "personal": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.35
          },
          {
            "id": "stories",
            "text": " stories",
            "weight": 0.25
          },
          {
            "id": "memories",
            "text": " memories",
            "weight": 0.4
          }
        ],
        "shared": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.24
          },
          {
            "id": "stories",
            "text": " stories",
            "weight": 0.46
          },
          {
            "id": "memories",
            "text": " memories",
            "weight": 0.3
          }
        ],
        "formative": [
          {
            "id": "experiences",
            "text": " experiences",
            "weight": 0.52
          },
          {
            "id": "stories",
            "text": " stories",
            "weight": 0.2
          },
          {
            "id": "memories",
            "text": " memories",
            "weight": 0.28
          }
        ]
      },
      "leadSuffix": " can become part of the way people describe who they are.",
      "firstTailByFirst": {
        "personal": "This view connects the past with an individual story: the people, places, and experiences someone considers their own.",
        "shared": "This view connects the past with other people and with the stories they remember together.",
        "formative": "This view connects the past with experiences someone sees as important to the person they are becoming."
      },
      "secondTailBySecond": {
        "experiences": "The emphasis here is on an experience as part of a life story.",
        "stories": "The emphasis here is on how a story gives shape to the past.",
        "memories": "The emphasis here is on the meaning someone finds in a memory."
      }
    }
  ]
}
```

### 8.3 回答組合的確定規則

```text
selectedPrefix = answerPrefix + firstChoice.text + secondChoice.text

fullAnswer = selectedPrefix
           + route.leadSuffix
           + " " + route.firstTailByFirst[firstChoice.id]
           + " " + route.secondTailBySecond[secondChoice.id]

answerId = routeId + ":" + firstChoice.id + ":" + secondChoice.id
```

這不是文字生成模型，而是固定資料的確定性組合。每一個可點選的候選都要有合法的後續；不要顯示沒有結局的「裝飾選項」。

三個範例：

| 主焦點 | 第一選擇 | 第二選擇 | answerId | 回答開頭 |
|---|---|---|---|---|
| emotion | emotional | experiences | `emotion:emotional:experiences` | Humans remember childhood because emotional experiences can connect the past… |
| brain | repeated | routines | `cognition:repeated:routines` | Humans remember childhood because repeated routines can give people… |
| family | shared | stories | `identity:shared:stories` | Humans remember childhood because shared stories can become part… |

第一輪和第二輪的選擇不只換標題，也會改變其後對應的說明句。不要把所有路徑共用同一篇正文而只替換一個標籤。

### 8.4 建議的資料型別與純函式

以下是邏輯參考，可依專案格式調整，但行為不能改變。不要把 `buildAnswer` 寫在畫面元件內。

```ts
export type RouteId = "emotion" | "cognition" | "identity";
export type AttentionId =
  | "emotion" | "brain" | "experience" | "identity" | "family";

export interface ChoiceFixture {
  id: string;
  /** Raw text, including its leading space. */
  text: string;
  /** Illustrative weight within the displayed candidate set. */
  weight: number;
}

export interface RouteFixture {
  id: RouteId;
  labelZh: string;
  round1: ChoiceFixture[];
  round2ByFirst: Record<string, ChoiceFixture[]>;
  leadSuffix: string;
  firstTailByFirst: Record<string, string>;
  secondTailBySecond: Record<string, string>;
}

export interface ScenarioFixture {
  id: string;
  question: string;
  questionZh: string;
  answerPrefix: string;
  seed: number;
  tokensAreIllustrative: boolean;
  probabilitiesAreIllustrative: boolean;
  inputTokens: Array<{ id: string; text: string }>;
  vectorNodes: Array<{
    id: string;
    label: string;
    position: [number, number, number];
    selectable: boolean;
  }>;
  vectorPreviewMap: Record<string, AttentionId>;
  attentionOptions: Array<{
    id: AttentionId;
    label: string;
    labelZh: string;
    routeId: RouteId;
  }>;
  routes: RouteFixture[];
}

export interface ResolvedAnswer {
  answerId: string;
  selectedPrefix: string;
  remainingText: string;
  fullAnswer: string;
}

export function buildAnswer(
  scenario: ScenarioFixture,
  routeId: RouteId,
  firstId: string,
  secondId: string,
): ResolvedAnswer {
  const route = scenario.routes.find((item) => item.id === routeId);
  if (!route) throw new Error(`Unknown route: ${routeId}`);

  const first = route.round1.find((item) => item.id === firstId);
  if (!first) throw new Error(`Invalid first choice: ${firstId}`);

  const secondOptions = route.round2ByFirst[first.id];
  const second = secondOptions?.find((item) => item.id === secondId);
  if (!second) throw new Error(`Invalid second choice: ${secondId}`);

  const firstTail = route.firstTailByFirst[first.id];
  const secondTail = route.secondTailBySecond[second.id];
  if (!firstTail || !secondTail) {
    throw new Error("Incomplete answer fixture");
  }

  const selectedPrefix = scenario.answerPrefix + first.text + second.text;
  const remainingText =
    route.leadSuffix + " " + firstTail + " " + secondTail;

  return {
    answerId: `${route.id}:${first.id}:${second.id}`,
    selectedPrefix,
    remainingText,
    fullAnswer: selectedPrefix + remainingText,
  };
}

/** Display chunks, not a real tokenizer. Preserves all original characters. */
export function splitDisplayChunks(text: string): string[] {
  return text.match(/\s+|[^\s]+/gu) ?? [];
}
```

`splitDisplayChunks` 的空白片段可設為零等待，文字與標點按節奏顯示。測試必須確認 `chunks.join("") === text`。

載入 JSON 後先驗證，再當成 `ScenarioFixture` 使用；不能只靠 `as ScenarioFixture` 掩蓋不完整資料。可以自行寫小型檢查函式，不需要為此新增大型 schema 套件。

---

## 09. 狀態管理與事件契約

### 9.1 業務狀態與動畫狀態分離

業務狀態使用 reducer，保留當前場景、已確認選擇與紀錄。粒子位置、相機插值、hover 動畫進度放 refs，不放全域 React state。

```ts
export type SceneId =
  | "input"
  | "tokenization"
  | "vector"
  | "attention"
  | "prediction"
  | "generation"
  | "output"
  | "summary";

export type PredictionPhase =
  | "arrival"
  | "influx"
  | "compression"
  | "distribution"
  | "awaitingChoice"
  | "commit"
  | "append"
  | "complete";

export type InputSource = "user" | "presenter" | "autoplay";

export interface PredictionChoice {
  round: 1 | 2;
  candidateId: string;
  /** Copied from the validated fixture, never from arbitrary DOM text. */
  text: string;
  source: InputSource;
}

export interface ExperienceState {
  scenarioId: string;
  runId: number;
  sceneInstanceId: number;
  scene: SceneId;
  scenePhase: "entering" | "ready" | "exiting";
  transitionId: number | null;
  exploredConceptIds: string[];
  attention: {
    primaryId: AttentionId | null;
    secondaryId: AttentionId | null;
    confirmed: boolean;
    source: InputSource;
  };
  prediction: {
    round: 1 | 2;
    phase: PredictionPhase;
    pendingCandidateId: string | null;
    choices: PredictionChoice[];
  };
  generation: {
    visibleChunkCount: number;
    complete: boolean;
  };
  settings: {
    quality: "low" | "medium" | "high";
    reducedMotion: boolean;
    presenterOpen: boolean;
  };
}
```

`routeId`、候選集合、目前前綴、`answerId` 和完整回答，以 selectors 從已確認 Attention 與 Prediction 紀錄推導，不儲存五份可能不同步的字串。

紀錄與 UI 顯示採資料中的 ID，不使用 DOM 文字作為路由條件。`selectedPrefix` 只能由已驗證的選擇推導。

### 9.2 事件與守門條件

| 事件 | 前提 | 狀態效果 |
|---|---|---|
| `INPUT_CONFIRMED` | input ready，holding 時長有效，尚未送出 | 固定問題確認，請求前進一次。 |
| `VECTOR_TOGGLE` | vector ready，合法可選概念 | 在 0–2 項間切換；不改 Attention 已確認值。 |
| `ATTENTION_SET_PRIMARY` | attention ready，合法節點 | 改主焦點、設未確認、清除下游 Prediction／Generation；與輔助相同則清輔助。 |
| `ATTENTION_SET_SECONDARY` | attention ready，與主焦點不同 | 改光流與紀錄；不改 route 的計算規則。 |
| `ATTENTION_CONFIRM` | 已有合法主焦點，未轉場 | 設 confirmed，清空下游，請求前進。 |
| `PREDICTION_SELECT` | prediction ready，`awaitingChoice`，候選屬於本輪 | 設 pendingCandidateId，進入 commit，立即鎖定該輪。 |
| `PREDICTION_APPEND_COMPLETED` | commit／append 動畫來自當前 sceneInstanceId，pending 合法 | 只追加一次 choice；第一輪進第二輪，第二輪完成並請求前進。 |
| `GENERATION_TICK` | generation ready、結果已解析 | 顯示下一個文字片段；不要每顆粒子發事件。 |
| `GENERATION_COMPLETED` | 全文已完整顯示 | complete=true，請求前進 Output。 |
| `SHOW_SUMMARY` | output ready，使用者點擊 | 請求轉至 Summary。 |
| `RESET_EXPERIENCE` | 任一場景 | 取消所有舊動畫，runId++，重設選擇與 Input。 |
| `LOAD_PRESENTER_FIXTURE` | 演示工具選擇合法場景／路線 | 以預設狀態安全跳場，註記 source=presenter。 |

### 9.3 禁止的狀態

不能在 Attention 未確認時進互動 Prediction。不能在第一輪沒選時顯示第二輪。不能在兩次選擇不完整時自行生成完整答案。不能將 cognition 的第二輪選項提交到 emotion 路線。

遇到不合法狀態，開發版顯示清楚錯誤；演示版提供「回到 Attention」或「重新開始」的恢復方式。不要靜默改成 emotion 預設答案掩蓋 bug。

### 9.4 重入、返回與跳場

內容選擇前，按鈕與 reducer 都要守門；只在 CSS 加 `pointer-events: none` 不夠。

每次離場、reset、重播、presenter 跳場，都取消舊時間軸與 pending callbacks。所有完成事件必須帶 runId／sceneInstanceId；驗證不符就忽略。

返回上游場景時保留合理的上游紀錄，但清除下游結論。尤其修改主焦點後，兩次 Prediction、生成進度與解析結果全部失效，即使新舊主焦點恰好屬於同一 route，也重新選擇，避免把舊選擇誤作新介入。

---

## 10. 元件與目錄架構

可因既有專案調整命名，但維持「資料、狀態機、場景、渲染、轉場」的界線，不把所有內容放成一個巨型 App.tsx。

```text
src/
  app/
    App.tsx
    ExperienceProvider.tsx
    experienceReducer.ts
    selectors.ts
    sceneOrder.ts
  data/
    scenario.json
    scenarioTypes.ts
    validateScenario.ts
    buildAnswer.ts
    presenterFixtures.ts
  scenes/
    InputScene.tsx
    TokenizationScene.tsx
    VectorScene.tsx
    AttentionScene.tsx
    PredictionScene.tsx
    GenerationScene.tsx
    OutputScene.tsx
    SummaryScene.tsx
  visual/
    StageCanvas.tsx
    VectorWorld.tsx
    PredictionParticles.tsx
    BackgroundParticles.tsx
    FallbackStage2D.tsx
    visualConfig.ts
    seededRandom.ts
    particlePaths.ts
  motion/
    TransitionController.tsx
    TransferOrbOverlay.tsx
    useSceneTimeline.ts
  components/
    StageFrame.tsx
    SceneHeading.tsx
    CandidateButton.tsx
    PresenterPanel.tsx
    SimulationInfo.tsx
    QualityControls.tsx
  styles/
    globals.css
    stage.css
  tests/
    fixtures.test.ts
    answers.test.ts
    reducer.test.ts
    interactions.test.tsx
  main.tsx

e2e/
  experience.spec.ts
  presenter.spec.ts

README.md
IMPLEMENTATION_STATUS.md
package.json
package-lock.json
```

基本關係：

```text
ExperienceProvider
  └─ App
       ├─ StageFrame
       │    ├─ StageCanvas（只有一個，WebGL 能用時保持掛載）
       │    ├─ FallbackStage2D（降級時替代 Canvas）
       │    ├─ ActiveSceneUI（文字與按鈕）
       │    └─ TransferOrbOverlay（跨場景持續存在）
       ├─ TransitionController
       ├─ SimulationInfo
       └─ PresenterPanel
```

大部分 UI 是 DOM，重點 3D 世界在 Canvas。Canvas 外的 overlay 預設 `pointer-events: none`，真正能操作的按鈕／標籤才開 `pointer-events: auto`，避免透明圖層擋住旋轉與點選。

Vector 中只有少量文字，可用 Drei Html 對齊三維節點，這是其官方提供的 DOM／3D 整合方式之一。[R5] Prediction 的三個候選建議放在獨立 DOM 層，透過共用錨點資料與粒子吸引中心對齊。

---

## 11. 3D、粒子與文字的實作細節

### 11.1 Vector 空間

固定一個 PerspectiveCamera，將九個節點放在 fixture 指定座標。節點可用小型 mesh／sprite；線條以少量 line segment 呈現。不需要燈光物理模擬、陰影貼圖或載入 glTF。

整個 group 的旋轉隨拖曳改變。為可讀性，建議水平偏轉限制在約 ±35°，垂直約 ±20°；滑鼠放開後緩慢穩定。這些是初始美術值，可以微調但不能讓節點消失在觀眾背面。

文字面向螢幕，不隨 group 被旋轉成倒字。空間中心 childhood 不可選，不算入最多兩個概念。

### 11.2 粒子數量與分層

初始品質檔：

| 品質 | 總粒子預算 | 畫素比上限 | 近景拖尾 | 後處理 |
|---|---:|---:|---|---|
| Low | 約 500–700 | 1.0 | 少量或關閉 | 無 |
| Medium，預設 | 約 1,400–1,800 | 1.5 | 少量 | 無；使用粒子自身光暈 |
| High | 約 2,200–2,600 | 1.75 | 適量 | Bloom 僅屬可選加強，不是 P0 必要 |

這是需要在展示筆電上實測調整的預算，不保證所有硬體都達到特定 FPS。先讓 Medium 有完整效果，再調參，不靠無限制加粒子掩蓋設計問題。

P0 可以採多個 `THREE.Points` + 共用 `BufferGeometry`／材質邏輯，分為遠、中、近三層。只要數量多且運動路徑清楚，即可有深度；**不能建立 1,600 個獨立 React 粒子元件或 1,600 個 DOM 光點**。

使用一次產生並快取的圓形漸層 CanvasTexture 作光暈，不需要下載圖片。以 points material 的分層大小／透明度和必要的加色混合呈現。自訂 shader 是可選優化，不是完成 P0 的前提。

### 11.3 可控路徑優先於粒子物理

各粒子在初始配置時決定：起點、控制點、候選歸屬、相位、微小偏移、速度變化。使用固定 seed 產生，禁止在每幀用 `Math.random()` 不斷換軌跡。

phase progress 驅動以下位置：

```text
arrival / influx:
  起點 → 中央收束區的曲線

compression:
  中央有限範圍內的旋流／緩慢繞行

distribution:
  中央區域 → 某個候選的吸引中心

awaitingChoice:
  候選周圍的穩定低速環繞

commit:
  當前位置 → 使用者選中候選的中心
```

可採 cubic Bezier 加正弦偏移，或其他簡單插值；粒子之間不互算碰撞／引力。`commit` 要從當前位置收斂，不突然瞬移到路徑起點。

GSAP 只寫入 phase progress／少量群組控制值，`useFrame` 讀取它們填入預配置 typed arrays。材質、texture、Vector3 與 buffers 盡可能共用；頁面不可見時暫停主要動畫或凍結進度，恢復時避免一次跨越數秒。

### 11.4 粒子份額

三個候選的粒子群大小可由固定權重分配：

```text
count0 = floor(total * weight0)
count1 = floor(total * weight1)
count2 = total - count0 - count1
```

因為是示意，可加入小量全域裝飾粒子，但固定好「候選群」和「裝飾群」，不要以裝飾粒子改變畫面上的機率。

### 11.5 DOM 候選與 3D 吸引中心對齊

候選位置初始採 normalized anchors，例如 `(0.24, 0.62)`、`(0.50, 0.53)`、`(0.76, 0.62)`；避免三個選項差異大到像主推中間那個。

響應式布局可能改變位置，所以應在字體／布局穩定後讀取候選容器中心，或由同一份 anchor 資料計算 DOM 與 world position。禁止候選文字在左邊、粒子卻吸向螢幕另一處。

若從 DOM 像素求 world point：

```text
nx = 2 * (centerX - stage.left) / stage.width - 1
ny = 1 - 2 * (centerY - stage.top) / stage.height

由相機對 (nx, ny) 射出 ray，與固定候選平面相交，得到 world target。
```

在 resize／layout change 時更新；不要每個粒子每幀讀 DOM bounding box。Transition 主光點使用 DOM 座標系，不需要在跨場景時維持真實世界座標。

### 11.6 渲染資源生命周期

Canvas 在正常切場中保持存在。隱藏未活動的 3D group，並停止它們的 frame 更新；不要只設 visible=false 卻仍做所有重運算。

WebGL material／geometry／texture 在真正不再使用時釋放。共用材質不可因某個場景卸載而被提前 dispose。每輪重播不能越播越卡、越建越多 Canvas。

---

## 12. 降級、可用性與操作安全

### 12.1 低動態模式

讀取 `prefers-reduced-motion`，並提供可見的「減少動態」開關。這個模式同樣能完成所有分支，不是顯示「無法體驗」。

低動態模式移除快速鏡頭移動與大幅穿越視角，粒子量顯著降低，場景以短淡入淡出銜接；Prediction 仍有穩定的三個候選與分流提示。內容、權重、兩次選擇、答案與摘要完全不變。

一般模式也不能使用整屏高頻閃爍或強烈抖動。不要用頻閃製造「很炫」；用流量、曲線、深度與收束營造強度。

### 12.2 WebGL 無法使用時

提供 `FallbackStage2D`，保留全部 DOM 選擇與相同分支邏輯。Vector 改成固定的二維節點與連線；Prediction 改成少量 Canvas2D 光點／SVG 光流。

提示 `目前使用低效能示意模式`，仍可完成流程。可支援白名單參數 `?renderer=2d` 便於測試。不要要求觀眾改瀏覽器設定才能看完。

若 WebGL context 在播放中丟失，取消當前視覺 timeline，以相同業務狀態進入降級版本，重新播放當幕必要的入場；已確認的選擇不得消失或重複提交。

### 12.3 鍵盤與文字

所有可點選控制使用真正的 button／radio 等可聚焦語義。Tab 可到達選項，Enter／Space 可選；focus 狀態與 hover 同樣清楚。

新的操作幕準備完成後，焦點移至該幕標題或第一個合理控制。舊幕隱藏後，不得仍能 Tab 到不可見按鈕。資訊面板關閉後，焦點返回開啟它的按鈕。

候選機率要有「示意」標示，主焦點／輔助焦點有文字標籤，不能只靠顏色。逐字生成不要用 aria-live 每個片段朗讀；完成後一次提供完整答案即可。

### 12.4 隱私與網路

此版不錄音、不錄影、不識別人臉、不儲存真實問題、不追蹤使用者。互動紀錄只在目前瀏覽器記憶體；不加 analytics、遠端 log、登入或 API。

所有文字使用安全的 React 文字渲染，不用 `dangerouslySetInnerHTML`。Query 參數只接受固定 scene／route／renderer 白名單，不能載入任意 URL 或執行文字。

---

## 13. 演示者工具

這是給組員講解的 MVP，必須能直接帶大家看某一幕，不必每次從頭按完。

### 13.1 P0 必做

提供右上角「演示工具」與快捷鍵 `D` 開關面板。至少包含：場景下拉、三條路線預設、跳至所選場景、重播當幕、重新開始、Low／Medium／High 品質、減少動態。

進度顯示在一般模式保留，但一般觀眾點進度文字不會隨便跳場。只有演示工具能直接指定場景。

重播當幕以「該幕進入時的業務狀態快照」重置局部動畫；取消本幕未完成的選擇，再重播。不要把目前候選 hover 狀態當成已確認結果。

### 13.2 安全跳場 fixture

直接跳 Generation／Output／Summary 時，需注入一份完整的預設路徑，不可使用不完整 state 硬進。預設例：

| 路線 | 主焦點 | 第一選擇 | 第二選擇 |
|---|---|---|---|
| emotion | emotion | emotional | experiences |
| cognition | brain | repeated | routines |
| identity | family | shared | stories |

跳到 Prediction 時，只補入對應主焦點、已確認 Attention 與可選的探索紀錄，清空兩輪 Prediction，讓現場人從第一輪自行選。

跳到 Vector／Attention 時不補下游答案。所有補入紀錄以 `source: presenter` 註記；Summary 顯示「演示預設路徑」而非全部冒充觀眾親選。

### 13.3 P1 可選

自動導覽、暫停全部時間軸、JSON 路徑匯出、音效、瀏覽器列印。這些不能阻擋 P0 交付。

自動導覽若有做，只能走預先指定的演示選擇，標示 `自動導覽・預設選擇`，不能標示成「模型會選」。互動模式預設仍是手動等待兩次 Prediction。

---

## 14. 開發順序與完成優先級

### Milestone A｜資料與端到端骨架

建立環境、fixture 驗證、buildAnswer、reducer、8 幕普通文字／控制骨架。先讓固定 Input → 選擇 → 完整答案 → Summary 跑通。這時畫面可以簡單，但所有候選必須真的可走完。

驗收：三路線與 27 個資料結果存在；兩次 Prediction 的前綴不被覆蓋；重設乾淨。

### Milestone B｜完整互動與清楚因果

補上 Input 按住／放開、Vector 旋轉與選取、Attention 主／輔焦點、兩輪候選查表、路徑紀錄、演示工具與鍵盤操作。

驗收：只影響畫面的互動不改答案；會影響內容的選擇確實改正文；不能連點跳兩幕。

### Milestone C｜視覺主線與高潮

建立單 Canvas、共用主光點 Overlay、跨邊界切場、Vector 空間深度、Attention 光線碎裂、Prediction 大量湧入與分流、選中收斂、Generation 加速。

**Prediction 粒子高潮和跨場景主光點不是「以後再加」的 P1，而是本次 P0。** 不可只交付按鈕頁面就宣稱完成。

### Milestone D｜展示穩定度

補字體與可讀性、低動態、2D 降級、頁面 resize、反覆演示、錯誤恢復與 README。實際執行 build、lint、typecheck、unit tests；有瀏覽器工具再完成 E2E 和視覺檢查。

### 優先級原則

| P0 必須完成 | P1 不阻塞 |
|---|---|
| 8 幕連貫流程、全部固定分支 | 真正聲音設計與音效 |
| 全部指定互動與 Summary 因果紀錄 | 高級 Bloom、特殊 Shader、景深 |
| 大量光點 Prediction 高潮 | 更複雜的 3D 關聯圖 |
| 光點越界後切場 | 自動導覽與完整暫停控制 |
| 演示跳場、重播、重新開始 | 路徑 JSON 匯出與列印樣式 |
| 鍵盤、低動態、WebGL 降級 | 真手機／多螢幕／模型串接，僅列未來規劃 |

若開發受限，先移除 P1，再降低粒子品質，不刪掉核心互動、答案分支或敘事轉場。

---

## 15. 自動測試規格

### 15.1 Fixture 與純函式

至少建立以下測試：

| 測試 | 預期 |
|---|---|
| 重建固定問題 | `inputTokens.map(t => t.text).join("") === question` |
| 每組候選完整 | 3 個合法、ID 不重複、raw text 非空 |
| 示意權重 | 全為有限且正數，總和與 1 的差 < 1e-6 |
| 第二輪覆蓋率 | 每個第一輪候選都有一組第二輪資料 |
| 回答覆蓋率 | 每條第二輪邊都有尾段資料，能 buildAnswer |
| 結果數 | 27 個唯一 answerId、27 個對應的完整結果 |
| 前綴一致 | `fullAnswer.startsWith(selectedPrefix)` |
| 剩餘內容 | `selectedPrefix + remainingText === fullAnswer` |
| 生成片段無損 | `splitDisplayChunks(remainingText).join("") === remainingText` |
| 不合法選項 | 錯 route／第一／第二選擇明確拒絕，不 silently fallback |
| deterministic | 相同 fixture 與相同選擇得到相同全文 |
| 純視覺輸入隔離 | 改 Vector 或輔助 Attention，不改同一路徑的 fullAnswer |

27 條路徑應由測試走訪資料樹，不手工只測三個範例。

### 15.2 Reducer／事件

檢查：未選主焦點不能前進；候選尚未 ready 不接受點選；連點只提交一次；第一輪提交後資料真的切到對應第二輪；第二輪完成才開放 Generation。

修改主焦點清除下游；reset 清空一切使用者路徑；失效 runId／sceneInstanceId 的完成事件被忽略。對同一 `PREDICTION_APPEND_COMPLETED` 重複 dispatch，不得追加第三個 token。

### 15.3 建議 E2E 路徑

1. 正常：按住輸入 → Tokenization 自動 → Vector emotion／family → Attention emotion → emotional → experiences → Generation → Output → Summary。
2. 不同答案：Attention brain → repeated → routines；確認與 emotion 路線全文不同且開頭保留選擇。
3. 選較低權重：Attention emotion → vivid → events；必須可完成，不出現答錯或模型比較。
4. Vector 零選擇，Attention 沒有輔助焦點，也能完整完成。
5. 只用鍵盤完成兩次 Prediction。
6. 在 Prediction influx 期間 reset；舊動畫不能把新流程推回 Prediction／Generation。
7. 演示工具直接跳 Output，再重播／重新開始，無空字串與遺留選項。
8. 2D 降級與 reduced motion 仍有完整分支與相同答案。

### 15.4 瀏覽器檢查

在可用的目標瀏覽器上記錄 console error、network request 與 WebGL 問題。正常演示不應出現遠端 API、字體、音訊或模型請求。

檢查視窗縮放、切換頁籤再回來、連續完成三輪、從各幕重設、進出資訊面板。截圖可輔助檢查可讀性；動畫需要實際觀察，不能只憑 screenshot 宣稱轉場和粒子流正確。

若 E2E 因環境沒有瀏覽器或 WebGL 支援無法執行，仍執行可執行的 unit／build，並在交付紀錄清楚列出未驗證項目。

---

## 16. 人工驗收清單

### A. 整體體驗

- [ ] 一台筆電、一個瀏覽器頁面能走完 8 幕。
- [ ] 一眼看得出目前階段與可做的操作。
- [ ] 不是多欄儀表板、聊天頁或只有切換簡報。
- [ ] 全程沒有要求 API key、麥克風、相機或登入。
- [ ] 固定資料與示意性質清楚，但不遮擋主要視覺。

### B. 觀眾介入

- [ ] Tokenization 不需要手動切字，不操作也前進。
- [ ] Vector 能旋轉、探索；不會暗中替觀眾決定主焦點。
- [ ] Attention 主焦點會改變候選資料；輔助焦點的作用有標示。
- [ ] Prediction 沒有 `Model choose`／模型首選／人機比較。
- [ ] 兩輪選擇都真正等待使用者且各有完整後續。
- [ ] 選權重較低的字也能走完，沒有正誤評分。
- [ ] Generation 完整保留觀眾選出的前綴。
- [ ] Summary 不把演示預設誤寫成觀眾親選。

### C. 動畫與深度

- [ ] 光點越過舊畫面邊界後才切幕，下一幕有對應的入口。
- [ ] Vector 有明確的空間層次，文字保持可讀。
- [ ] Prediction 在選擇前就有大量光點湧入。
- [ ] 光點有收束區、分流、等待和選中收斂，不只是背景星空。
- [ ] 候選文字與粒子吸引中心對齊。
- [ ] 第二輪可看出相同機制再發生一次，但節奏較快。
- [ ] Generation 加速後，Output 明顯變安靜。
- [ ] 沒有整屏快速閃白、劇烈抖動或文字完全被特效遮住。

### D. 穩定性與交付

- [ ] 快速連點不跳過兩幕、不重複追加 token。
- [ ] reset／跳場後，舊 callback 不會復活。
- [ ] 低品質／2D／低動態下仍可走完相同內容。
- [ ] 1366×768 的候選、提示與按鈕沒有被切掉。
- [ ] 所有 27 條資料分支通過檢查。
- [ ] build、typecheck、lint、unit tests 的實際結果有紀錄。
- [ ] README 有啟動方法、互動方式、固定資料位置、演示工具說明。

---

## 17. 專案指令與工程要求

### 17.1 新專案建立

先檢查既有檔案，不要直接在非空目錄重建覆蓋。空目錄可使用 Vite 的 React TypeScript 模板，再加入已選定且互相相容的套件。[R1][R2]

預期啟動方式：

```bash
npm install
npm run dev
```

專案需提供以下 scripts，實際指令可依版本微調：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty false",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

不要把執行命令寫進 README 卻未實際提供對應 script。`test` 使用非 watch 模式，避免自動化交付一直卡住。

### 17.2 工程原則

TypeScript 不以廣泛的 `any` 跳過核心資料檢查。邏輯函式可測試；數值如粒子數、字級、場景時長集中設定。不要在不同檔案重複硬寫三份同一段回答。

不移除 StrictMode 來掩蓋 effect 重複執行問題。使用正確的動畫 cleanup、事件取消與 idempotent reducer。

開發可以使用 npm 下載依賴，**正常演示運行** 不得依賴外網。不要加入為了完成藝術效果而必須購買的素材、font、插件或 API。

---

## 18. 最終交付內容

Codex 完成實作後，應交付可啟動的原始碼、lockfile、README、測試與 `IMPLEMENTATION_STATUS.md`，而不是再回傳一篇概念規劃。

README 至少包含：

| 內容 | 要求 |
|---|---|
| 安裝啟動 | 實際 Node／npm 條件、安裝、開發與 build 指令。 |
| 演示方式 | 從 Input 走一次的操作、D 演示工具、重播與 reset。 |
| 修改內容 | 固定問題、候選、權重、回答與配置的檔案位置。 |
| 視覺調整 | 粒子數、品質、時間軸、轉場與低動態設定位置。 |
| 模擬範圍 | 不串接模型、不錄音、不代表真實 attention 或 embedding。 |
| 測試 | 已執行命令與結果、尚未在真實展示筆電驗證的項目。 |
| 已知限制 | 真實手機、多螢幕、模型與列印均尚未實作。 |

`IMPLEMENTATION_STATUS.md` 必須把內容分為「已完成」、「已執行驗證」、「未執行驗證」、「已知問題／P1」。不要把預期能跑當作已跑，或把 fallback 截圖當作高品質 WebGL 視覺已驗收。

完成回覆需要說明：如何啟動、哪些互動已可操作、哪些測試實際通過、哪些項目尚有問題。不要在本需求下自行將專案 push 到遠端、部署到使用者帳號或修改其他 repository。

---

## 19. 給組員看的示範講解路徑

建議第一次演示使用以下路徑，作為工程驗收與介紹作品的共同腳本：

**Input：** 按住手機上的按鈕，放開後固定問題出現，說明正式版未來才會接語音。讓大家看主光點如何離開手機與舞台。

**Tokenization：** 不操作，觀看句子被系統拆解。強調這一站沒有觀眾決策，避免變因。

**Vector：** 旋轉空間、選 emotion／family。說明這只是探索與視覺提示，不是改模型。

**Attention：** 主焦點選 emotion，輔助選 family。指出主焦點會決定下一幕用哪組候選；輔助只改光流與紀錄。

**Prediction：** 先不點，讓大家看完整湧入、收束和分流。第一輪選 emotional，第二輪選 experiences。指出沒有模型首選，觀眾直接決定路徑。

**Generation：** 見到剛選的兩個詞被保留，後面的預寫內容加速形成，不再要求操作。

**Output：** 特效退去，只留下答案。確認大家能讀到內容。

**Summary：** 看到剛才的探索、主／輔焦點與兩次文字選擇。再使用演示工具改走 brain／repeated／routines，展示同一問題確實能得到另一份預設答案。

---

## 20. 未來正式版接口，只保留邊界，不在 MVP 實作

| 未來功能 | 本次留下的可替換位置 | 本次不做 |
|---|---|---|
| 真手機語音 | `InputScene` 送出的固定問題事件 | 不做 Web Speech／錄音／權限流程。 |
| 真實 tokenizer | `inputTokens` 資料來源 | 不下載 tokenizer／模型。 |
| 真實候選資料 | `scenario.routes`／候選 selector | 不偽裝現在已連到 logits。 |
| 多螢幕 | scene director 的場景事件與 TransferOrb 邊界概念 | 不加 WebSocket／BroadcastChannel 同步。 |
| 相機手勢 | 現有 click／select action | 不做追蹤與辨識。 |
| 熱感應紙 | Summary 使用的結構化資料 | 不整合 printer driver。 |

不要提前建立龐大的插件架構。保留乾淨事件、獨立資料與可替換的輸入元件即可。

---

## 21. 官方技術參考

以下來源用於套件與技術接口確認；場景敘事、時間、分支、粒子預算及文案是本案設計，不是這些來源提供的實測結論。套件升級時重新檢查相容性與文件。

**[R1] React Three Fiber — Installation**  
React／Fiber major version 配對、Vite 整合。  
`https://r3f.docs.pmnd.rs/getting-started/installation`

**[R2] Vite — Getting Started**  
環境條件、TypeScript 模板與專案建立。  
`https://vite.dev/guide/`

**[R3] GSAP — React**  
`useGSAP`、context cleanup、事件內動畫的 `contextSafe`。  
`https://gsap.com/resources/React/`

**[R4] React Three Fiber — Performance pitfalls**  
以 `useFrame`／refs 處理高頻動畫，避免每幀 setState、重複配置及無謂重掛。  
`https://r3f.docs.pmnd.rs/advanced/pitfalls`

**[R5] Drei — Html**  
在 3D 場景中對齊少量 DOM 標籤。  
`https://drei.docs.pmnd.rs/misc/html`

**[R6] Vaswani et al. — Attention Is All You Need**  
Transformer 原始論文；用來界定本案不是完整機制重建。  
`https://arxiv.org/abs/1706.03762`

---

## 22. 最後的實作判準

> 一個不懂 AI 的組員，應能從這個 MVP 看懂「我把問題送進去，資料經過不同空間，我在其中幾處做了選擇，這些選擇留下不同答案」。
>
> 同時，一個懂技術的組員，應能從程式與文件看清楚「哪些資料是固定的、哪些選擇會切換分支、哪些動作只是視覺隱喻，以及未來哪些地方可以替換成真實接口」。
>
> **先完成可走完且不誤導的流程，再把資料湧入與選擇收斂做成值得展示的視覺高潮。**

# Before the Answer｜MVP 整合修正與視覺升級規格

> 版本：v2.0-integrated｜日期：2026-10-08  
> 套用專案：`Adrian-Kao/dct-mvp` 的既有互動 MVP。  
> 工作目標：實際修改程式、跑測試並留下視覺驗收證據，不是重建專案或只補文件。  
> 本文件整合四個已提出的問題、Prediction Loop，以及全場景的「黑場 → 光點入場 → 中央四散展開」。

## 00. 交給 Codex 的總指令

請完整閱讀本文件，遵守專案適用的 `AGENTS.md`，先檢查 `git status`、`git diff`、既有依賴與程式架構，然後直接實作。

四個問題的源碼審查基準為 commit `13b9504cacc407b52a61bfca26047c83658b7196`；本文件不是宣稱最新工作樹仍完全相同。實作前請在目前工作目錄重新確認原因，不要 checkout 舊 commit、不撤銷使用者已完成的修改。

本文件是開發規格，不是「已修復」報告。既有根因來自前次源碼／截圖審查；本次另核對該固定版本的 `GenerationScene.tsx`。尚未藉由本文件完成網頁實作、瀏覽器播放或效能驗證。

### 文件優先順序

保留以下文件作為背景與資料契約：

- `Before_the_Answer_MVP_Spec.md`
- `Before_the_Answer_Transition_Patch.md`
- `Before_the_Answer_Code_Review_Fix_Prompt.md`

**在視覺、轉場、四個修正與第 6 幕播放方式有衝突時，以本文件為準；資料、分支與工程安全規範不因此被覆蓋。**

| 舊設計或舊實作 | 本版明確取代為 |
|---|---|
| 黑暗背景先有淡字、星點、按鈕，再飛入光點 | 進場前純黑；只讓傳送光點先出現，抵達中央後才生成其他畫面 |
| 收束時標題、說明可保留低亮度 | `coreReady` 起全部介面與場景裝飾歸零，只剩唯一主光點 |
| 新畫面整頁淡入，中央光點只是裝飾 | 中央向外的資料散射與內容生成，不能只有整頁 opacity |
| 第 6 幕普通打字播放 | 保留 `generation` SceneId，改為可看懂循環因果的 Prediction Loop |
| 第 6 幕獨立 timer 打字，粒子另外播放 | 由同一循環時間軸驅動，光點抵達文字後才能追加對應片段 |
| 未選項暫時變淡，換 phase 可能重新可見 | 舊場景的未選項一旦消散，持續隱藏到卸載 |
| Prediction 各候選上方永久盤旋粒子 | 有來源、有方向、分批抵達並被吸收的資料流 |

不要清空目錄、不更換工具鏈、不批次升級依賴、不修改 fixture 來繞過動畫問題。不 commit、push 或部署。

## 01. P0 交付範圍與不可變更的資料

這次六個項目全部是 P0，不能只挑最容易的一幕交付：

| 編號 | 必須完成 |
|---|---|
| F1 | Tokenization 原句拆分完成後完全消失 |
| F2 | Vector／Attention／Prediction 未選項粒子化後不再復現 |
| F3 | Attention 節點、線條、中心形狀與控制區布局修正 |
| F4 | Prediction 資料依序匯入字詞並被吸收，不再留下雜訊雲 |
| F5 | 第 6 幕 Prediction Loop：慢速示範、更新上下文、加速重複、文字同步累積 |
| F6 | 每個新畫面純黑起始；光點到中央後向外散開，才展開內容 |

保持單台筆電、單一舞台、固定問題與預設回答。不接模型、麥克風、攝影機、手機同步、後端或實體列印。保留滑鼠／鍵盤、演示工具、畫質、低動態與 2D fallback。

不可改動的內容因果：

- Input：按住模擬語音後確認既有固定問題，不新增錄音權限。
- Tokenization：原有六個示意文字單位、自動拆分、原始空白不變；不改成手動切字。
- Vector：最多兩個探索選取，也能零選取繼續；只影響提示與紀錄，不新增答案分支。
- Attention：主焦點決定既有回答路線；輔助焦點只影響光流與紀錄，不偷偷改權重或路線。
- Prediction：兩輪都由使用者選擇；不顯示 `Model choose`、模型首選、人機比較或正誤；不自動選最高機率。
- Generation：只自動播放已選路徑的預寫後續，不新增第三次使用者選擇。
- Output、Summary：與 `buildAnswer()` 的全文一致；兩幕均可持續閱讀，不自動跳走。

畫面消散不代表刪除 `scenario`、完整問題、已選前綴或實際上下文。視覺狀態與業務資料分開。

## 02. 場景編號：仍然是八幕

以下用使用者看到的 `01 / 08` 編號，避免與舊文件的零起始 Scene 0–7 混淆。

| UI 編號 | 保留的 SceneId | 本版定位 |
|---|---|---|
| 01 | `input` | 模擬手機語音入口 |
| 02 | `tokenization` | 自動文字拆解 |
| 03 | `vector` | 三維概念探索 |
| 04 | `attention` | 主／輔焦點選擇 |
| 05 | `prediction` | 兩輪手動候選選擇 |
| 06 | `generation` | **Prediction Loop｜系統自動重複預測的視覺示意** |
| 07 | `output` | 完整答案 |
| 08 | `summary` | 路徑紀錄 |

Prediction 第一輪 → 第二輪：仍是 05 / 08，但視為一次完整的新畫面進場，套用黑場規則。

Prediction Loop 內部每一次循環：不是換幕，不每輪黑場，不反覆切去前五幕，也不增加進度編號。

## 03. 全作的進場／離場語法（最高優先視覺契約）

### 3.1 一次正常轉場必須完整長這樣

```text
舊畫面可操作／資料處理完成
→ 鎖定互動、取得離場快照
→ 未選內容在原處解體，向外散開消失（無選擇則略過）
→ 保留內容各自在原處縮成小光粒
→ 保留光粒匯向舞台正中央
→ 所有舊資料、標題、控制、背景完全退去
→ 純黑背景上只剩一顆中央主光點
→ 主光點連同光暈與拖尾完全離開畫面
→ 短黑場中更新場景／輪次
→ 新畫面仍是純黑
→ 同一顆主光點由入口飛入
→ 抵達舞台正中央、短暫停留
→ 從中央向四周發射資料光粒
→ 光粒抵達各區域，逐步生成本幕內容
→ 標題、說明、進度與控制最後恢復
→ 本幕進入 ready，開放互動或啟動自動流程
```

**禁止：下一幕先有畫面，光點才進來。**

**禁止：光點尚在邊緣飛行，標題或 3D 文字已經半透明顯示。**

**禁止：整張畫面直接淡入，把向外飛的粒子放在上面裝飾。**

### 3.2 「黑」的嚴格定義

正式體驗中的黑場，是舞台內純黑底色 `#000000`，不是深藍漸層或低透明度內容。

光點尚未出現時，舞台不得顯示：標題、品牌、頁碼、原句、候選詞、概念字、節點線條、卡片、星空、格線、vignette、按鈕、tooltip、loading 圈、打字游標、頁尾或尺寸提示。

光點飛行及中央停留期間，只允許唯一的傳送光點與它的有限光暈／短拖尾可見。粒子風暴、環形引擎及其他小球都還不能出現。

這個規則涵蓋 DOM、Canvas、SVG、Drei `<Html>`／portal、CSS 偽元素與背景效果；不能只把 `.scene-layer` 設成透明，就留下其外面的東西。

### 3.3 中央定義與兩種中心

```text
transferCenter = stageRoot 的實際幾何中心
normalizedCenter = (0.5, 0.5)
centerX = stageRect.width / 2
centerY = stageRect.height / 2
```

Attention 的 graph hub、Prediction 的處理區、Loop 的引擎可有局部布局中心；它們不改變跨場景傳送中心。

所有入場先到全舞台中心，才展開到本幕的局部配置；所有離場最後也回到同一個全舞台中心。

### 3.4 「四散展開」的實際做法

這不是全螢幕爆炸或閃白。做成「由中央往各資料位置播種」的受控散射。

每幕先準備隱藏但可量測的布局，取主要內容群組的目標位置。光點到中央後：

1. 主光點平順增亮一次，開始交接為散射粒子。
2. 數條弧線／有深度的粒子束由中心向內容位置前進，約錯開 40–100 ms。
3. 內容先維持不可見；資料束抵達其位置時，該群組才由緊密狀態展開到正常大小。
4. 文字維持正向與可讀，不讓整段文字高速旋轉。位移、局部遮罩或輕微 scale 可以搭配使用。
5. 環境深色光暈可隨由內向外的揭露恢復，但不得先鋪好整片星空。
6. 主要資料展開後，再短淡入 chrome；最後開放互動。

**位置、時間與內容生成要有因果關係。** 至少看得出中央 → 左側／右側／外圍的流動，而不是所有元素在同一影格出現。

原始內容與入場代理交接時只能有一份可見；主球讓位給散射時，不保留第二顆持續漂浮的主球。

### 3.5 建議時序（初始調整值，不是效能量測）

| 片段 | 正常模式建議 |
|---|---:|
| 舊核心完全離場後的純黑停頓 | 80–140 ms |
| 新光點由入口到中央 | 500–700 ms |
| 中央短暫停留 | 100–180 ms |
| 資料束向外散射與各內容生成 | 650–1000 ms |
| chrome 尾段恢復 | 120–200 ms，可在展開末段重疊 |

總時間由同一份設定管理。不要各元件另設互不相關的 timer。

保留原有出口／入口：Input 向上離場，Tokenization 由下入場；一般向右離場，下一幕由左進入；Output 向下離場，Summary 由上進入。

先讓光點及明顯光暈、拖尾完全離場，才能 swap；不是只要求球心超出邊界。

### 3.6 初始啟動、重播與明確例外

- **首次載入 Input**：也從黑場開始，自動播放一次 bootstrap 光點進場，展開模擬手機後才允許按住。這顆啟動光點不是已輸入的問題，不能因此自動送出問題或建立選擇。
- **普通重新體驗**：Summary 收束，取消舊體驗，Input 從黑場重新展開。
- **演示 Reset／跳場／重播**：立即取消舊流程，不等待舊離場；目的畫面仍先黑場，再播放短版入場。不回到「先露出全頁」的舊方式。
- **Output／Summary 閱讀**：展開後保持可見，不倒數、不自動變黑。
- **Prediction Loop 內部循環**：場景持續可見；不用整幕黑場重播每一步。
- **reduced motion**：保留黑場、單一中央光點與由中心揭露的先後；長距離飛行、3D 旋轉與高速散射改短淡入／低幅度展開。
- **錯誤恢復／主動開啟演示面板**：屬非展演 UI 的明確例外，可暫停體驗後顯示恢復選項。不能故障後無限黑屏，也不能以此例外讓正常品牌或 loading 提早可見。

## 04. 共用工程架構：讓黑場真正覆蓋所有渲染層

### 4.1 沿用既有 Controller，不再建立第二套總流程

先檢查並擴充：

```text
src/components/StageFrame.tsx
src/motion/TransitionController.tsx
src/motion/TransferOrbOverlay.tsx
src/motion/sceneExitSnapshot.ts
src/motion/transitionTypes.ts
src/visual/StageCanvas.tsx
src/visual/VectorWorld.tsx
src/visual/PredictionParticles.tsx
src/visual/FallbackStage2D.tsx
src/app/experienceReducer.ts
src/styles/stage.css
src/styles/globals.css
```

以下狀態名稱是行為建議，按現有 reducer／controller 整合，不能再創造一套競爭中的 SceneManager：

```text
ready
→ locking → resolvingChoice? → compacting → converging
→ coreReady → exiting
→ blackSwap → blackHold
→ enteringCore → centerHold → expanding
→ ready
```

可保留現有 `scenePhase = entering / ready / exiting`，以 `transitionVisualPhase` 或等價子狀態細分。但不能讓 `scenePhase=ready` 在展開之前就啟動 Tokenization、Prediction 或 Generation 的 timer。

### 4.2 明確的可見度矩陣

| 階段 | 場景資料／3D | 背景／chrome | 主傳送光點 | 入場散射 |
|---|---|---|---|---|
| blackSwap / blackHold | 隱藏 | 隱藏，純黑 | 不可見 | 關閉 |
| enteringCore / centerHold | 隱藏 | 隱藏，純黑 | 唯一可見主體 | 關閉 |
| expanding | 依粒子抵達逐群顯示 | 背景由內向外揭露，chrome 晚出 | 交接後隱藏 | 中央向外 |
| ready | 正常 | 正常 | 隱藏，由本幕視覺接手 | 完成並清理 |
| resolvingChoice | 未選解體，所選保留 | 開始退去 | 尚未成形 | 關閉 |
| compacting / converging | 只保留合法來源／代理 | 完全淡出 | 由抵達資料逐步形成 | 關閉 |
| coreReady / exiting | 全部隱藏，代理清理 | 全部隱藏，純黑 | 唯一可見主體 | 關閉 |

純黑期不得保留 `.16`、`.08`、`.12` 的「暗示性介面」。

### 4.3 分層與 portal

可採用受控黑幕配合統一的 visibility gate：底層 black base，場景視覺／DOM／chrome 在同一揭露契約下，黑幕在其上，唯一 transfer overlay 在黑幕上方。

若使用全螢幕黑幕作保護，仍須修復各元件生命週期；不能只遮住錯誤，展開黑幕后舊未選字又出現。

Drei Html／其他 portal 必須放在受控掛載根或明確套用 entry gate。不要假設 Html 受 `.scene-shell` 的 opacity 控制。黑幕、Canvas、Html、transfer core 的 stacking context 要實際檢查。

在入口狀態就應用 gate，不用等 mount 後 `useEffect` 才隱藏，避免一影格露出內容。HTML／body 的初始背景也保持黑色，避免樣式載入前白閃。

必要時保持隱藏布局可量測，使用外層揭露容器與內層穩定 layout wrapper；不要 `display:none` 後量到 0×0，或拿縮放中的 rect 當最終目標。

### 4.4 渲染與資料提交

- outgoing snapshot 鎖定 `runId / sceneInstanceId / transitionId / round / retained / discarded / anchors`。
- 原來源可見時先量測再交接，不先隱藏再取 snapshot。
- swap 只在舊核心完全離場後；新 scene 可預備 layout，但視覺保持封閉。
- 正式 ready 只在 reveal 完成後發出；慢載入字型／必要布局也要納入準備條件。
- 保留有限的錯誤恢復策略；等待必要量測失敗時使用 2D／恢復 UI，不能默默隨機定位或永久黑屏。
- 同一 callback 驗證目前 identity；取消舊 timer、timeline、RAF 與 pending emitter，舊 callback 不得揭露舊場景。
- 禁止在跨場景過程把 Camera／Canvas 整個重建，造成可避免的閃爍或資源洩漏。

## 05. F1：Tokenization 原句殘留

### 根因基準

已審查版本的 `TokenizationScene.tsx` 一直渲染 `.token-question`，`stage.css` 在 `token-phase-2/3/4` 將原句設為 `opacity: .12`。這是 DOM/CSS 留下的可見句子，不是應先歸咎於 GPU 清屏的殘影。

### 修改要求

黑場與中央散射完成後，先生成既有完整問題；再啟動自動掃描拆分。六張卡片完成接手後，完整問題可見度為零，必要時淡出後卸載／設適當 visibility 與可存取性。

不要在入場直接展開六張卡片而略過句子拆分；這幕要保留「句子 → 單位」的理解過程。

離場只有六張卡片各自縮成光粒並匯向中央，不把原句當第七份 retained 資料。清除 hover／tooltip，移除舊的卡片列下方主光點。

重新播放時恢復初始句子與 local phase。禁止只加全域 `.token-question { display:none }` 來讓初始句子也消失。

### 驗收

初始句子可讀；拆分完成後至卸載都完全不可見；重播重複正常。六個 retained 來源對齊卡片中心，核心位於全舞台中心。入場 ready 前不能先跑完拆分計時。

## 06. F2：未選關聯字消散後重新出現

### 根因基準

既有 CSS 只在 `resolvingChoice` 淡化 discarded，在 `compacting`／`converging` 缺少持續隱藏，直到 `coreReady`／`exiting` 才再隱藏。`VectorWorld` 的 mesh／Line 另有 opacity，而 Html 字詞走 CSS，造成不同生命周期。

`VectorScene` 另有右上角控制副本；不能以 renderer filter 排除 snapshot 後，就讓這份可見字詞留在畫面。

### 單向可見度

```text
未選資料：live → dissolving → hidden（到 outgoing instance 卸載為止）
保留資料：live → compacting → proxy-to-core → hidden
```

不能因為 phase 換名，讓 hidden 回到 live。新的場景／新輪次才有新的 reveal lifecycle。下一幕合法使用相同概念，不等於應把上一幕舊節點重新顯示。

### 修改要求

統一處理 DOM、Html、mesh、Line、fallback、控制副本與 proxy。離場按 snapshot 固定角色，不能因 live state 改變把未選資料重新標成 retained。

WebGL 模式的右上角探索控制可保留鍵盤功能，但視覺離場作 chrome，不產生第二份重複節點。2D 模式則使用正確可見來源及對齊的代理。

未選粒子從自身文字／卡片範圍出發，向外移動並淡出；不轉向所選字或中央。被選文字短留約 0.2 秒後原地縮小，再匯入中央。

所有隱藏都要同時阻止非預期點擊／鍵盤焦點。`pointer-events:none` 不單獨充當互動鎖。

Vector 零選：只保留中央 childhood；周邊淡散，不強制補選。Vector 一或兩選：保留中央與 `exploredConceptIds` 中的節點；hover／拖曳不是選擇。Attention 按確認後才淘汰未選外觀，主／輔資料語意不變。

### 驗收

逐段取樣 resolvingChoice 後半、compacting、converging、coreReady、exiting、blackSwap：所有未選舊字、球、線與控制副本都不復現。要測 Vector 0／1／2 選與旋轉後確認，並覆蓋 Attention、Prediction。

## 07. F3：Attention 座標與版面

### 根因基準

`AttentionScene.tsx` 的 SVG 為 `viewBox="0 0 100 80"`，DOM 位置是 `top: position.y%`，SVG 的 y2 卻直接使用相同數字。y=65 對 DOM 是 65% 高度，對 SVG 是 65/80=81.25%，因此錯位。

既有 `preserveAspectRatio="none"` 也可能拉扁中央圓形；負 margin、min-height 與 absolute 控制區需要一併在小筆電視窗實測，而不是只換 80→100 就結束。

### 版面契約

使用不重疊的三區：

```text
問題／說明區
關聯圖區（使用剩餘空間）
輔助焦點／說明／確認區
```

優先局部 Grid/Flex、`min-height:0`；移除靠負 margin 把圖塞進標題的做法。更小視窗不足時可局部捲動，但指定筆電尺寸不得裁掉確認按鈕。不靠整頁 transform scale 掩蓋。

### 座標契約

以實際 map rect 與 node rect 為同一來源：

```text
SVG viewBox = 0 0 mapWidth mapHeight
nodeX = nodeRect.left - mapRect.left + nodeRect.width / 2
nodeY = nodeRect.top  - mapRect.top  + nodeRect.height / 2
```

連線終點可以是節點中心或 hub 指向節點的卡片邊緣交點，採一個一致契約並測試。不得穿過卡片後繼續延伸。hub 圓形用實際 pixel 半徑或不變形的 DOM 圓。

使用 ResizeObserver、字型載入與布局變動後重算；選中使用固定 border／outline，不因邊框尺寸改變推動節點。線條不攔截滑鼠。

黑場量測時用穩定 wrapper；展開中的位置與線條同步，避免卡片向外飛而線已固定在終點。離場核心仍在全舞台中央，不是 graph hub。

### 驗收

1280×720、1366×768、1440×900、1920×1080；五個主焦點、主＋輔、resize。連線與指定錨點誤差目標 ≤3 CSS px；圖形、標題、控制不相交；所有按鈕可操作，hub 不變成橢圓。

## 08. F4：Prediction 的資料流與字詞吸收

### 8.1 根因基準

已審查 `PredictionParticles.tsx` 的 `awaitingChoice`、`commit`、`complete` 進度目標停在 `0.84`；後半段仍用 orbit 與 sin/cos 持續漂浮，沒有完成抵達吸收。

粒子使用固定 `candidateAnchors`，DOM `.candidate-field` 又有不同的百分比布局，並未共用實測字詞位置。第 2 輪 distribution 的場景時長 0.4 秒，粒子 tween 仍 1.2 秒，亦不一致。

不要只加粒子，也不要只把 `.84` 改成 `1`。

### 8.2 與新進場規則銜接

先完成純黑 → 主光點到中央 → 向外展開本幕基本區域。到中央前不能有候選輪廓、前綴或 particle cloud。

展開時可生成句子前綴與候選位置的淡輪廓；候選文字與機率的完整顯示仍由後續「資料抵達」觸發。不要在通用散射中一次把候選全文和百分比全部打開。

本幕的 influx 是入場完成後的內部敘事，不再創造第二顆從邊緣入場的主傳送球。

### 8.3 分鏡

| 步驟 | 畫面與因果 |
|---|---|
| Influx | 從 2–3 個可辨認入口沿曲線湧入中央，前景少量亮點帶短拖尾，中景密集細流，背景稀疏 |
| Compression | 流入資料聚集、短暫壓縮，核心柔和增亮一次 |
| Distribution | 中央向候選 1、2、3 依序發出資料波；可稍微重疊，但能看出先後 |
| Absorption | 光點抵達實際字詞位置，抖動／深度偏移在尾段歸零，縮小淡出；字詞／邊框短暫回亮 |
| Ready | 三個候選完成吸收後，顯示固定示意機率與操作提示，才開放使用者選擇 |
| Choice | 未選向外粒子化，所選原地縮小 → 全舞台中央核心 → 黑場傳送 |

字詞之間的先後只是觀看順序，不代表模型真的逐詞計算這三個候選，也不代表第一個是推薦答案。

第一輪可以用 influx 1.4–1.8 秒、compression 0.45–0.65 秒、distribution＋absorption 1.8–2.2 秒作初始值；候選發射間隔約 0.35 秒，單波約 0.9–1.1 秒。第二輪縮為約 60–70%，由同一 config 同步所有時間。

### 8.4 粒子生命週期

每批／每粒子具有固定 seed、來源、目標、發射延遲、行進時間、吸收狀態；沿用 typed arrays／粒子池，不每顆建 React 元件。

```text
u = clamp((segmentTime - startDelay) / travelDuration, 0, 1)
position = path(u)
u = 1 → 真正抵達吸收點 → absorbed → 粒子及拖尾停止繪製
```

不可在 waiting 以 `fract(time)` 讓同一批無限重生。每條資料流的頭尾方向要清楚；不得全體一起抖動後停在字上方。

選擇前所有入流已吸收。選後的離場由共用轉場負責，不能把舊風暴再吸一次，造成 discarded 也被保留的錯覺。

### 8.5 同一套錨點與時間

量測 `.candidate-word` 的明確吸收點，換算到實際 canvas rect：

```text
u = (wordAnchorX - canvasRect.left) / canvasRect.width
v = (wordAnchorY - canvasRect.top) / canvasRect.height
ndcX = 2*u - 1
ndcY = 1 - 2*v
```

再依相機與明確效果平面換算 world position。不能 x/y 用 z=0 viewport 計算，終點卻留在另一深度，造成透視錯位。測 world→screen 回投影應對齊文字。

2D fallback 同樣消費實測 CSS 座標及時序，不另用未校正的固定 1000×600 裁切座標。resize、字型、換輪後重算。

`awaitingChoice` 要以所需資料波已吸收為條件，不是另一個獨立 timeout。React 只接受每批完成事件，不接受上千顆粒子的個別 setState。

### 8.6 驗收

兩輪都看得見來源 → 中央 → 三詞依序吸收。等待 10 秒仍沒有三團雜訊雲。選任何候選都能完成，無模型首選。第 1 輪光點離場才提交選擇一次，再黑場進第 2 輪，前綴保留；第 2 輪才進 Prediction Loop。

## 09. F5：第 6 幕 Prediction Loop｜慢一次，連續重複很多次

### 9.1 目標與範圍

把 `generation` 的視覺改成「預測 → 新片段加入上下文 → 使用更新內容再次預測」的循環引擎。觀眾能辨識自己在前一幕做過的選擇，現在正被反覆演出。

不是加一個 loading 圈，也不是左邊粒子動畫、右邊毫不相關的打字影片。不新增場景、不新增使用者選擇、不接模型。

環、資料流、候選可能性與回流是藝術化示意；本 MVP 播放預寫文字片段，不代表取得真實 hidden states、attention 權重或模型 token ID。

### 9.2 源碼銜接

先閱讀目前 `GenerationScene.tsx`、`selectAnswer`、`splitDisplayChunks`、`buildAnswer`、generation reducer 事件、`StageCanvas.tsx` 與共用轉場。

已核對固定版本的 Generation 使用 `selectAnswer`，以 `splitDisplayChunks(answer.remainingText)` 取得片段，再由 timeout 發 `GENERATION_TICK` 增加 `visibleChunkCount`。它不會等待飛行光點抵達。

**新循環要取代這個獨立打字排程，不是保留它再疊一個引擎。** `GENERATION_TICK` 等既有事件可沿用，但觸發時機改為對應光點抵達；完成事件需包含最後回流／視覺結束條件。

### 9.3 空間構圖

進場仍先純黑，主光點到全舞台中心後向外散射，形成：

| 區域 | 內容 |
|---|---|
| 左中部約 30–38% 寬位置 | 有 3D 深度的環形引擎，2–3 層不同傾角的細光軌與局部核心 |
| 右側 | 清楚的文字生成區，保留使用者已選前綴，後續逐片段加入 |
| 引擎與文字區之間 | 上行／外行的送出光路，以及另一條可辨識的回流光路 |
| 頂部或底部小區 | `PREDICT → APPEND → UPDATE CONTEXT → REPEAT`，按當前步驟亮起 |

引擎不是整個畫面的新中央傳送球。通用主球在揭露後交接並隱藏；引擎局部核心為本幕運算視覺；離場時才再匯回全舞台唯一傳送核心。

環可由現有 Three.js 幾何、曲線、Points／InstancedMesh 與柔光材質組成。沿用目前依賴；不需要導入重型物理模擬或外部影片。文字用 DOM 保持可讀，圖形與字區不可互相遮擋。

### 9.4 開場文案

主要標題：`NOW WATCH IT REPEAT.`

輔助短句：`你剛才選出的內容，會成為接下來每一步的上下文。`

小字：`固定文字片段的生成示意；不是即時模型運算。`

進場展開後才顯示文案；不要把它放在黑場上。若使用「你選了兩個」的字樣，稱為兩次文字選擇，不宣稱是兩個真實 tokenizer token；Presenter 模式沿用其原本來源註記。

### 9.5 一次慢速循環的完整因果（最重要）

```text
A. CONTEXT IN
   現有前綴／最新已加入片段，透過回流的資料脈衝連向引擎。
   右側文字保留，不被拿走，也不重頭清空。

B. PREDICT
   引擎內細流穿過數個環，局部匯集。
   短暫顯示下一個預寫片段，以及少量抽象的其他可能性。

C. RESOLVE
   抽象其他可能性向外淡散；留下本輪預定片段。
   該片段收成一個局部資料光點。

D. APPEND
   光點沿弧線離開引擎，前往文字區本輪插入錨點。
   光點抵達後才把 rawText 追加到顯示全文。

E. UPDATE CONTEXT
   剛加入的片段柔和亮起，標示「已加入上下文」。
   另一條回流光路從更新後的文字區回到引擎。
   這是資料副本／回饋脈衝，原文留在文字區。

F. REPEAT
   回流完成，步數 +1，才開始下一輪。
```

前 2–3 輪一定要看得見 E→F。若只有光點不斷射出、沒有更新後內容回到下一輪的訊號，就不足以傳達重複預測。

完整 question／前綴仍是業務資料中的上下文；回流畫面只是摘要視覺，不暗示模型只記得最後一個詞，也不表現成訓練用反向傳播。

### 9.6 候選示意：不要創造無關的假文字

自動 Loop 的確定片段只能來自當前回答 `remainingText`。其他可能性優先用 2 個抽象、淡色的無文字候選影子／點簇表現，不顯示臨時亂造的百分比或「模型會選」。

若專案已有對齊後續的明確示意候選 fixture，可利用；沒有就不用為每個詞編假候選。不要把 Scene 05 的三詞資料套在所有後續文字上。

Scene 05 仍然等人選；Scene 06 是既定路徑的自動續播，兩者不能因共用元件而混成自動替人選答案。

### 9.7 四段節奏與華麗感

| 段落 | 視覺與節奏 | 建議起始值 |
|---|---|---|
| 啟動 | 中央散射形成引擎；環依序亮起，前綴就位 | 通用 reveal 約 1 秒，不再另外播第二套入場 |
| 慢速理解 | 前 2–3 輪完整播放 context／predict／append／feedback | 每輪約 1.8–2.2 秒 |
| 加速 | 接續數輪逐步縮短，光軌逐漸連續，但文字仍按抵達追加 | 約 1.0 → 0.65 → 0.4 秒／輪 |
| 高速生成 | 密集、有方向的細流與短拖尾，局部核心維持平順亮度，片段計數連續增加 | 其餘輪次約 0.16–0.28 秒／輪，依全文長度微調 |
| 完成與收束 | 最後一輪回流結束，文字短留，環減速，回到通用中央收束 | 文字短留約 0.8 秒，收束沿用全域設定 |

整幕可先以約 16–26 秒調校，但不是硬性到時截斷。全文較長就延長；全文較短就降低慢速輪數。不能為了追求 13 秒或指定秒數漏片段、跳過剩餘文本或一口氣補上全文。

華麗感来自「深度、方向、逐漸連續的光軌、送出與回流的對照、節奏加速」，不是无限加粒子。場景最多一個輕微、緩慢的鏡頭推進，不大幅晃動。

慢速輪次可一次局部柔和脈衝；高速時改成重疊的亮度包絡與移動光帶，不每個片段做明暗開關。禁止高頻閃光、全畫面曝光、頻閃、強制鏡頭震動或突然音量變大。

### 9.8 文字資料與分段：一字不漏

只以既有 `selectAnswer`／`buildAnswer()` 的唯一結果為來源：

```text
selectedPrefix + remainingText === fullAnswer
initialVisibleText === selectedPrefix
finalVisibleText === fullAnswer
```

不用空白 split/join 改寫答案。可在 `splitDisplayChunks()` 結果上建立視覺循環步驟：把連續空白附到下一個非空白片段，最後尾端空白附到最後一步，並記錄該步覆蓋的原 chunk index 範圍。

```text
LoopStep（建議契約，不是既有型別）:
  stepIndex
  sourceStartChunkIndex
  sourceEndChunkExclusive
  rawText                    // 含原始空白、標點
  displayLabel               // 僅視覺標籤，可 trim，但不可寫回原文
  duration
```

必要不變式：

```text
steps.map(step => step.rawText).join("") === remainingText
```

純空白不做一次巨大引擎脈衝；零剩餘內容則直接短留並正常收束，不能產生不存在的詞。MVP 中「一步」是示意片段，不假稱真實 tokenizer token；UI 計數用 `新添片段 07 / 46`，不是無根據的真實 token 統計。

所有既有合法回答路線都要測試，不只 emotional→experiences。不能修改 `buildAnswer()`、scenario 或 Summary 來遷就動畫。

### 9.9 文字抵達與下一輪開始的守門

```text
本輪光點抵達文字錨點
→ 驗證 run / sceneInstance / stepIndex
→ 提交對應 rawText 恰好一次
→ 更新 visibleChunkCount（或相容欄位）
→ 文字與上下文回饋動畫
→ contextReadyForNextStep
→ 下一輪
```

Scene 06 的自動片段不是使用者 Prediction choices；不要污染原本兩次選擇紀錄或 Summary 的「你選了什麼」。

同一 controller／時間模型控制環、送出、追加、回流與步數。關閉既有獨立打字 timer；沒有「動畫還在路上，但字先出現」的第二條資料通道。

資料提交可仍是每步一次 reducer event，粒子位置與環角度放 ref／buffer。高速度下不能累積已過期 callback。分頁暫停時主時間軸與文字提交一起暫停。

全文已追加，不等於立刻跳 Output。要等最後回饋／拖尾完成、完整文字短留，再請求全域離場一次。

### 9.10 插入位置不能跑偏

每輪抵達的是「下一個可見片段將插入的位置」，不是永遠右側固定點。文字換行或字型變化後仍須正確。

可用同尺寸字型的不可見量測副本／預留行布局／Range 量測預測插入位置，避免等文字顯示了才知道光點應飛去哪裡。量測副本不能在黑場或展開中洩漏，也不能被當成第二份 retained。

可將終點定在新片段首個可見字附近；採一致錨點契約、保證 final world→screen 投影匹配。跨行時不能把點送到上行舊 caret，卻在下一行顯示字。

右側長文可局部跟隨最新行，不抖動整個舞台。上一段已生成文字保留；Output 再提供完整安靜閱讀。

### 9.11 低動態與 2D 也要理解「循環」

2D fallback 使用同一份步驟資料與時間事件，以環形 SVG／Canvas 曲線、少量亮點、回流路徑與文字追加呈現，不退回完全無關的普通打字動畫。

reduced motion 以步驟標示、短淡變與局部光點交接取代高速旋轉／大幅移動，仍呈現 append 後 context 更新再 repeat。可以較快，但不改答案、不變成自動第三次選擇。

### 9.12 本幕結束

停止新的發射，完成最後回流。回答文字按可見行／段縮成 retained 小光粒；環與結構平順收縮退去。保留資料匯入全舞台中心，所有其他畫面完全消失，只剩主光點。

不要只讓 caret 飛走而整篇文字直接消失。不要把每個環或裝飾粒子聲稱成真實 token。

主球完全離場 → 純黑 Output → 同一主球進中央 → 向外生成最終答案。安靜收尾與剛才高速形成對比。

## 10. F6：各幕「中央散射」的具體目標

| 畫面 | 中央到外圍如何生成 | 完成後才啟動什麼 |
|---|---|---|
| Input | 光束由中央展開手機外框／內容區，再出現按住按鈕 | 模擬按住輸入，不自動送出 |
| Tokenization | 中央光粒展開為完整句子與工作區；不是預先鋪好六卡 | 自動掃描、拆分、原句消失 |
| Vector | 中央產生 childhood，外圍光粒飛到各 3D 節點，再生成字詞與連線 | 拖曳、0–2 個概念選取 |
| Attention | 中央散射到各節點，字詞／連線跟隨生成，操作區最後出現 | 主／輔焦點與確認 |
| Prediction R1 | 中央展開前綴與處理區／候選淡輪廓 | 內部 influx、候選依序吸收、等待人選 |
| Prediction R2 | 黑場重新進中央，再揭露更新前綴與本輪區域 | 較快但完整的資料流與第二次人選 |
| Prediction Loop | 中央粒子分成引擎與文字區；已選前綴生成後環啟動 | 慢速循環，再加速續播 |
| Output | 中央光束向上下／左右展開問題與完整答案 | 讀者自己決定查看路徑 |
| Summary | 中央光束展開收據；內容與紙面一起生成，不先露出白紙 | 查看紀錄或重新體驗 |

此表有九列，是因為 Prediction 分兩輪；邏輯場景仍八幕。

## 11. 時間、效能、尺寸與取消

### 11.1 沿用技術

保留 React／TypeScript、GSAP、React Three Fiber／Three.js 與既有測試工具。先確認 `package.json`／lockfile，不為本次視覺重建專案、增加遊戲引擎或大量新套件。

可增設小型共用模組，如 entry reveal adapter、anchor registry、loop timeline／steps helper。以上名稱是建議，不代表 repo 已有這些 API。

### 11.2 共用錨點

所有 DOM／WebGL／fallback 與 proxy 使用可追溯的同一座標來源。區分 stageRect、canvasRect、mapRect，不混用 drawing-buffer px 與 CSS px，不多乘 devicePixelRatio。

layout 穩定後量測；resize／字型／換輪後更新；離場先鎖 snapshot，避免縮小中重新測量造成路徑吸向錯位位置。正在行進的資料可用 normalized 曲線連續重算，不能突然瞬移。

### 11.3 性能上限

沿用既有 low／medium／high 預算，粒子池可重用。黑場與未啟動的 scene 不持續發射；文字 ready 後已吸收粒子停止繪製。高速感以速度與清楚路徑為主，不以每輪新增幾千粒子累積。

避免每粒子 DOM／React 元件、每幀 new geometry／material、每幀全畫面 DOM 量測。cleanup 釋放不再使用的資源與 listeners，避免每次重播多一份動畫。

### 11.4 中斷與重入

所有完成事件帶有效的 `runId / sceneInstanceId / transitionId`，Loop 再帶 stepIndex；無需 transfer 的內部步驟以自己的合法 identity 驗證，不憑空使用舊 transitionId。

Reset／跳場：停止來源 emitter、GSAP timeline、RAF、打字／phase timers、代理和未提交事件，清理黑幕／gate，對目的幕重新啟動合法入場。

- 已提交的 Prediction 選擇不得重複 append。
- 取消中的未提交選擇不得在另一幕被舊 callback 提交。
- generation 片段只提交一次，不跳號，不因重播還原錯誤。
- WebGL context lost 後保留業務資料，轉 2D，按同一已提交進度安全恢復；不得自動替使用者選候選。
- 分頁隱藏時暫停整套時間；恢復不以牆鐘一次跳到片尾。

## 12. 實作順序（完成全部，不停在前兩項）

### A. 基線與共用控制

重讀現有程式、記錄工作樹狀態，找出四個根因是否仍存在。先補可見度／單次提交／座標的回歸測試。建立同一 black gate、入口狀態與中央 reveal，保留舊有效邏輯。

### B. 修復 Tokenization 與未選復現

以 Tokenization 做全流程參考：黑場 → 中央展開句子 → 六卡拆分 → 原句完全退去 → 六源收束 → 主球離場。再把單向隱藏與選擇型離場套到 Vector、Attention、Prediction。

### C. 修 Attention 與共用錨點

先修正局部布局與線端點，再建立／整理可供 Prediction、Loop 使用的實測座標機制。

### D. 重構 Prediction 資料流

完成三條依序發射、抵達、吸收，以及兩輪的一致時間模型。不能保留舊 particle cloud 當等待畫面。

### E. 實作 Prediction Loop

先用少量粒子完成「回流 → 預測 → 送出 → 追加 → 回流」的正確因果，再加環的深度、光軌、速度與粒子密度。移除原本獨立文字 timer。

### F. 套齊八幕與驗收

檢查初始 Input、同幕換輪、Output、Summary、重播、Reset、2D、低動態。跑所有可用檢查，留下新版視覺證據，更新完成報告。

## 13. 自動測試與實際畫面驗收

### 13.1 工程命令

以實際 package scripts 為準，沿用 lockfile 安裝依賴。既有命令若存在，執行：

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

缺依賴、沒有瀏覽器或環境不支援時，記錄實際錯誤。不私自批次升級套件湊成功，不宣稱未執行的命令通過。

### 13.2 必測項目

| 範圍 | 通過條件 |
|---|---|
| 黑場 | 所有新幕與 R2 光點出現前純黑；header／footer／Html／背景／tooltip 均不可見 |
| 入場時序 | 光點抵達中央之前沒有任何 scene 內容；抵達後才開始中心散射；ready 在 reveal 後 |
| 散射 | 主要資料群由中央往各目標生成，有來源、行進與抵達，不是全頁同時淡入 |
| 初次 Input | 不先露出 UI；入場後可按住；沒有死鎖或自動送出 |
| 原句殘留 | 初始有句子，六卡接手後 opacity 為零／卸載；之後不復現；重播正常 |
| 未選復現 | Vector 0／1／2 選、旋轉後確認；所有離場中間 phase 的字／球／線／副本皆不復現 |
| Attention | 五主焦點及輔助、四種尺寸、resize；端點對齊 ≤3 CSS px；控制可見、圓形不扁 |
| Prediction | 三詞依序流入、抵達並吸收；等待 10 秒乾淨；兩輪與所有合法候選均可選 |
| Loop 步驟 | 慢速輪能辨識 append→context update→repeat；高速仍同順序；不每輪整幕黑場 |
| Loop 文字 | 光點抵達前不追加、抵達後只追加一次；換行錨點正確；最終逐字等於 fullAnswer |
| Loop 計數 | 計數對應示意片段，空白不製造假 token 脈衝；兩次使用者 choice 紀錄不增加 |
| 數據回歸 | 原有全部合法回答組合、answerId、selectedPrefix、Summary 不變 |
| 傳送 | 全局中心 (0.5,0.5)，一顆主球；球、暈、拖尾完全離場後才 swap |
| 完成時序 | 最後片段與回流完成→短留→收束→黑場 Output，無時間到截斷 |
| 閱讀 | Output／Summary 不自動離場，不在閱讀中突然黑屏 |
| 中斷 | influx／dissolve／converge／blackHold／expanding／Loop append 等時機 Reset 舊回呼失效 |
| Renderer | WebGL 與 `?renderer=2d`、low／medium、reduced motion 都維持同資料因果 |

### 13.3 不只檢查 phase 名稱與 DOM 數量

應觀察 actual computed style、祖先 gate、Html portal、可見粒子與實際幾何，不只 `toHaveCount` 或 `data-phase`。

- 黑場影像驗證以 `#stage-root` 截圖為準，排除瀏覽器外框／游標。純黑階段可設定每色通道接近 0 的小容差；光點飛行階段只允許核心與拖尾 ROI 有亮度，其餘背景仍黑。不要把 header 區排除測試。
- 純黑 frame、核心中途 frame、中央停留 frame、散射中途 frame、ready frame 必須分開驗證。
- 對消散後的 compacting／converging 等各階段採樣，確保 hidden 不只在最後一幕成立。
- 對文字／連線／粒子做座標斷言；必要時提供只在開發測試使用的 projected endpoint／active particle 統計。
- Loop 事件要記錄 `step start → token arrival → append → context ready → next step` 的順序與完整字串。
- 可使用測試時鐘／seek hook，但它必須驅動真正的動畫與材質，不是只改 data 屬性假裝驗收。不要用測試腳本手動隱藏元素來修飾截圖。
- 至少有一條真正 WebGL 的 Vector→Attention→Prediction→Loop 連續流程；不能只測 2D。

### 13.4 證據交付

本版證據建議另放 `artifacts/integrated-upgrade/`，保留舊圖不覆蓋。各組記錄 viewport、renderer、quality、reducedMotion、路線、工作樹版本與是否正常時間播放。

必需證據：

1. 一次完整「舊球離場→純黑→新球進場→中央→四散→ready」短錄影或連續影格。
2. Tokenization 初始原句、六卡接手、無原句殘留、離場。
3. Vector 未選消散到卸載的中間連續畫面，包含旋轉與控制副本。
4. Attention 1280×720 與 1920×1080 的完整畫面與實測端點。
5. Prediction R1 三詞依序吸收、等待 10 秒、R2 正常重複。
6. Prediction Loop 前 2–3 次慢速完整循環、加速、更新後文字回流、最後收束到黑場 Output。
7. 2D 與 reduced motion 的代表路徑。

一張靜態截圖無法證明動畫方向或無一影格洩漏。沒有瀏覽器／錄影工具時明確列為待人工驗收，不以 build 成功替代。

## 14. 完成報告與交付物

更新 `IMPLEMENTATION_STATUS.md`：六個 P0 分別列出修改檔案、原因、實作、實際測試結果、畫面證據、未驗證項目與已知限制。

列出啟動方式及如何用既有演示工具重播 Tokenization、兩輪 Prediction、Loop、入場轉場。保留已完成的使用者修改，不加無關功能。

最終交付：可運行修改版、必要測試、實際證據與狀態報告。若有未完成項目，精確說明，不把未驗證的視覺稱為已完成。

## 15. 審查基準與來源

四個根因整合自 `Before_the_Answer_Code_Review_Fix_Prompt.md`；資料與前綴契約來自原 MVP 規格及既有程式；本版新增全黑 gate、中央展開、Prediction Loop 的行為要求。所有動畫秒數／尺寸容差是設計與驗收目標，不是現有量測數據。

原始碼基準位置如下。實作時以當下工作目錄為準，不回滾到這些連結：

```text
https://github.com/Adrian-Kao/dct-mvp/tree/13b9504cacc407b52a61bfca26047c83658b7196
https://github.com/Adrian-Kao/dct-mvp/blob/13b9504cacc407b52a61bfca26047c83658b7196/src/scenes/GenerationScene.tsx
https://github.com/Adrian-Kao/dct-mvp/blob/13b9504cacc407b52a61bfca26047c83658b7196/src/scenes/TokenizationScene.tsx
https://github.com/Adrian-Kao/dct-mvp/blob/13b9504cacc407b52a61bfca26047c83658b7196/src/scenes/AttentionScene.tsx
https://github.com/Adrian-Kao/dct-mvp/blob/13b9504cacc407b52a61bfca26047c83658b7196/src/scenes/PredictionScene.tsx
https://github.com/Adrian-Kao/dct-mvp/blob/13b9504cacc407b52a61bfca26047c83658b7196/src/visual/PredictionParticles.tsx
https://github.com/Adrian-Kao/dct-mvp/blob/13b9504cacc407b52a61bfca26047c83658b7196/src/visual/VectorWorld.tsx
https://github.com/Adrian-Kao/dct-mvp/blob/13b9504cacc407b52a61bfca26047c83658b7196/src/styles/stage.css
```

---

## 最後驗收原則

**不是「有粒子、有黑底、有圓環」就算完成。**

觀眾必須看見：

```text
黑場 → 光點到中央 → 資料向外展開
看見／探索／選擇 → 未選消散 → 所選收束 → 傳送
預測 → 新片段加入 → 上下文更新 → 再預測
最後，整個過程重新收成一顆光，再展開為安靜的完整答案。
```

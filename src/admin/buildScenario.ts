import type { InputToken, ScenarioFixture, Vec3 } from "../data/scenarioTypes";
import { nearestWords } from "../data/vectorSpace";
import type { Tokenizer } from "./tokenizer";

/** Slots that were tuned so each locked word needs a few turns of the dial (see station 2). */
const LOCK_SLOTS: Vec3[] = [[1.7, 0.6, 0.5], [-1.6, 0.3, 1.3], [0.4, 1.3, -1.5], [-0.7, -1.5, -1.0]];
const OTHER_SLOTS: Vec3[] = [[1.2, -1.1, 1.7], [1.0, 2.0, -2.3], [-2.2, 1.6, -0.4], [2.3, -0.2, -1.6], [-0.3, -2.1, 2.0], [-2.4, -0.9, 0.2]];

/** Generic background words for the star field (far from every question word). */
export const FILLER_WORDS = "黑洞 時間 家 價格 咖啡 城市 雨 海 星星 月亮 鍵盤 電腦 火車 機場 手機 股票 銀行 貓 狗 花 樹 山 河流 夏天 冬天 早晨 夜晚 音樂 電影 書 照片 信 禮物 生日 學校 老師 考試 工作 薪水 會議 餐廳 麵包 米飯 蘋果 顏色 藍色 紅色 光 影子 聲音 安靜 速度 重量 溫度 火山 地震 宇宙 銀河 數學 物理 化學 程式 網路 演算法 足球 籃球 跑步 旅行 地圖 護照 窗戶 門 椅子 桌子 杯子 衣服 鞋子 雨傘 鏡子 時鐘 眼淚 微笑 擁抱 夢 睡眠 醫院 藥 健康 法律 選舉 歷史 未來 過去 明天 森林 沙漠 雲 風 島 橋 公園 市場 報紙 電話 鉛筆 紙 鑰匙 燈 枕頭".split(" ");

const PUNCTUATION = /^[\s\p{P}\p{S}]+$/u;
export const isContent = (text: string) => !PUNCTUATION.test(text);

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);
  return hash >>> 0;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function makeInputTokens(pieces: string[], tokenizer: Pick<Tokenizer, "idFor">): InputToken[] {
  return pieces.map((text, index) => ({ id: `t${String(index + 1).padStart(2, "0")}`, text, tokenId: tokenizer.idFor(text) }));
}

/** Default words to lock in station 2: distinct content words, longest first, at most 4. */
export function defaultLockOrder(tokens: InputToken[]): string[] {
  const seen = new Set<string>();
  return tokens
    .filter((token) => isContent(token.text) && !seen.has(token.text) && seen.add(token.text))
    .map((token, index) => ({ token, index }))
    .sort((a, b) => b.token.text.trim().length - a.token.text.trim().length || a.index - b.index)
    .slice(0, 4)
    .map((item) => item.token.id);
}

/** Default clue words: content words of the answer, dealt round-robin to the locked words. */
export function defaultNeighbors(tokens: InputToken[], lockOrder: string[], answerTokens: string[], perToken = 3): Record<string, string[]> {
  const questionTexts = new Set(tokens.map((token) => token.text.trim()));
  const pool = [...new Set(answerTokens.map((text) => text.trim()).filter((text) => isContent(text) && text.length >= 2 && !questionTexts.has(text)))];
  const fallback = FILLER_WORDS.slice(-12);
  const result: Record<string, string[]> = {};
  lockOrder.forEach((id) => { result[id] = []; });
  let cursor = 0;
  for (let round_ = 0; round_ < perToken; round_ += 1) {
    for (const id of lockOrder) {
      result[id].push(pool[cursor] ?? fallback[cursor % fallback.length]);
      cursor += 1;
    }
  }
  return result;
}

/** Place question words, their neighbours (close by) and filler words (far away) in the star field. */
export function layoutVectorSpace(tokens: InputToken[], lockOrder: string[], neighbors: Record<string, string[]>, seed: number): ScenarioFixture["vectorSpace"] {
  const random = mulberry32(seed);
  const byText = new Map<string, Vec3>();
  let other = 0;
  const lockTexts = lockOrder.map((id) => tokens.find((token) => token.id === id)!.text);
  lockTexts.forEach((text, index) => byText.set(text, LOCK_SLOTS[index % LOCK_SLOTS.length]));
  for (const token of tokens) {
    if (byText.has(token.text)) continue;
    const slot = OTHER_SLOTS[other] ?? [round(random() * 4 - 2), round(random() * 4 - 2), round(random() * 4 - 2)];
    other += 1;
    byText.set(token.text, slot);
  }
  const tokenPositions = Object.fromEntries(tokens.map((token) => [token.id, byText.get(token.text)!]));

  const words: ScenarioFixture["vectorSpace"]["words"] = [];
  const used = new Set<string>(tokens.map((token) => token.text.trim()));
  lockOrder.forEach((id) => {
    const origin = tokenPositions[id];
    (neighbors[id] ?? []).forEach((text, rank) => {
      if (!text || used.has(text)) return;
      used.add(text);
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 2 - 1);
      const distance = 0.28 + rank * 0.14;
      words.push({ text, position: [round(origin[0] + distance * Math.sin(phi) * Math.cos(theta)), round(origin[1] + distance * Math.cos(phi)), round(origin[2] + distance * Math.sin(phi) * Math.sin(theta))] });
    });
  });
  const anchors = Object.values(tokenPositions);
  for (const text of FILLER_WORDS) {
    if (used.has(text)) continue;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const position: Vec3 = [round(random() * 5.4 - 2.7), round(random() * 4.4 - 2.2), round(random() * 5.4 - 2.7)];
      if (anchors.every((anchor) => Math.hypot(anchor[0] - position[0], anchor[1] - position[1], anchor[2] - position[2]) > 1.05)) {
        words.push({ text, position });
        used.add(text);
        break;
      }
    }
  }
  return { lockOrder, minLocks: Math.min(2, lockOrder.length), maxLocks: lockOrder.length, neighborCount: 3, tokenPositions, words };
}

/** Current clue words of each locked token, read back from the star field. */
export function neighborsOf(scenario: ScenarioFixture): Record<string, string[]> {
  return Object.fromEntries(scenario.vectorSpace.lockOrder.map((id) => [id, nearestWords(scenario, id).map((word) => word.text)]));
}

/** Illustrative attention: content words and keywords draw more, neighbours a little, punctuation little. */
export function defaultAttention(tokens: InputToken[], keywordTokenIds: string[]): ScenarioFixture["attention"] {
  const keywordTexts = new Set(keywordTokenIds.map((id) => tokens.find((token) => token.id === id)?.text));
  const weights: Record<string, number[]> = {};
  tokens.forEach((query, i) => {
    const scores = tokens.map((key, j) => {
      if (!isContent(key.text)) return 0.25;
      return 0.6 + (keywordTexts.has(key.text) && key.text !== query.text ? 1.6 : 0) + (Math.abs(i - j) === 1 ? 0.5 : 0) + (i === j ? 0.7 : 0) + Math.min(0.6, key.text.trim().length * 0.15);
    });
    weights[query.id] = normalizeRow(scores);
  });
  return { keywordTokenIds, weights, notes: {} };
}

export function normalizeRow(values: number[]): number[] {
  const safe = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0.01));
  const total = safe.reduce((sum, value) => sum + value, 0);
  const row = safe.map((value) => value / total);
  // Push float error into the largest cell so the row adds to exactly 1 for the validator.
  const drift = 1 - row.reduce((sum, value) => sum + value, 0);
  const largest = row.indexOf(Math.max(...row));
  row[largest] += drift;
  return row;
}

export interface DraftInput {
  question: string;
  answer: string;
  questionPieces: string[];
  answerPieces: string[];
}

/** Build a complete, valid scenario from a question and an answer. Every part can be edited afterwards. */
export function draftScenario(input: DraftInput, tokenizer: Pick<Tokenizer, "idFor">): ScenarioFixture {
  const seed = hashSeed(input.question + input.answer);
  const inputTokens = makeInputTokens(input.questionPieces, tokenizer);
  const lockOrder = defaultLockOrder(inputTokens);
  const vectorSpace = layoutVectorSpace(inputTokens, lockOrder, defaultNeighbors(inputTokens, lockOrder, input.answerPieces), seed);
  const attention = defaultAttention(inputTokens, lockOrder.slice(0, 3));
  return {
    id: `custom-${seed.toString(36)}`,
    question: input.question,
    seed,
    tokensAreIllustrative: true,
    probabilitiesAreIllustrative: true,
    inputTokens,
    vectorSpace,
    attention,
    answer: { id: `custom-answer-${seed.toString(36)}`, tokens: input.answerPieces },
  };
}

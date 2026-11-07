import type { ExperienceState, StationCardState } from "../app/experienceReducer";
import type { SceneId } from "../app/sceneOrder";
import type { ScenarioFixture } from "./scenarioTypes";

export interface StationCardContent {
  /** Small line above the title, e.g. "站 2 / 5". */
  kicker: string;
  title: string;
  lines: string[];
  /** Which station dot (0–5) is lit on the progress row. */
  station: number;
}

const STATIONS: Partial<Record<SceneId, { number: number; name: string }>> = {
  input: { number: 0, name: "入口" },
  tokenization: { number: 1, name: "切字" },
  vector: { number: 2, name: "向量" },
  attention: { number: 3, name: "接龍" },
  generation: { number: 4, name: "生成" },
  output: { number: 5, name: "輸出" },
};

export const STATION_DOTS = ["入口", "切字", "向量", "接龍", "生成", "輸出"];

const INTRO: Partial<Record<SceneId, { title: string; lines: string[] }>> = {
  input: { title: "成為 AI", lines: ["站到鏡頭前，系統會把你掃描成一個節點組成的影像。", "掃描完成後，你就是一個語言模型，要替上一位觀眾回答問題。"] },
  tokenization: { title: "把問題切開", lines: ["AI 不是一個字一個字讀句子的。", "揮刀把問題劈開，看看 AI 會把它切成哪幾塊。"] },
  vector: { title: "找出字的位置", lines: ["每一塊字，在意義的星空裡都有自己的位置。", "轉動星空，鎖定問題裡重要的字，看看哪些字靠近它。"] },
  attention: { title: "一次接一個詞", lines: ["AI 回答時，一次只決定「下一個詞」。", "轉動機率轉盤，抽出答案的開頭。"] },
  generation: { title: "讓答案長出來", lines: ["答案不是一次寫好的，是一個詞接一個詞長出來的。", "壓水泵，讓剩下的答案一個一個冒出來。"] },
  output: { title: "答案完成", lines: ["這就是 AI 交出去的回答。", "讀完以後，回頭看看這個答案是怎麼來的。"] },
};

function outroLines(scene: SceneId, state: ExperienceState, scenario: ScenarioFixture): { title: string; lines: string[] } {
  switch (scene) {
    case "input":
      return { title: "你現在是一個語言模型", lines: [state.avatar ? `你的模型編號是 ${state.avatar.modelNumber}。` : "掃描完成。", "下一站：打開上一位觀眾的問題，把它切開。"] };
    case "tokenization":
      return { title: "問題切好了", lines: [`問題被切成 ${scenario.inputTokens.length} 塊，每一塊都換成一個編號。`, "下一站：把這些編號放進星空，找出它們的意思。"] };
    case "vector": {
      const words = state.vector.lockedTokenIds.map((id) => scenario.inputTokens.find((token) => token.id === id)?.text.trim() ?? id);
      return { title: "星座連好了", lines: [words.length ? `你鎖定了「${words.join("」「")}」。` : "你看過了字在星空裡的位置。", "下一站：AI 要開始接話了，一次抽一個詞。"] };
    }
    case "attention": {
      const kept = state.prediction.picks.filter((pick) => pick.kept).map((pick) => pick.text).join("");
      return { title: "答案有開頭了", lines: [kept ? `你抽出了答案的開頭：「${kept}」。` : "答案的開頭抽好了。", "下一站：用水泵把剩下的答案接下去。"] };
    }
    case "generation":
      return { title: "答案長好了", lines: [`答案一共接了 ${scenario.answer.tokens.length} 塊。`, "下一站：看看完整的回答。"] };
    case "output":
      return { title: "回答送出", lines: ["這個答案會交給下一位觀眾。", "最後：回顧你剛剛走過的路。"] };
    default:
      return { title: "", lines: [] };
  }
}

export function stationCardContent(card: StationCardState, state: ExperienceState, scenario: ScenarioFixture): StationCardContent | null {
  const station = STATIONS[card.scene];
  if (!station) return null;
  if (card.kind === "intro") {
    const intro = INTRO[card.scene]!;
    return { kicker: `站 ${station.number} / 5 · ${station.name}`, title: intro.title, lines: intro.lines, station: station.number };
  }
  const outro = outroLines(card.scene, state, scenario);
  return { kicker: `站 ${station.number} 完成`, title: outro.title, lines: outro.lines, station: station.number };
}

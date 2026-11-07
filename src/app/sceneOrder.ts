export const sceneOrder = [
  "input",
  "tokenization",
  "vector",
  "attention",
  "generation",
  "output",
  "summary",
] as const;

export type SceneId = (typeof sceneOrder)[number];

export const sceneLabels: Record<SceneId, string> = {
  input: "站 0 · 入口",
  tokenization: "站 1 · 切字",
  vector: "站 2 · 向量化",
  attention: "站 3 · 注意力",
  generation: "站 4 · 生成",
  output: "站 5 · 輸出",
  summary: "回顧",
};

export function nextScene(scene: SceneId): SceneId | null {
  const index = sceneOrder.indexOf(scene);
  return sceneOrder[index + 1] ?? null;
}

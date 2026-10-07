export const sceneOrder = [
  "input",
  "tokenization",
  "vector",
  "attention",
  "prediction",
  "generation",
  "output",
  "summary",
] as const;

export type SceneId = (typeof sceneOrder)[number];

export const sceneLabels: Record<SceneId, string> = {
  input: "INPUT",
  tokenization: "TOKENIZATION",
  vector: "VECTOR / EMBEDDING",
  attention: "ATTENTION",
  prediction: "PREDICTION",
  generation: "GENERATION",
  output: "OUTPUT",
  summary: "SUMMARY / TAKE AWAY",
};

export function nextScene(scene: SceneId): SceneId | null {
  const index = sceneOrder.indexOf(scene);
  return sceneOrder[index + 1] ?? null;
}

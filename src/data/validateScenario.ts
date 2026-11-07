import type { ScenarioFixture } from "./scenarioTypes";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid scenario: ${message}`);
}

export function validateScenario(value: unknown): ScenarioFixture {
  assert(typeof value === "object" && value !== null, "root must be an object");
  const data = value as Record<string, unknown>;
  for (const key of ["id", "question", "questionZh"] as const) {
    assert(typeof data[key] === "string" && data[key].length > 0, `${key} is required`);
  }
  assert(typeof data.seed === "number" && Number.isInteger(data.seed), "seed must be an integer");
  assert(data.tokensAreIllustrative === true, "tokens must be marked illustrative");
  assert(data.probabilitiesAreIllustrative === true, "probabilities must be marked illustrative");
  assert(Array.isArray(data.inputTokens) && data.inputTokens.length > 0, "inputTokens are required");
  const tokenIds = new Set<string>();
  data.inputTokens.forEach((token, index) => {
    assert(typeof token === "object" && token !== null, `inputTokens[${index}] must be an object`);
    const item = token as Record<string, unknown>;
    assert(typeof item.id === "string" && item.id.length > 0, `inputTokens[${index}].id is required`);
    assert(!tokenIds.has(item.id), `duplicate token id ${item.id}`);
    tokenIds.add(item.id);
    assert(typeof item.text === "string" && item.text.length > 0, `inputTokens[${index}].text is required`);
  });
  const rebuilt = (data.inputTokens as Array<{ text: string }>).map((item) => item.text).join("");
  assert(rebuilt === data.question, "inputTokens must reconstruct question exactly");

  assert(Array.isArray(data.vectorNodes) && data.vectorNodes.length === 9, "vectorNodes must contain nine nodes");
  data.vectorNodes.forEach((node, index) => {
    assert(typeof node === "object" && node !== null, `vectorNodes[${index}] must be an object`);
    const item = node as Record<string, unknown>;
    assert(typeof item.id === "string" && typeof item.label === "string", `vectorNodes[${index}] needs id and label`);
    assert(Array.isArray(item.position) && item.position.length === 3 && item.position.every(Number.isFinite), `vectorNodes[${index}] needs a 3D position`);
    assert(typeof item.selectable === "boolean", `vectorNodes[${index}].selectable is required`);
  });
  const tokenCount = data.inputTokens.length;
  assert(typeof data.attention === "object" && data.attention !== null, "attention is required");
  const attention = data.attention as Record<string, unknown>;
  assert(Array.isArray(attention.keywordTokenIds) && attention.keywordTokenIds.length > 0, "attention.keywordTokenIds are required");
  attention.keywordTokenIds.forEach((id) => assert(tokenIds.has(id as string), `unknown attention keyword ${String(id)}`));
  assert(typeof attention.weights === "object" && attention.weights !== null, "attention.weights are required");
  const rows = attention.weights as Record<string, unknown>;
  tokenIds.forEach((id) => {
    const row = rows[id];
    assert(Array.isArray(row) && row.length === tokenCount, `attention.weights.${id} must have ${tokenCount} values`);
    assert(row.every((weight) => typeof weight === "number" && Number.isFinite(weight) && weight > 0), `attention.weights.${id} weight must be positive`);
    const sum = (row as number[]).reduce((total, weight) => total + weight, 0);
    assert(Math.abs(sum - 1) < 1e-6, `attention.weights.${id} must add to 1 (received ${sum})`);
  });

  assert(typeof data.answer === "object" && data.answer !== null, "answer is required");
  const answer = data.answer as Record<string, unknown>;
  assert(typeof answer.id === "string" && answer.id.length > 0, "answer.id is required");
  assert(Array.isArray(answer.tokens) && answer.tokens.length > 0, "answer.tokens are required");
  answer.tokens.forEach((token, index) => assert(typeof token === "string" && token.length > 0, `answer.tokens[${index}] must be a non-empty string`));
  return data as unknown as ScenarioFixture;
}

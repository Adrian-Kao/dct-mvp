import type { ScenarioFixture } from "./scenarioTypes";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid scenario: ${message}`);
}

export function validateScenario(value: unknown): ScenarioFixture {
  assert(typeof value === "object" && value !== null, "root must be an object");
  const data = value as Record<string, unknown>;
  for (const key of ["id", "question"] as const) {
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
    assert(typeof item.tokenId === "number" && Number.isInteger(item.tokenId), `inputTokens[${index}].tokenId must be an integer`);
  });
  const rebuilt = (data.inputTokens as Array<{ text: string }>).map((item) => item.text).join("");
  assert(rebuilt === data.question, "inputTokens must reconstruct question exactly");

  const isVec3 = (value: unknown) => Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n));
  assert(typeof data.vectorSpace === "object" && data.vectorSpace !== null, "vectorSpace is required");
  const space = data.vectorSpace as Record<string, unknown>;
  assert(Array.isArray(space.lockOrder) && space.lockOrder.length > 0, "vectorSpace.lockOrder is required");
  space.lockOrder.forEach((id) => assert(tokenIds.has(id as string), `unknown lock token ${String(id)}`));
  assert(typeof space.minLocks === "number" && typeof space.maxLocks === "number" && space.minLocks >= 1 && space.minLocks <= space.maxLocks && space.maxLocks <= space.lockOrder.length, "vectorSpace lock limits are invalid");
  assert(typeof space.neighborCount === "number" && space.neighborCount >= 1, "vectorSpace.neighborCount is required");
  assert(typeof space.tokenPositions === "object" && space.tokenPositions !== null, "vectorSpace.tokenPositions are required");
  tokenIds.forEach((id) => assert(isVec3((space.tokenPositions as Record<string, unknown>)[id]), `vectorSpace.tokenPositions.${id} needs a 3D position`));
  assert(Array.isArray(space.words) && space.words.length >= 20, "vectorSpace.words needs at least 20 words");
  space.words.forEach((word, index) => {
    const item = word as Record<string, unknown>;
    assert(typeof item.text === "string" && item.text.length > 0 && isVec3(item.position), `vectorSpace.words[${index}] needs text and a 3D position`);
  });

  const tokenCount = data.inputTokens.length;
  if (data.attention !== undefined) {
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
  }

  assert(typeof data.answer === "object" && data.answer !== null, "answer is required");
  const answer = data.answer as Record<string, unknown>;
  assert(typeof answer.id === "string" && answer.id.length > 0, "answer.id is required");
  assert(Array.isArray(answer.tokens) && answer.tokens.length > 0, "answer.tokens are required");
  answer.tokens.forEach((token, index) => assert(typeof token === "string" && token.length > 0, `answer.tokens[${index}] must be a non-empty string`));
  assert(typeof data.prediction === "object" && data.prediction !== null, "prediction is required");
  const answerTokens = answer.tokens as string[];
  const rounds = (data.prediction as Record<string, unknown>).rounds;
  assert(Array.isArray(rounds) && rounds.length > 0 && rounds.length <= answerTokens.length, "prediction.rounds must have 1 to answer.tokens.length rounds");
  rounds.forEach((round, index) => {
    const candidates = (round as Record<string, unknown>)?.candidates;
    assert(Array.isArray(candidates) && candidates.length >= 2 && candidates.length <= 6, `prediction.rounds[${index}] needs 2 to 6 candidates`);
    candidates.forEach((candidate, c) => {
      const item = candidate as Record<string, unknown>;
      assert(typeof item.text === "string" && item.text.length > 0, `prediction.rounds[${index}].candidates[${c}].text is required`);
      assert(typeof item.probability === "number" && item.probability > 0, `prediction.rounds[${index}].candidates[${c}].probability must be positive`);
      assert(item.because === undefined || typeof item.because === "string", `prediction.rounds[${index}].candidates[${c}].because must be text`);
    });
    const texts = candidates.map((candidate) => (candidate as { text: string }).text);
    assert(new Set(texts).size === texts.length, `prediction.rounds[${index}] has duplicate candidates`);
    assert(texts.includes(answerTokens[index]), `prediction.rounds[${index}] must include the answer token 「${answerTokens[index]}」`);
    const sum = candidates.reduce((total: number, candidate) => total + (candidate as { probability: number }).probability, 0);
    assert(Math.abs(sum - 1) < 1e-6, `prediction.rounds[${index}] probabilities must add to 1 (received ${sum})`);
  });
  return data as unknown as ScenarioFixture;
}

import type { AttentionId, ChoiceFixture, RouteId, ScenarioFixture } from "./scenarioTypes";

const routeIds = new Set<RouteId>(["emotion", "cognition", "identity"]);
const attentionIds = new Set<AttentionId>(["emotion", "brain", "experience", "identity", "family"]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid scenario: ${message}`);
}

function validateChoices(choices: unknown, label: string): asserts choices is ChoiceFixture[] {
  assert(Array.isArray(choices) && choices.length === 3, `${label} must contain three choices`);
  const ids = new Set<string>();
  let sum = 0;
  choices.forEach((choice, index) => {
    assert(typeof choice === "object" && choice !== null, `${label}[${index}] must be an object`);
    const item = choice as Record<string, unknown>;
    assert(typeof item.id === "string" && item.id.length > 0, `${label}[${index}].id is required`);
    assert(!ids.has(item.id), `${label} contains duplicate id ${item.id}`);
    ids.add(item.id);
    assert(typeof item.text === "string" && item.text.trim().length > 0, `${label}.${item.id}.text is required`);
    assert(item.text.startsWith(" "), `${label}.${item.id}.text must preserve its leading space`);
    assert(typeof item.weight === "number" && Number.isFinite(item.weight) && item.weight > 0, `${label}.${item.id}.weight must be positive`);
    sum += item.weight;
  });
  assert(Math.abs(sum - 1) < 1e-6, `${label} weights must add to 1 (received ${sum})`);
}

export function validateScenario(value: unknown): ScenarioFixture {
  assert(typeof value === "object" && value !== null, "root must be an object");
  const data = value as Record<string, unknown>;
  for (const key of ["id", "question", "questionZh", "answerPrefix"] as const) {
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
  assert(typeof data.vectorPreviewMap === "object" && data.vectorPreviewMap !== null, "vectorPreviewMap is required");
  Object.values(data.vectorPreviewMap).forEach((id) => assert(attentionIds.has(id as AttentionId), `invalid preview target ${String(id)}`));

  assert(Array.isArray(data.attentionOptions) && data.attentionOptions.length === 5, "attentionOptions must contain five items");
  data.attentionOptions.forEach((option, index) => {
    assert(typeof option === "object" && option !== null, `attentionOptions[${index}] must be an object`);
    const item = option as Record<string, unknown>;
    assert(attentionIds.has(item.id as AttentionId), `invalid attention id ${String(item.id)}`);
    assert(routeIds.has(item.routeId as RouteId), `invalid attention route ${String(item.routeId)}`);
  });

  assert(Array.isArray(data.routes) && data.routes.length === 3, "routes must contain three items");
  const seenRoutes = new Set<string>();
  data.routes.forEach((routeValue, routeIndex) => {
    assert(typeof routeValue === "object" && routeValue !== null, `routes[${routeIndex}] must be an object`);
    const route = routeValue as Record<string, unknown>;
    assert(routeIds.has(route.id as RouteId), `unknown route ${String(route.id)}`);
    assert(!seenRoutes.has(route.id as string), `duplicate route ${String(route.id)}`);
    seenRoutes.add(route.id as string);
    validateChoices(route.round1, `${String(route.id)}.round1`);
    assert(typeof route.round2ByFirst === "object" && route.round2ByFirst !== null, `${String(route.id)}.round2ByFirst is required`);
    assert(typeof route.firstTailByFirst === "object" && route.firstTailByFirst !== null, `${String(route.id)}.firstTailByFirst is required`);
    assert(typeof route.secondTailBySecond === "object" && route.secondTailBySecond !== null, `${String(route.id)}.secondTailBySecond is required`);
    assert(typeof route.leadSuffix === "string" && route.leadSuffix.length > 0, `${String(route.id)}.leadSuffix is required`);
    (route.round1 as ChoiceFixture[]).forEach((first) => {
      const second = (route.round2ByFirst as Record<string, unknown>)[first.id];
      validateChoices(second, `${String(route.id)}.round2ByFirst.${first.id}`);
      assert(typeof (route.firstTailByFirst as Record<string, unknown>)[first.id] === "string", `missing first tail for ${first.id}`);
      second.forEach((choice) => {
        assert(typeof (route.secondTailBySecond as Record<string, unknown>)[choice.id] === "string", `missing second tail for ${choice.id}`);
      });
    });
  });
  routeIds.forEach((routeId) => assert(seenRoutes.has(routeId), `missing route ${routeId}`));
  return data as unknown as ScenarioFixture;
}

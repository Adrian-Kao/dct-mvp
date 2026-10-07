import type { ResolvedAnswer, RouteId, ScenarioFixture } from "./scenarioTypes";

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
  if (!firstTail || !secondTail) throw new Error("Incomplete answer fixture");

  const selectedPrefix = scenario.answerPrefix + first.text + second.text;
  const remainingText = route.leadSuffix + " " + firstTail + " " + secondTail;

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

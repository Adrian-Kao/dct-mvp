import { buildAnswer } from "../data/buildAnswer";
import type { ChoiceFixture, ResolvedAnswer, RouteFixture, RouteId, ScenarioFixture } from "../data/scenarioTypes";
import type { ExperienceState } from "./experienceReducer";

export function selectRouteId(state: ExperienceState, scenario: ScenarioFixture): RouteId | null {
  if (!state.attention.confirmed) return null;
  return scenario.attentionOptions.find((item) => item.id === state.attention.primaryId)?.routeId ?? null;
}

export function selectRoute(state: ExperienceState, scenario: ScenarioFixture): RouteFixture | null {
  const routeId = selectRouteId(state, scenario);
  return scenario.routes.find((item) => item.id === routeId) ?? null;
}

export function selectCandidates(state: ExperienceState, scenario: ScenarioFixture): ChoiceFixture[] {
  const route = selectRoute(state, scenario);
  if (!route) return [];
  if (state.prediction.round === 1) return route.round1;
  const firstId = state.prediction.choices.find((choice) => choice.round === 1)?.candidateId;
  return firstId ? (route.round2ByFirst[firstId] ?? []) : [];
}

export function selectSelectedPrefix(state: ExperienceState, scenario: ScenarioFixture): string {
  return scenario.answerPrefix + state.prediction.choices.map((choice) => choice.text).join("");
}

export function selectAnswer(state: ExperienceState, scenario: ScenarioFixture): ResolvedAnswer | null {
  const routeId = selectRouteId(state, scenario);
  const first = state.prediction.choices.find((choice) => choice.round === 1);
  const second = state.prediction.choices.find((choice) => choice.round === 2);
  if (!routeId || !first || !second) return null;
  return buildAnswer(scenario, routeId, first.candidateId, second.candidateId);
}

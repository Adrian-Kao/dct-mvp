import type { AttentionId, RouteId } from "./scenarioTypes";

export interface PresenterFixture {
  routeId: RouteId;
  primaryId: AttentionId;
  firstId: string;
  secondId: string;
}

export const presenterFixtures: Record<RouteId, PresenterFixture> = {
  emotion: { routeId: "emotion", primaryId: "emotion", firstId: "emotional", secondId: "experiences" },
  cognition: { routeId: "cognition", primaryId: "brain", firstId: "repeated", secondId: "routines" },
  identity: { routeId: "identity", primaryId: "family", firstId: "shared", secondId: "stories" },
};

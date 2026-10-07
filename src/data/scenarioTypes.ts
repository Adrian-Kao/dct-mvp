export type RouteId = "emotion" | "cognition" | "identity";
export type AttentionId = "emotion" | "brain" | "experience" | "identity" | "family";

export interface ChoiceFixture {
  id: string;
  /** Raw text, including its leading space. */
  text: string;
  /** Illustrative weight within the displayed candidate set. */
  weight: number;
}

export interface RouteFixture {
  id: RouteId;
  labelZh: string;
  round1: ChoiceFixture[];
  round2ByFirst: Record<string, ChoiceFixture[]>;
  leadSuffix: string;
  firstTailByFirst: Record<string, string>;
  secondTailBySecond: Record<string, string>;
}

export interface ScenarioFixture {
  id: string;
  question: string;
  questionZh: string;
  answerPrefix: string;
  seed: number;
  tokensAreIllustrative: boolean;
  probabilitiesAreIllustrative: boolean;
  inputTokens: Array<{ id: string; text: string }>;
  vectorNodes: Array<{
    id: string;
    label: string;
    position: [number, number, number];
    selectable: boolean;
  }>;
  vectorPreviewMap: Record<string, AttentionId>;
  attentionOptions: Array<{
    id: AttentionId;
    label: string;
    labelZh: string;
    routeId: RouteId;
  }>;
  routes: RouteFixture[];
}

export interface ResolvedAnswer {
  answerId: string;
  selectedPrefix: string;
  remainingText: string;
  fullAnswer: string;
}

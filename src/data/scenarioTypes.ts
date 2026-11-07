export interface InputToken {
  id: string;
  text: string;
}

export interface AttentionFixture {
  /** Tokens the visitor must turn the dial to before the scene can finish. */
  keywordTokenIds: string[];
  /**
   * Illustrative attention rows: weights[queryTokenId][i] is how much the
   * query token attends to inputTokens[i]. Each row adds up to 1.
   */
  weights: Record<string, number[]>;
}

export interface AnswerFixture {
  id: string;
  /** Illustrative answer tokens, released one per pump. Joined they form the full answer. */
  tokens: string[];
}

export interface ScenarioFixture {
  id: string;
  question: string;
  questionZh: string;
  seed: number;
  tokensAreIllustrative: boolean;
  probabilitiesAreIllustrative: boolean;
  inputTokens: InputToken[];
  vectorNodes: Array<{
    id: string;
    label: string;
    position: [number, number, number];
    selectable: boolean;
  }>;
  attention: AttentionFixture;
  answer: AnswerFixture;
}

export interface AttentionLink {
  fromId: string;
  toId: string;
  weight: number;
}

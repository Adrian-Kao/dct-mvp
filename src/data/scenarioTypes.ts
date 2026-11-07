export interface InputToken {
  id: string;
  text: string;
  /** Illustrative vocabulary number shown when a cut piece flips over. Same text, same number. */
  tokenId: number;
}

export type Vec3 = [number, number, number];

export interface VectorWord {
  text: string;
  position: Vec3;
}

export interface VectorSpaceFixture {
  /** Order in which station 2 asks the visitor to lock question tokens. */
  lockOrder: string[];
  minLocks: number;
  maxLocks: number;
  /** How many nearest words get a glowing line when a token is locked. */
  neighborCount: number;
  /** Where each question token lands in the star field. Repeated text shares a position. */
  tokenPositions: Record<string, Vec3>;
  /** Background star field of faint words. */
  words: VectorWord[];
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
  seed: number;
  tokensAreIllustrative: boolean;
  probabilitiesAreIllustrative: boolean;
  inputTokens: InputToken[];
  vectorSpace: VectorSpaceFixture;
  attention: AttentionFixture;
  answer: AnswerFixture;
}

export interface AttentionLink {
  fromId: string;
  toId: string;
  weight: number;
}

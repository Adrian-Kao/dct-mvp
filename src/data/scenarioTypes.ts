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
  /** Station 3 rounds, in order: each one asks "which word does this token care about most?" */
  keywordTokenIds: string[];
  /**
   * Illustrative attention rows: weights[queryTokenId][i] is how much the
   * query token attends to inputTokens[i]. Each row adds up to 1.
   */
  weights: Record<string, number[]>;
  /** Optional plain-language reading of what a token's strongest link means (shown after the guess). */
  notes?: Record<string, string>;
}

/** Station 3: one candidate for "the next word", with its (illustrative) probability. */
export interface PredictionCandidate {
  text: string;
  probability: number;
  /** The question word whose attention made this candidate likely, e.g. 想念. */
  because?: string;
}

export interface PredictionFixture {
  /** Round i predicts answer.tokens[i]; that token must be one of the round's candidates. */
  rounds: Array<{ candidates: PredictionCandidate[] }>;
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
  /** Legacy attention table (no longer shown; kept so older JSON files still load). */
  attention: AttentionFixture;
  prediction: PredictionFixture;
  answer: AnswerFixture;
}


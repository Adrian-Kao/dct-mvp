export interface GenerationLoopStep {
  id: string;
  index: number;
  rawText: string;
  startCharacter: number;
  endCharacter: number;
}

/**
 * Builds deterministic visual loop steps without changing a single source
 * character. The first three cycles stay word-sized for legibility; the rest
 * accelerates through evenly sized, lossless text fragments.
 */
export function buildGenerationLoopSteps(remainingText: string, targetStepCount = 34): GenerationLoopStep[] {
  if (!remainingText) return [];
  const opening = remainingText.match(/\s*\S+/gu) ?? [];
  const first = opening.slice(0, 3);
  const firstLength = first.join("").length;
  const tail = Array.from(remainingText.slice(firstLength));
  const tailSlots = Math.max(1, targetStepCount - first.length);
  const groupSize = Math.max(1, Math.ceil(tail.length / tailSlots));
  const raw = [...first];
  for (let index = 0; index < tail.length; index += groupSize) raw.push(tail.slice(index, index + groupSize).join(""));
  let cursor = 0;
  return raw.filter(Boolean).map((rawText, index) => {
    const startCharacter = cursor;
    cursor += rawText.length;
    return { id: `loop-${String(index + 1).padStart(2, "0")}`, index, rawText, startCharacter, endCharacter: cursor };
  });
}

export function loopStepDuration(index: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0.12;
  if (index < 3) return 2;
  if (index === 3) return 1;
  if (index === 4) return 0.65;
  if (index === 5) return 0.4;
  return 0.25;
}

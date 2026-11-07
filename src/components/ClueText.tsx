import { splitByClues } from "../data/clues";

/** Answer text with the station 2 clue words marked. */
export function ClueText({ text, words }: { text: string; words: string[] }) {
  return (
    <>
      {splitByClues(text, words).map((part, index) => (part.clue ? <mark key={index} className="clue-word">{part.text}</mark> : <span key={index}>{part.text}</span>))}
    </>
  );
}

import type { Clue } from "../data/clues";

interface Props {
  clues: Clue[];
  /** Words found in the answer so far; they get a check mark. */
  used?: string[];
  title?: string;
}

/** The visitor's "線索袋": what AI associated with each locked question word. */
export function ClueBag({ clues, used = [], title = "你的線索袋" }: Props) {
  if (!clues.length) return null;
  return (
    <section className="clue-bag" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {clues.map((clue) => (
          <li key={clue.tokenId}>
            <strong>{clue.token}</strong>
            <span aria-hidden="true">→</span>
            {clue.words.map((word) => <em key={word} className={used.includes(word) ? "is-used" : ""}>{word}{used.includes(word) ? " ✓" : ""}</em>)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Cycles through five words in place (CSS only, 2.5s each — the keyframes in
 * globals.css assume five). Screen readers and reduced motion get the first.
 */
export function RotatingWord({ words }: { words: [string, string, string, string, string] }) {
  return (
    <span className="relative inline-grid">
      <span className="sr-only">{words[0]}</span>
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden
          className={`col-start-1 row-start-1 animate-word-cycle whitespace-nowrap motion-reduce:animate-none ${
            i > 0 ? "motion-reduce:hidden" : ""
          }`}
          style={{ animationDelay: `${i * 2.5}s` }}
        >
          <span className="relative">
            <span className="absolute inset-x-[-0.06em] bottom-[0.1em] h-[0.32em] -skew-x-12 rounded-[0.08em] bg-mint/40" />
            <span className="relative">{word}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

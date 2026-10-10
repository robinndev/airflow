import Link from "next/link";

// Wordmark only for now — the final name and logo are still undecided (blueprint §5, §15).
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Artiflow home"
      className="shrink-0 rounded-input font-display text-xl font-extrabold tracking-tight text-ink"
    >
      Artiflow
    </Link>
  );
}

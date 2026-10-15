import { Fragment } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/**
 * Plain text someone typed (a message, a commission request's references)
 * with its web links made clickable. Links open in a new tab and are marked
 * as user content, so they pass on no ranking or referrer.
 */
export function Linkified({ text, className = "underline underline-offset-2 break-all" }: { text: string; className?: string }) {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" className={className}>
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

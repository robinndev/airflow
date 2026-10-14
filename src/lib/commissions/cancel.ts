/*
 * Why a buyer cancels a commission request (or says no to a quote). The
 * reason is required and the artist sees it, with an optional note: a cancel
 * with no word leaves the artist guessing, and makes bait requests free.
 * Stored in `commission_requests.cancel_reason` / `cancel_note`
 * (*_commission_cancel_reasons.sql). Pure and client-safe.
 */

export const CANCEL_REASONS = ["changed_mind", "price", "timing", "other_artist", "mistake", "other"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export const isCancelReason = (value: unknown): value is CancelReason => CANCEL_REASONS.includes(value as CancelReason);

/** What the buyer picks (first person), worded for a request or for a quote. */
export const CANCEL_CHOICES: Record<CancelReason, { request: string; quote: string }> = {
  changed_mind: { request: "I changed my mind", quote: "I changed my mind" },
  price: { request: "It's more than I can spend right now", quote: "The price is more than I can pay" },
  timing: { request: "The timing doesn't work for me", quote: "The delivery date doesn't work for me" },
  other_artist: { request: "I'm going with another artist", quote: "I'm going with another artist" },
  mistake: { request: "I made a mistake in my request", quote: "I asked for the wrong thing" },
  other: { request: "Something else", quote: "Something else" },
};

/** How the artist reads it, after the buyer's name ("Lune cancelled: …"). */
export const CANCEL_READS: Record<CancelReason, string> = {
  changed_mind: "changed their mind",
  price: "it's more than they can spend right now",
  timing: "the timing doesn't work for them",
  other_artist: "they're going with another artist",
  mistake: "they made a mistake in the request",
  other: "something else",
};

export const CANCEL_NOTE_MAX = 500;

/** The reason and note as stored, or why they can't be. "Something else" needs a few words. */
export function checkCancel(reason: unknown, note: unknown): { ok: true; reason: CancelReason; note: string | null } | { ok: false; error: string } {
  if (!isCancelReason(reason)) return { ok: false, error: "Pick a reason first." };
  const text = typeof note === "string" ? note.trim() : "";
  if (text.length > CANCEL_NOTE_MAX) return { ok: false, error: `Keep the note under ${CANCEL_NOTE_MAX} characters.` };
  if (reason === "other" && text.length < 3) return { ok: false, error: "Tell them a little about why." };
  return { ok: true, reason, note: text || null };
}

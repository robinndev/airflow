/*
 * A commission service can only be closed or deleted by its artist once every
 * commission on it is finished: delivered, or ended (declined, cancelled,
 * expired). Until then it stays open, and trying says why. Closing by itself
 * when the slots run out ("when full") isn't the artist closing it, so that
 * still happens. The Server Actions check this; a database trigger is the
 * backstop (*_close_only_when_done.sql). Pure and client-safe.
 */

/** Orders that still need the artist: answering, the buyer's payment, or the drawing. */
export const OPEN_ORDER_STATUSES = ["pending", "waitlisted", "quoted", "paid", "in_progress"] as const;
export type OpenOrderStatus = (typeof OPEN_ORDER_STATUSES)[number];

export const isOpenOrder = (status: string): status is OpenOrderStatus =>
  (OPEN_ORDER_STATUSES as readonly string[]).includes(status);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1 request to answer, 1 quote waiting on the buyer and 2 to draw". */
export function openOrdersSummary(statuses: string[]): string {
  const open = statuses.filter(isOpenOrder);
  const answer = open.filter((s) => s === "pending" || s === "waitlisted").length;
  const quoted = open.filter((s) => s === "quoted").length;
  const draw = open.filter((s) => s === "paid" || s === "in_progress").length;
  const parts = [
    answer && plural(answer, "request to answer", "requests to answer"),
    quoted && plural(quoted, "quote waiting on the buyer", "quotes waiting on buyers"),
    draw && plural(draw, "commission to draw", "commissions to draw"),
  ].filter(Boolean) as string[];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
}

/**
 * Why the artist can't close or delete this service yet, or null when they
 * can (nothing open on it).
 */
export function closeBlocked(title: string, statuses: string[], action: "close" | "delete"): string | null {
  const open = statuses.filter(isOpenOrder);
  if (open.length === 0) return null;
  const what = openOrdersSummary(open);
  // Paid work can only be delivered; requests and quotes can also be declined.
  const toDraw = open.some((s) => s === "paid" || s === "in_progress");
  const toAnswer = open.some((s) => s !== "paid" && s !== "in_progress");
  const how = toDraw && toAnswer ? "Deliver or decline them" : toDraw ? "Deliver them" : "Answer or decline them";
  return action === "close"
    ? `“${title}” stays open until its commissions are done: ${what}. ${how}, then close it.`
    : `You can't delete “${title}” yet: ${what}. ${how} first.`;
}

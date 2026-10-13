import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/session";
import type { QueueOrder } from "./queue";
import { fetchIncomingRequests, fetchSentRequests, queueVersion } from "./real";
import type { MyRequest } from "./requests";

export type ViewerQueue = {
  handle: string;
  /** The day deadlines are counted from (YYYY-MM-DD, UTC), so server and browser agree. */
  today: string;
  orders: QueueOrder[];
  /** Changes whenever an order does: the queue then takes the server's copy over any optimistic change. */
  version: string;
};

/**
 * The signed-in artist's commission queue (their real orders), or null for
 * visitors. Per viewer and per day, so it's never cached; call it inside
 * <Suspense>.
 */
export const getViewerQueue = cache(async function getViewerQueue(): Promise<ViewerQueue | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  // getViewer() has already awaited connection(), so reading the clock is allowed.
  const today = new Date().toISOString().slice(0, 10);
  const orders = await fetchIncomingRequests(viewer);
  return { handle: viewer.handle, today, orders, version: queueVersion(orders) };
});

export type ViewerRequests = {
  handle: string;
  today: string;
  requests: MyRequest[];
};

/** The commissions the signed-in viewer asked other artists for. Null for visitors. */
export const getViewerRequests = cache(async function getViewerRequests(): Promise<ViewerRequests | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  return { handle: viewer.handle, today: new Date().toISOString().slice(0, 10), requests: await fetchSentRequests(viewer) };
});

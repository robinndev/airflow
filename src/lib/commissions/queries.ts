import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/session";
import type { QueueOrder } from "./queue";
import { fetchIncomingRequests, fetchSentRequests } from "./real";
import type { MyRequest } from "./requests";
import { sampleQueue } from "./sample";
import { sampleRequests, sentRequests } from "./sample-requests";

export type ViewerQueue = {
  handle: string;
  /** The day deadlines are counted from (YYYY-MM-DD, UTC), so server and browser agree. */
  today: string;
  orders: QueueOrder[];
  /** True until the commission flow brings real requests. */
  sample: boolean;
};

/**
 * The signed-in artist's commission queue, or null for visitors. Per viewer
 * and per day, so it's never cached; call it inside <Suspense>.
 */
export const getViewerQueue = cache(async function getViewerQueue(): Promise<ViewerQueue | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  // getViewer() has already awaited connection(), so reading the clock is allowed.
  const now = new Date();
  // Requests really sent to this artist come first; the sample fills the rest of the wall.
  const real = await fetchIncomingRequests(viewer);
  return { handle: viewer.handle, today: now.toISOString().slice(0, 10), orders: [...real, ...sampleQueue(now)], sample: true };
});

export type ViewerRequests = {
  handle: string;
  today: string;
  requests: MyRequest[];
  /** True until the commission flow brings real quotes, payments and deliveries. */
  sample: boolean;
};

/**
 * The commissions the signed-in viewer asked other artists for: the ones
 * really sent through a commission dialog, plus the sample. Null for visitors.
 */
export const getViewerRequests = cache(async function getViewerRequests(): Promise<ViewerRequests | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const now = new Date();
  const real = await fetchSentRequests(viewer);
  return {
    handle: viewer.handle,
    today: now.toISOString().slice(0, 10),
    requests: [...real, ...sentRequests(viewer.handle), ...sampleRequests(now)],
    sample: true,
  };
});

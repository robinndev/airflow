import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/session";
import type { QueueOrder } from "./queue";
import { fetchIncomingRequests, fetchSentRequests, queueVersion } from "./real";
import type { MyRequest } from "./requests";
import { sampleQueue } from "./sample";
import { sampleRequests, sentRequests } from "./sample-requests";

export type ViewerQueue = {
  handle: string;
  /** The day deadlines are counted from (YYYY-MM-DD, UTC), so server and browser agree. */
  today: string;
  orders: QueueOrder[];
  /** No real orders yet: the queue shows a sample so the board isn't empty (changes stay on this device). */
  sample: boolean;
  /** Changes whenever a real order does: the queue then takes the server's copy over any optimistic change. */
  version: string;
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
  const today = now.toISOString().slice(0, 10);
  // Real orders only, once there are any; until then, a sample shows how the board works.
  const real = await fetchIncomingRequests(viewer);
  if (real.length === 0) return { handle: viewer.handle, today, orders: sampleQueue(now), sample: true, version: "sample" };
  return { handle: viewer.handle, today, orders: real, sample: false, version: queueVersion(real) };
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
  // What they really sent (real artists, then demo artists); the sample only until there's something.
  const real = [...(await fetchSentRequests(viewer)), ...sentRequests(viewer.handle)];
  return {
    handle: viewer.handle,
    today: now.toISOString().slice(0, 10),
    requests: real.length ? real : sampleRequests(now),
    sample: real.length === 0,
  };
});

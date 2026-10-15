"use server";

import { z } from "zod";
import { fetchNotifications, fetchWeekTally, markAllRead } from "@/lib/notifications/server";
import { isShow, type NoticeScope, type NotificationPage, type WeekTally } from "@/lib/notifications/types";
import { getViewer } from "@/lib/session";

/*
 * Notifications for the browser: the bell and /notifications (the guest
 * book) and the header's order clipboard (commission notices) load them
 * lazily, and opening one marks its own scope read. All as the signed-in
 * viewer (row level security); visitors get null.
 */

const cursor = z.iso.datetime({ offset: true }).optional();
const scope = z.enum(["book", "orders"]).catch("book");

/** A page of the viewer's guest book (`before`: the oldest `at` already shown). */
export async function loadNotifications(
  show: string = "all",
  before?: string,
): Promise<(NotificationPage & { unread: number }) | null> {
  const viewer = await getViewer();
  const at = cursor.safeParse(before);
  if (!viewer || !at.success) return null;
  return fetchNotifications(viewer.id, { show: isShow(show) ? show : "all", before: at.data });
}

/** The newest commission notices, for the header's order clipboard. */
export async function loadOrderNotices(): Promise<(NotificationPage & { unread: number }) | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  return fetchNotifications(viewer.id, { scope: "orders" });
}

/** The last seven days in numbers, for the guest book's tally marks. */
export async function loadWeekTally(): Promise<WeekTally | null> {
  const viewer = await getViewer();
  return viewer ? fetchWeekTally(viewer.id) : null;
}

/** Everything in one scope read: the guest book (the bell, the page) or the order clipboard. */
export async function markNotificationsRead(which: NoticeScope = "book"): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false };
  return { ok: await markAllRead(viewer.id, scope.parse(which)) };
}

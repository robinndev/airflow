"use server";

import { z } from "zod";
import { fetchNotifications, fetchWeekTally, markAllRead } from "@/lib/notifications/server";
import { isShow, type NotificationPage, type WeekTally } from "@/lib/notifications/types";
import { getViewer } from "@/lib/session";

/*
 * Notifications for the browser: the bell and /notifications load them
 * lazily, and opening either marks them read. All as the signed-in viewer
 * (row level security); visitors get null.
 */

const cursor = z.iso.datetime({ offset: true }).optional();

/** A page of the viewer's notifications (`before`: the oldest `at` already shown). */
export async function loadNotifications(
  show: string = "all",
  before?: string,
): Promise<(NotificationPage & { unread: number }) | null> {
  const viewer = await getViewer();
  const at = cursor.safeParse(before);
  if (!viewer || !at.success) return null;
  return fetchNotifications(viewer.id, { show: isShow(show) ? show : "all", before: at.data });
}

/** The last seven days in numbers, for the guest book's tally marks. */
export async function loadWeekTally(): Promise<WeekTally | null> {
  const viewer = await getViewer();
  return viewer ? fetchWeekTally(viewer.id) : null;
}

export async function markNotificationsRead(): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false };
  return { ok: await markAllRead(viewer.id) };
}

import { cacheLife, cacheTag } from "next/cache";
import { demoImages as art } from "./profile/demo-images";
import type { ImageAsset } from "./profile/types";

export type NotificationKind =
  | "commission_request"
  | "like"
  | "follow"
  | "comment"
  | "review"
  | "mention"
  | "payout";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  /** Null for platform notifications (payouts, system). */
  actor: { handle: string; avatar?: ImageAsset } | null;
  /** Sentence after the actor's handle; `target` is emphasized at the end. */
  text: string;
  target?: string;
  /** Optional quoted snippet (comment, review). */
  quote?: string;
  preview?: ImageAsset;
  href: string;
  /** Pre-formatted for the mock; real data will use timestamps. */
  time: string;
  unread: boolean;
};

const avatar = (image: ImageAsset, focus: string): ImageAsset => ({ ...image, alt: "", focus });

const MOCK: Record<string, AppNotification[]> = {
  mira: [
    {
      id: "ntf_1",
      kind: "commission_request",
      actor: { handle: "nadiadraws", avatar: avatar(art.nightDrive, "50% 15%") },
      text: "requested a",
      target: "Half-body illustration",
      quote: "My OC Nadia on a rainy rooftop, neon reflections…",
      href: "/mira/commissions",
      time: "2m",
      unread: true,
    },
    {
      id: "ntf_2",
      kind: "like",
      actor: { handle: "lune.oc" },
      text: "and 48 others liked",
      target: "Golden hour, finally finished",
      preview: art.sunsetReflection,
      href: "/mira#pst_1",
      time: "18m",
      unread: true,
    },
    {
      id: "ntf_3",
      kind: "follow",
      actor: { handle: "pebblecat", avatar: avatar(art.shopKeeper, "50% 30%") },
      text: "started following you",
      href: "/mira",
      time: "1h",
      unread: true,
    },
    {
      id: "ntf_4",
      kind: "comment",
      actor: { handle: "theowrites", avatar: avatar(art.kitchenMorning, "50% 12%") },
      text: "commented on",
      target: "Quiet Worlds",
      quote: "The floating island needs a tiny lighthouse ✨",
      preview: art.skyWhirl,
      href: "/mira#pst_3",
      time: "3h",
      unread: false,
    },
    {
      id: "ntf_5",
      kind: "review",
      actor: { handle: "nadiadraws", avatar: avatar(art.nightDrive, "50% 15%") },
      text: "left a 5-star review on",
      target: "Half-body illustration",
      href: "/mira/commissions#svc_halfbody",
      time: "1d",
      unread: false,
    },
    {
      id: "ntf_6",
      kind: "mention",
      actor: { handle: "ronin.wolf", avatar: avatar(art.campfire, "70% 30%") },
      text: "mentioned you in a post",
      quote: "Commissioned @mira for my OC's birthday and I'm speechless",
      href: "/mira",
      time: "2d",
      unread: false,
    },
    {
      id: "ntf_7",
      kind: "payout",
      actor: null,
      text: "Your payout of $340.00 is on its way",
      href: "/mira",
      time: "3d",
      unread: false,
    },
  ],
};

/** Viewer-specific, so callers must sit behind <Suspense>. */
export async function getNotifications(handle: string): Promise<AppNotification[]> {
  "use cache";
  cacheLife("seconds");
  cacheTag(`notifications:${handle}`);
  return MOCK[handle] ?? [];
}

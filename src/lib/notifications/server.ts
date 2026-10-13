import "server-only";
import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { ACCOUNT_COLUMNS, configured, toPostAuthor, type AccountRow } from "@/lib/profile/accounts";
import { db } from "@/lib/profile/mock-db";
import type { ImageAsset } from "@/lib/profile/types";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  excerptOf,
  kindsOf,
  type AppNotification,
  type NotificationKind,
  type NotificationPage,
  type RequestStatus,
  type Show,
  type WeekTally,
} from "./types";

/*
 * Reading notifications, always as the signed-in recipient (row level
 * security: nobody else can see them). Never cached: they're private and
 * change all the time. The browser asks for them lazily (opening the bell,
 * the /notifications page); the badge comes from the pulse.
 */

const PAGE_SIZE = 24;

type PostRow = {
  id: string;
  body: string;
  images: StoredImage[] | null;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  image_palette: string[] | null;
  author: { handle: string; display_name: string };
};

type Row = {
  id: string;
  kind: NotificationKind;
  tally: number;
  data: Record<string, unknown> | null;
  updated_at: string;
  read_at: string | null;
  demo_post_id: string | null;
  actor: AccountRow | null;
  post: PostRow | null;
  source: PostRow | null;
  comment: { body: string } | null;
};

const POST = "id, body, images, image_path, image_width, image_height, image_palette, author:profiles(handle, display_name)";
const COLUMNS = [
  "id, kind, tally, data, updated_at, read_at, demo_post_id",
  `actor:profiles!notifications_actor_id_fkey(${ACCOUNT_COLUMNS})`,
  `post:posts!notifications_post_id_fkey(${POST})`,
  `source:posts!notifications_source_post_id_fkey(${POST})`,
  "comment:comments(body)",
].join(", ");

/** A database that predates the migration reads as an empty book, not a broken page. */
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

type Piece = { id: string; handle: string; name: string; body: string; excerpt: string; image?: ImageAsset };

function pieceOf(row: PostRow | null, demoId: string | null): Piece | null {
  if (row) {
    const images = row.images?.length
      ? row.images
      : row.image_path && row.image_width && row.image_height
        ? [{ path: row.image_path, width: row.image_width, height: row.image_height, palette: row.image_palette }]
        : [];
    return {
      id: row.id,
      handle: row.author.handle,
      name: row.author.display_name,
      body: row.body,
      excerpt: excerptOf(row.body),
      image: images[0] && toImageAsset(images[0], `Artwork shared by @${row.author.handle}`),
    };
  }
  const demo = demoId ? db.posts.find((post) => post.id === demoId) : undefined;
  if (!demo) return null;
  return {
    id: demo.id,
    handle: demo.authorHandle,
    name: db.profiles.find((p) => p.handle === demo.authorHandle)?.displayName ?? demo.authorHandle,
    body: demo.body,
    excerpt: excerptOf(demo.body),
    image: demo.media[0],
  };
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

function toNotification(row: Row): AppNotification | null {
  const author = row.actor && toPostAuthor(row.actor);
  const actor = author && { handle: author.handle, name: author.displayName, avatar: author.avatar };
  const about = pieceOf(row.post, row.demo_post_id);
  const source = pieceOf(row.source, null);
  const base = { id: row.id, kind: row.kind, actor, tally: row.tally, at: row.updated_at, unread: !row.read_at };
  const piece = (p: Piece) => ({ excerpt: p.excerpt, image: p.image });

  switch (row.kind) {
    case "welcome":
      return { ...base, href: "/customize" };
    case "like":
      return about && { ...base, piece: piece(about), href: `/${about.handle}#${about.id}` };
    case "follow":
    case "invite_joined":
      return actor && { ...base, href: `/${actor.handle}` };
    case "repost": {
      if (!actor || !about) return null;
      const note = source?.body.trim();
      return {
        ...base,
        piece: piece(about),
        ...(note && { quote: note }),
        href: source ? `/${actor.handle}#${source.id}` : `/${about.handle}#${about.id}`,
      };
    }
    case "comment":
    case "reply":
    case "mention": {
      if (!actor) return null;
      // A mention in a post (no comment): the post that names you.
      if (!row.comment) return source && { ...base, piece: piece(source), quote: source.body, href: `/${source.handle}#${source.id}` };
      if (!about) return null;
      return {
        ...base,
        piece: piece(about),
        quote: row.comment.body,
        href: `/${about.handle}#${about.id}`,
        thread: { postId: about.id, authorName: about.name.split(" ")[0], excerpt: about.excerpt },
      };
    }
    case "commission_request":
    case "request_update": {
      if (!actor) return null;
      const status = (text(row.data?.status) || "pending") as RequestStatus;
      const estimate = Number(row.data?.estimate_usd);
      // The artist hears about new, cancelled and paid requests; the buyer about everything the artist does.
      const toArtist = row.kind === "commission_request" || status === "cancelled" || status === "paid";
      return {
        ...base,
        commission: {
          service: text(row.data?.service) || "a custom piece",
          status,
          ...(Number.isFinite(estimate) && estimate > 0 && { estimateUsd: estimate }),
        },
        ...(row.kind === "commission_request" && text(row.data?.brief) && { quote: text(row.data?.brief) }),
        href: toArtist ? "/commissions?tab=attention" : "/requests",
      };
    }
  }
}

/** A page of the viewer's notifications, newest activity first, plus how many are unread. */
export async function fetchNotifications(
  viewerId: string,
  { show = "all", before }: { show?: Show; before?: string } = {},
): Promise<NotificationPage & { unread: number }> {
  const empty = { items: [], more: false, unread: 0 };
  if (!configured()) return empty;
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("notifications")
    .select(COLUMNS)
    .eq("recipient_id", viewerId)
    .order("updated_at", { ascending: false })
    .limit(PAGE_SIZE + 1);
  const kinds = kindsOf(show);
  if (kinds) query = query.in("kind", kinds);
  if (before) query = query.lt("updated_at", before);

  const [{ data, error }, unread] = await Promise.all([
    query.returns<Row[]>(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", viewerId)
      .is("read_at", null),
  ]);
  if (error) {
    if (MISSING_TABLE.has(error.code)) return empty;
    throw new Error(`Couldn't load notifications: ${error.message}`);
  }
  return {
    items: data.slice(0, PAGE_SIZE).flatMap((row) => toNotification(row) ?? []),
    more: data.length > PAGE_SIZE,
    unread: unread.count ?? 0,
  };
}

/** What happened in the last seven days, for the tally marks on /notifications. */
export async function fetchWeekTally(viewerId: string): Promise<WeekTally> {
  const tally: WeekTally = { likes: 0, comments: 0, follows: 0, reposts: 0, requests: 0 };
  if (!configured()) return tally;
  const supabase = await createSupabaseServer();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .select("kind, tally")
    .eq("recipient_id", viewerId)
    .gte("updated_at", since)
    .limit(2000)
    .returns<{ kind: NotificationKind; tally: number }[]>();
  if (error) {
    if (!MISSING_TABLE.has(error.code)) console.error(`Couldn't tally notifications: ${error.message}`);
    return tally;
  }
  for (const row of data) {
    if (row.kind === "like") tally.likes += row.tally;
    else if (row.kind === "comment" || row.kind === "reply" || row.kind === "mention") tally.comments += 1;
    else if (row.kind === "follow" || row.kind === "invite_joined") tally.follows += 1;
    else if (row.kind === "repost") tally.reposts += 1;
    else if (row.kind === "commission_request") tally.requests += 1;
  }
  return tally;
}

/** Marks every unread notice read (opening the bell or the page does this). */
export async function markAllRead(viewerId: string): Promise<boolean> {
  if (!configured()) return true;
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", viewerId)
    .is("read_at", null);
  if (error && !MISSING_TABLE.has(error.code)) {
    console.error(`Couldn't mark notifications read: ${error.message}`);
    return false;
  }
  return true;
}

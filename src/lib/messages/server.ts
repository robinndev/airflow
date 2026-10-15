import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { customizationFor } from "@/lib/customization/model";
import { glowOf } from "@/lib/palette";
import { ACCOUNT_COLUMNS, toArtistProfile, type AccountRow } from "@/lib/profile/accounts";
import { db } from "@/lib/profile/mock-db";
import { getReviews, getServices } from "@/lib/profile/queries";
import type { ArtistProfile } from "@/lib/profile/types";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  MESSAGES_BUCKET,
  MESSAGE_PAGE,
  previewOf,
  type ChatImage,
  type ChatMessage,
  type ChatPerson,
  type InboxEntry,
  type StoredChatImage,
  type StudioCard,
} from "./types";

/*
 * Direct messages on the server. Everything is read and written as the
 * signed-in person (row level security keeps each conversation to its two
 * people); see supabase/migrations/*_direct_messages.sql.
 */

type Supabase = SupabaseClient;

type ConversationRow = {
  id: string;
  user_a: string;
  user_b: string | null;
  demo_handle: string | null;
  last_message_at: string | null;
  last_message_body: string | null;
  last_sender_id: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  images: StoredChatImage[];
  created_at: string;
};

const MESSAGE_COLUMNS = "id, sender_id, body, images, created_at";
/** Signed picture links last a day; reopening a conversation signs them again. */
const SIGNED_FOR = 60 * 60 * 24;
const FALLBACK_TINT = "#35bdf5";

export const isDemoHandle = (handle: string) => db.profiles.some((p) => p.handle === handle);

export function chatPerson(profile: ArtistProfile): ChatPerson {
  const palette = profile.banner.palette?.length ? profile.banner.palette : (profile.avatar.palette ?? []);
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    avatar: profile.avatar,
    plan: profile.plan,
    tint: glowOf(palette, 1)[0] ?? FALLBACK_TINT,
    demo: isDemoHandle(profile.handle),
  };
}

export async function studioCard(profile: ArtistProfile): Promise<StudioCard> {
  const [services, reviews] = await Promise.all([getServices(profile.handle), getReviews(profile.handle)]);
  const { status, slotsTotal, slotsTaken, startingPriceUsd, turnaround, rating } = profile.commissions;
  const reviewed =
    rating ??
    (reviews.length
      ? { average: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length, count: reviews.length }
      : undefined);
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    pronouns: profile.pronouns,
    headline: profile.headline,
    location: profile.location,
    timeZone: profile.timeZone,
    joinedAt: profile.joinedAt,
    plan: profile.plan,
    avatar: profile.avatar,
    banner: profile.banner,
    frame: customizationFor(profile).frame,
    rating: reviewed,
    studio: { status, slotsTotal, slotsTaken, startingPriceUsd, turnaround },
    services: services.map(({ id, title, priceFromUsd }) => ({ id, title, priceFromUsd })),
    links: profile.links,
  };
}

/** The conversation between the viewer and this profile, if they've talked. */
export async function findConversation(supabase: Supabase, viewerId: string, other: ArtistProfile) {
  const query = supabase.from("conversations").select("id");
  const { data } = isDemoHandle(other.handle)
    ? await query.eq("user_a", viewerId).eq("demo_handle", other.handle).maybeSingle()
    : await query.eq("user_a", viewerId < other.id ? viewerId : other.id).eq("user_b", viewerId < other.id ? other.id : viewerId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Finds or starts the conversation (it's made on the first message, never on open). */
export async function ensureConversation(supabase: Supabase, viewerId: string, other: ArtistProfile) {
  const existing = await findConversation(supabase, viewerId, other);
  if (existing) return { ok: true as const, id: existing };

  const sides: Record<string, string> = isDemoHandle(other.handle)
    ? { user_a: viewerId, demo_handle: other.handle }
    : { user_a: viewerId < other.id ? viewerId : other.id, user_b: viewerId < other.id ? other.id : viewerId };
  const { data, error } = await supabase.from("conversations").insert(sides).select("id").single();
  if (data) return { ok: true as const, id: data.id as string };
  // Both opened it at the same moment: the other insert won.
  if (error?.code === "23505") {
    const id = await findConversation(supabase, viewerId, other);
    if (id) return { ok: true as const, id };
  }
  if (error?.code === "23514") return { ok: false as const, error: error.message };
  return { ok: false as const, error: "Couldn't start the conversation. Try again in a moment." };
}

async function signImages(supabase: Supabase, rows: MessageRow[]) {
  const paths = rows.flatMap((row) => row.images.map((image) => image.path));
  if (paths.length === 0) return new Map<string, string>();
  const { data } = await supabase.storage.from(MESSAGES_BUCKET).createSignedUrls(paths, SIGNED_FOR);
  return new Map((data ?? []).flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])));
}

function toMessage(row: MessageRow, viewerId: string, urls: Map<string, string>): ChatMessage {
  const images: ChatImage[] = row.images.flatMap((image) => {
    const url = urls.get(image.path);
    return url ? [{ ...image, url }] : [];
  });
  return { id: row.id, fromMe: row.sender_id === viewerId, body: row.body, images, createdAt: row.created_at };
}

/** A page of messages, oldest first: the newest ones, or the ones before `before`. */
export async function fetchMessages(supabase: Supabase, viewerId: string, conversationId: string, before?: string) {
  let query = supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE + 1);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query.returns<MessageRow[]>();
  if (error || !data) return null;
  const page = data.slice(0, MESSAGE_PAGE).reverse();
  const urls = await signImages(supabase, page);
  return { messages: page.map((row) => toMessage(row, viewerId, urls)), hasMore: data.length > MESSAGE_PAGE };
}

/** Both people's side of a conversation: the viewer's archive flag and how far the other has read. */
export async function fetchMembers(supabase: Supabase, viewerId: string, conversationId: string) {
  const { data } = await supabase
    .from("conversation_members")
    .select("user_id, last_read_at, archived_at")
    .eq("conversation_id", conversationId);
  const mine = data?.find((m) => m.user_id === viewerId);
  const theirs = data?.find((m) => m.user_id !== viewerId);
  return { archived: Boolean(mine?.archived_at), theirReadAt: (theirs?.last_read_at as string | null) ?? null };
}

/** Every conversation with at least one message, newest first. */
export async function fetchInbox(viewerId: string): Promise<InboxEntry[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("conversation_members")
    .select(
      "last_read_at, archived_at, conversation:conversations!inner(id, user_a, user_b, demo_handle, last_message_at, last_message_body, last_sender_id)",
    )
    .eq("user_id", viewerId)
    .not("conversation.last_message_at", "is", null)
    .returns<{ last_read_at: string | null; archived_at: string | null; conversation: ConversationRow }[]>();
  if (error || !data) throw new Error(`Couldn't load your messages: ${error?.message}`);

  const otherIds = [
    ...new Set(
      data.flatMap(({ conversation: c }) => (c.user_b ? [c.user_a === viewerId ? c.user_b : c.user_a] : [])),
    ),
  ];
  const accounts = new Map<string, ArtistProfile>();
  if (otherIds.length) {
    const { data: rows } = await supabase.from("profiles").select(ACCOUNT_COLUMNS).in("id", otherIds).returns<AccountRow[]>();
    for (const row of rows ?? []) accounts.set(row.id, toArtistProfile(row));
  }

  return data
    .flatMap(({ last_read_at, archived_at, conversation: c }): InboxEntry[] => {
      const other = c.demo_handle
        ? db.profiles.find((p) => p.handle === c.demo_handle)
        : accounts.get(c.user_a === viewerId ? c.user_b! : c.user_a);
      if (!other || !c.last_message_at) return [];
      const fromMe = c.last_sender_id === viewerId;
      return [
        {
          id: c.id,
          person: chatPerson(other),
          last: { body: previewOf(c.last_message_body ?? ""), fromMe, at: c.last_message_at },
          unread: !fromMe && (!last_read_at || last_read_at < c.last_message_at),
          archived: Boolean(archived_at),
        },
      ];
    })
    .toSorted((a, b) => b.last.at.localeCompare(a.last.at));
}

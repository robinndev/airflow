"use server";

import { z } from "zod";
import {
  chatPerson,
  ensureConversation,
  fetchInbox,
  fetchMembers,
  fetchMessages,
  findConversation,
  studioCard,
} from "@/lib/messages/server";
import {
  MAX_MESSAGE_IMAGES,
  MAX_MESSAGE_LENGTH,
  MESSAGES_BUCKET,
  isOwnMessagePath,
  type ChatMessage,
  type InboxEntry,
  type ThreadView,
} from "@/lib/messages/types";
import { getProfile, normalizeHandle } from "@/lib/profile/queries";
import { getViewer } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

/*
 * Direct messages: reads and writes for the chat window and the inbox
 * (src/components/messages/). New messages reach the other person live
 * through a database trigger (Realtime Broadcast), not through these.
 */

type Failure = { ok: false; error: string; signIn?: boolean };

const SIGN_IN: Failure = { ok: false, error: "Sign in to send messages.", signIn: true };
const OFFLINE = "Couldn't reach the studio. Try again in a moment.";

const uuid = z.uuid();
/** A timestamp as Postgres hands it out ("2026-10-11T12:30:46.123456+00:00"). */
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

const messageSchema = z
  .object({
    body: z
      .string()
      .overwrite((text) => text.replace(/\r\n?/g, "\n"))
      .trim()
      .max(MAX_MESSAGE_LENGTH, `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`),
    images: z
      .array(
        z.object({
          path: z.string().max(200),
          width: z.number().int().min(1).max(8192),
          height: z.number().int().min(1).max(8192),
        }),
      )
      .max(MAX_MESSAGE_IMAGES, `Up to ${MAX_MESSAGE_IMAGES} pictures per message.`),
  })
  .refine((m) => m.body.length > 0 || m.images.length > 0, "Write something first.");

/** Who the viewer is talking to, by handle. */
async function resolveOther(handle: string) {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN;
  const other = await getProfile(normalizeHandle(handle));
  if (!other) return { ok: false as const, error: "That artist isn't here anymore." };
  if (other.handle === viewer.handle) return { ok: false as const, error: "That's you! Pick someone else to write to." };
  return { ok: true as const, viewer, other };
}

/** The viewer's conversations, newest first (null for visitors). */
export async function loadInbox(): Promise<InboxEntry[] | null> {
  const viewer = await getViewer();
  return viewer ? fetchInbox(viewer.id) : null;
}

/** Everything the chat window shows for one person: their card and the newest messages. */
export async function openThread(handle: string): Promise<{ ok: true; thread: ThreadView } | Failure> {
  const who = await resolveOther(handle);
  if (!who.ok) return who;
  const { viewer, other } = who;

  const supabase = await createSupabaseServer();
  const [conversationId, card] = await Promise.all([findConversation(supabase, viewer.id, other), studioCard(other)]);
  const [page, members] = conversationId
    ? await Promise.all([
        fetchMessages(supabase, viewer.id, conversationId),
        fetchMembers(supabase, viewer.id, conversationId),
      ])
    : [{ messages: [], hasMore: false }, { archived: false, theirReadAt: null }];
  if (!page) return { ok: false, error: OFFLINE };

  return {
    ok: true,
    thread: { conversationId, person: chatPerson(other), card, ...page, ...members },
  };
}

/** Scrolling back: the page of messages before `before`. */
export async function loadEarlier(conversationId: string, before: string) {
  const viewer = await getViewer();
  if (!viewer || !uuid.safeParse(conversationId).success || !TIMESTAMP.test(before)) return null;
  return fetchMessages(await createSupabaseServer(), viewer.id, conversationId, before);
}

/** Pictures upload into the conversation's folder, so a first message with pictures starts it first. */
export async function startConversation(handle: string): Promise<{ ok: true; conversationId: string } | Failure> {
  const who = await resolveOther(handle);
  if (!who.ok) return who;
  const started = await ensureConversation(await createSupabaseServer(), who.viewer.id, who.other);
  return started.ok ? { ok: true, conversationId: started.id } : { ok: false, error: started.error };
}

export async function sendMessage(input: {
  handle: string;
  conversationId: string | null;
  body: string;
  images: { path: string; width: number; height: number }[];
}): Promise<{ ok: true; conversationId: string; message: ChatMessage } | Failure> {
  const who = await resolveOther(input.handle);
  if (!who.ok) return who;
  const { viewer, other } = who;
  const parsed = messageSchema.safeParse({ body: input.body, images: input.images });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { body, images } = parsed.data;

  const supabase = await createSupabaseServer();
  let conversationId = input.conversationId;
  if (conversationId) {
    // The conversation must be the one with this person.
    if ((await findConversation(supabase, viewer.id, other)) !== conversationId) return { ok: false, error: OFFLINE };
  } else {
    const started = await ensureConversation(supabase, viewer.id, other);
    if (!started.ok) return { ok: false, error: started.error };
    conversationId = started.id;
  }
  if (images.some((image) => !isOwnMessagePath(image.path, conversationId, viewer.id))) {
    return { ok: false, error: "Those pictures didn't upload. Attach them again." };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, body, images })
    .select("id, created_at")
    .single();
  if (error?.code === "23514") return { ok: false, error: error.message };
  if (error || !data) return { ok: false, error: "Couldn't send your message. Try again in a moment." };

  const signed = images.length
    ? (await supabase.storage.from(MESSAGES_BUCKET).createSignedUrls(images.map((i) => i.path), 60 * 60 * 24)).data ?? []
    : [];
  const urls = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : [])));
  return {
    ok: true,
    conversationId,
    message: {
      id: data.id,
      fromMe: true,
      body,
      images: images.flatMap((image) => (urls.has(image.path) ? [{ ...image, url: urls.get(image.path)! }] : [])),
      createdAt: data.created_at,
    },
  };
}

/**
 * The viewer has read up to `upTo` (the newest message on their screen; the
 * other person sees "Seen"). Never moves back.
 */
export async function markRead(conversationId: string, upTo: string): Promise<void> {
  const viewer = await getViewer();
  // Kept as the database wrote it: a Date would drop the microseconds and fall short of the message.
  if (!viewer || !uuid.safeParse(conversationId).success || !TIMESTAMP.test(upTo)) return;
  const supabase = await createSupabaseServer();
  await supabase
    .from("conversation_members")
    .update({ last_read_at: upTo })
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.id)
    .or(`last_read_at.is.null,last_read_at.lt."${upTo}"`);
}

/** Archived conversations leave the inbox until a new message brings them back. */
export async function setArchived(conversationId: string, archived: boolean): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  if (!viewer || !uuid.safeParse(conversationId).success) return { ok: false };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("conversation_members")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.id)
    .select("conversation_id");
  return { ok: !error && Boolean(data?.length) };
}

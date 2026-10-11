import type { CommissionStatus, ImageAsset, Plan, SocialLink } from "@/lib/profile/types";

/*
 * Direct messages, as the client sees them. Shared by the Server Actions
 * (src/app/(site)/message-actions.ts) and the chat islands
 * (src/components/messages/). Client-safe: no server imports.
 */

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MESSAGE_IMAGES = 4;
/** Messages per page when a conversation opens or scrolls back. */
export const MESSAGE_PAGE = 40;

/** The other person in a conversation. */
export type ChatPerson = {
  handle: string;
  displayName: string;
  avatar: ImageAsset;
  plan: Plan;
  /** The color their art lights the conversation with (hex). */
  tint: string;
  /** Demo artists (mock-db) have no account: nobody reads what's sent to them. */
  demo: boolean;
};

/** A picture in a message: private storage, so `url` is signed and expires. */
export type ChatImage = { path: string; width: number; height: number; url: string };

/** What a client uploads and sends: a path in the `messages` bucket. */
export type StoredChatImage = { path: string; width: number; height: number };

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  body: string;
  images: ChatImage[];
  createdAt: string;
  /** Optimistic: still on its way, or it didn't go through. */
  status?: "sending" | "failed";
};

export type InboxEntry = {
  /** Conversation id. */
  id: string;
  person: ChatPerson;
  last: { body: string; fromMe: boolean; at: string };
  unread: boolean;
  archived: boolean;
};

/** The other person's card beside the conversation: who they are and how to work with them. */
export type StudioCard = {
  handle: string;
  displayName: string;
  pronouns?: string;
  headline: string;
  location?: string;
  joinedAt: string;
  plan: Plan;
  avatar: ImageAsset;
  banner: ImageAsset;
  /** Equipped avatar frame (src/lib/frames.ts). */
  frame?: string;
  rating?: { average: number; count: number };
  studio: {
    status: CommissionStatus;
    slotsTotal: number;
    slotsTaken: number;
    startingPriceUsd: number;
    turnaround: string;
  };
  services: { id: string; title: string; priceFromUsd: number }[];
  links: SocialLink[];
};

export type ThreadView = {
  /** Null until the first message is sent. */
  conversationId: string | null;
  person: ChatPerson;
  card: StudioCard;
  /** Oldest first. */
  messages: ChatMessage[];
  hasMore: boolean;
  /** Up to when the other person has read (for "Seen"). */
  theirReadAt: string | null;
  archived: boolean;
};

/** Realtime payloads from the database triggers (supabase/migrations/*_direct_messages.sql). */
export type MessageBroadcast = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  images: StoredChatImage[];
  created_at: string;
};

export type ReadBroadcast = { conversation_id: string; user_id: string; last_read_at: string };

/** Each person's private topic: new messages and read receipts. */
export const inboxTopic = (userId: string) => `inbox:${userId}`;
/** Typing hints between the two people in a conversation. */
export const chatTopic = (conversationId: string) => `chat:${conversationId}`;

/** The `messages` bucket: <conversation id>/<sender id>/<uuid>.<ext>. */
export const MESSAGES_BUCKET = "messages";

export function isOwnMessagePath(path: string, conversationId: string, userId: string) {
  const clean = (id: string) => id.replace(/[^a-f0-9-]/gi, "");
  return new RegExp(`^${clean(conversationId)}/${clean(userId)}/[0-9a-f-]{36}\\.(webp|jpg|gif)$`).test(path);
}

/** One line for the inbox: the words, or what was attached. */
export function previewOf(body: string, imageCount = 0) {
  const line = body.trim().replace(/\s+/g, " ");
  if (line) return line;
  return imageCount > 1 ? "Sent pictures" : "Sent a picture";
}

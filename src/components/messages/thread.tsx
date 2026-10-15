"use client";

import Image from "next/image";
import { Check, LoaderCircle, RotateCw } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { HandNote } from "@/components/explore/doodles";
import { Linkified } from "@/components/ui/linkified";
import type { ChatMessage, ChatPerson, StudioCard } from "@/lib/messages/types";
import { clockTime, postmarkDay, sameDay } from "@/lib/messages/time";
import { PostageStamp, Postmark, PostmarkRing } from "./postage";

/** Messages closer together than this (same sender, same day) share one timestamp. */
const GROUP_GAP = 5 * 60_000;

/**
 * One conversation, oldest first: the postcard that opens it, a postmark for
 * each day, bubbles grouped by sender (theirs washed in their art's color,
 * yours in ocean), "Seen" under your last one, and "… is sketching".
 */
export function Thread({
  person,
  card,
  messages,
  theirReadAt,
  typing,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onRetry,
}: {
  person: ChatPerson;
  card: StudioCard;
  messages: ChatMessage[];
  theirReadAt: string | null;
  typing: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onRetry: (id: string) => void;
}) {
  const first = person.displayName.split(" ")[0];
  const lastMine = messages.findLast((m) => m.fromMe && !m.status);
  const seen = Boolean(lastMine && theirReadAt && theirReadAt >= lastMine.createdAt);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      {hasMore ? (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-ink transition-colors hover:bg-ice disabled:opacity-60"
          >
            {loadingOlder && <LoaderCircle aria-hidden className="size-3.5 animate-spin" />}
            Load earlier messages
          </button>
        </div>
      ) : (
        <Postcard person={person} card={card} since={messages[0]?.createdAt} />
      )}

      {messages.map((message, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const newDay = !prev || !sameDay(prev.createdAt, message.createdAt);
        const startsGroup = newDay || prev.fromMe !== message.fromMe || gap(prev, message) > GROUP_GAP;
        const endsGroup =
          !next ||
          next.fromMe !== message.fromMe ||
          !sameDay(message.createdAt, next.createdAt) ||
          gap(message, next) > GROUP_GAP ||
          Boolean(message.status);
        const day = newDay ? postmarkDay(message.createdAt) : null;
        return (
          <Fragment key={message.id}>
            {day && <Postmark label={day.label} day={day.day} year={day.year} />}
            <Bubble
              message={message}
              startsGroup={startsGroup}
              footer={
                message.status === "sending" ? (
                  "Sending…"
                ) : message.status === "failed" ? (
                  <span className="text-danger">
                    Didn&apos;t send ·{" "}
                    <button
                      type="button"
                      onClick={() => onRetry(message.id)}
                      className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
                    >
                      <RotateCw aria-hidden className="size-3" />
                      Try again
                    </button>
                  </span>
                ) : endsGroup ? (
                  <>
                    {clockTime(message.createdAt)}
                    {message === lastMine && seen && (
                      <>
                        {" · "}
                        <span className="inline-flex items-center gap-0.5 font-semibold text-ocean-ink">
                          <Check aria-hidden className="size-3" strokeWidth={3} />
                          Seen
                        </span>
                      </>
                    )}
                  </>
                ) : null
              }
            />
          </Fragment>
        );
      })}

      {person.demo && <DemoNote first={first} />}

      <div aria-live="polite" className="min-h-6">
        {typing && <Sketching first={first} />}
      </div>
    </div>
  );
}

const gap = (a: ChatMessage, b: ChatMessage) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

function Bubble({ message, startsGroup, footer }: { message: ChatMessage; startsGroup: boolean; footer: ReactNode }) {
  const mine = message.fromMe;
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"} ${startsGroup ? "mt-3" : "mt-1"}`}>
      {message.images.length > 0 && (
        <div className={`flex max-w-[85%] flex-wrap gap-2 pb-1 ${mine ? "justify-end" : ""}`}>
          {message.images.map((image, i) => (
            <a
              key={image.path || i}
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open picture"
              className={`block rounded-[3px] bg-paper p-1.5 shadow-soft ring-1 ring-black/5 transition-transform hover:rotate-0 ${
                i % 2 ? "rotate-[1.2deg]" : "-rotate-[1deg]"
              } ${message.status ? "opacity-70" : ""}`}
            >
              <Image
                src={image.url}
                alt=""
                width={image.width}
                height={image.height}
                unoptimized
                className="block h-auto max-h-64 w-auto max-w-[min(15rem,60vw)] rounded-[2px] bg-ice object-contain"
              />
            </a>
          ))}
        </div>
      )}
      {message.body && (
        <p
          className={`max-w-[85%] px-3.5 py-2 text-[0.9375rem] leading-snug break-words whitespace-pre-wrap sm:max-w-[75%] ${
            mine
              ? "rounded-[18px] rounded-br-[6px] bg-ocean text-white [&_a]:text-white"
              : "tint-bubble rounded-[18px] rounded-bl-[6px] text-ink"
          } ${message.status === "sending" ? "opacity-70" : ""} ${message.status === "failed" ? "ring-2 ring-danger/50" : ""}`}
        >
          <Linkified text={message.body} />
        </p>
      )}
      {footer && <p className="mt-1 px-1 text-[0.6875rem] text-muted">{footer}</p>}
    </div>
  );
}

/**
 * How every conversation opens: a postcard from their studio (their cover as
 * the picture, their stamp, a postmark), then what this space is for.
 */
function Postcard({ person, card, since }: { person: ChatPerson; card: StudioCard; since?: string }) {
  const first = person.displayName.split(" ")[0];
  const day = postmarkDay(since ?? new Date().toISOString());
  return (
    <div className="flex flex-col items-center pt-4 pb-6 text-center">
      <figure className="relative w-full max-w-[21rem] -rotate-[1.5deg]">
        <div className="grain rounded-[6px] bg-paper p-2 pb-3 shadow-lift ring-1 ring-black/5">
          <div className="relative aspect-[2.3/1] overflow-hidden rounded-[3px] bg-ice">
            <Image src={card.banner.src} alt="" fill sizes="336px" className="object-cover" />
          </div>
          <figcaption className="px-1 pt-2 text-left">
            <HandNote tone="paper" className="text-[1.25rem]">
              greetings from {first}&apos;s studio
            </HandNote>
          </figcaption>
        </div>
        <PostageStamp image={person.avatar} size={52} tilt={5} className="absolute -top-4 -right-3" />
        <PostmarkRing day={day.day} year={day.year} className="absolute -top-3 right-9 size-14 rotate-[-14deg] text-ink/45" />
      </figure>
      <p className="mt-6 font-display text-lg font-extrabold text-ink">The start of your letters with {first}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Ask about a commission, a slot, or a piece you loved. Only the two of you can read this.
      </p>
    </div>
  );
}

/** Demo artists have no account behind them: say so, kindly, before anyone waits for an answer. */
function DemoNote({ first }: { first: string }) {
  return (
    <div className="mx-auto mt-5 max-w-xs rotate-[0.8deg] rounded-[4px] bg-paper px-4 py-3 text-center text-sm text-on-paper shadow-soft ring-1 ring-black/5">
      <span className="font-semibold">{first} is a demo artist.</span>{" "}
      <span className="text-paper-muted">Your messages are saved, but nobody&apos;s behind this inbox to write back.</span>
    </div>
  );
}

function Sketching({ first }: { first: string }) {
  return (
    <div className="mt-3 flex items-end gap-2">
      <span className="tint-bubble grid h-9 place-items-center rounded-[18px] rounded-bl-[6px] px-3">
        <svg aria-hidden viewBox="0 0 48 16" className="sketching h-4 w-12 text-ink/60">
          <path
            pathLength="1"
            d="M2 10c4-6 6 4 10-1s5-6 9 0 6 4 9-2 6-3 8 2 4 3 8-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="pb-1 text-xs text-muted">{first} is sketching…</span>
    </div>
  );
}

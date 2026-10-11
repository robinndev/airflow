import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Tape } from "@/components/explore/doodles";
import { Swatches, tiltOf } from "@/components/commissions/queue/parts";
import { StepTrack } from "@/components/commissions/queue/step-track";
import { daysUntil, relativeDay, STEP_LABEL } from "@/lib/commissions/queue";
import type { MyRequest } from "@/lib/commissions/requests";
import { formatShortDate, formatUsd, formatUsdExact } from "@/lib/format";
import { Postmark, PostageStamp, type PostmarkTone } from "./postage";
import { RouteLine } from "./route-line";

// Airmail edging, in the theme's own two colors.
const AIRMAIL =
  "repeating-linear-gradient(-45deg, var(--like) 0 9px, var(--paper) 9px 14px, var(--ocean) 14px 23px, var(--paper) 23px 28px)";

const stampDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });

function postmarkOf(request: MyRequest): { word: string; date: string; tone: PostmarkTone } {
  const date = (iso?: string) => stampDate.format(new Date(iso ?? request.sentAt)).replace(",", "");
  switch (request.status) {
    case "sent":
      return { word: "Sent", date: date(request.sentAt), tone: "muted" };
    case "waitlisted":
      return { word: "Waitlist", date: date(request.sentAt), tone: "lilac" };
    case "quoted":
      return { word: "Quoted", date: date(request.quotedAt), tone: "lilac" };
    case "paid":
      return request.step
        ? { word: STEP_LABEL[request.step], date: date(request.paidAt), tone: "ocean" }
        : { word: "Paid", date: date(request.paidAt), tone: "mint" };
    case "delivered":
      return { word: "Arrived", date: date(request.deliveredAt), tone: "ocean" };
    case "declined":
      return { word: "Returned", date: date(request.closedAt), tone: "like" };
    case "expired":
      return { word: "Expired", date: date(request.closedAt), tone: "like" };
    case "cancelled":
      return { word: "Cancelled", date: date(request.closedAt), tone: "like" };
  }
}

/**
 * One commission you asked for, as a postcard on its way to you: airmail
 * edging, the art on a postage stamp worth the price, a postmark with where
 * it stands, your note, the route it travels and what happens next.
 */
export function Postcard({ request, today }: { request: MyRequest; today: string }) {
  const { artist } = request;
  const first = artist.name.replace(/^@/, "").split(" ")[0];
  const mark = postmarkOf(request);
  const value = request.priceUsd > 0 ? formatUsd(request.priceUsd) : "Quote";

  return (
    <article
      data-request={request.id}
      aria-label={`${request.service} from ${artist.name}`}
      className="relative transition-[rotate] duration-500 ease-out [rotate:var(--tilt)] hover:[rotate:0deg]"
      style={{ "--tilt": `${tiltOf(request.id, 0.9)}deg` } as CSSProperties}
    >
      <div className="grain relative overflow-hidden rounded-[6px] bg-paper text-on-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),0_18px_36px_-18px_rgb(var(--shadow-rgb)/0.4)]">
        <span aria-hidden className="block h-1.5" style={{ backgroundImage: AIRMAIL }} />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 pt-5 sm:px-6">
          <div className="relative z-10 min-w-0">
            <p className="text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase">
              {request.real ? "Sent from Artiflow" : "Your request"}
            </p>
            <Link
              href={`/${artist.handle}`}
              className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full pr-2 text-sm hover:underline"
            >
              <Image
                src={artist.avatar.src}
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0 rounded-full bg-ice object-cover"
                style={{ objectPosition: artist.avatar.focus }}
              />
              <span className="truncate font-semibold">{artist.name}</span>
            </Link>
            <h3 className="mt-1.5 font-display text-[1.3125rem] leading-tight font-extrabold text-balance">{request.service}</h3>
            {request.character && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-paper-muted">
                <Swatches palette={request.character.palette} />
                for {request.character.name}
              </p>
            )}
            {request.extras && request.extras.length > 0 && (
              <p className="mt-1 text-xs text-paper-muted">+ {request.extras.map((extra) => extra.label).join(", ")}</p>
            )}
          </div>

          {/* Room below the stamp for the postmark, so its ink never runs into the note. */}
          <div className="relative w-[4.5rem] pt-1 pb-8 sm:w-[5.25rem] sm:pb-10">
            <PostageStamp image={request.cover} value={value} className="rotate-[3deg]" />
            <Postmark
              id={request.id}
              word={mark.word}
              date={mark.date}
              tone={mark.tone}
              className="absolute top-[3.75rem] -left-[4.25rem] w-28 -rotate-[10deg] sm:top-[4.5rem] sm:-left-[4.75rem] sm:w-32"
            />
          </div>
        </div>

        {request.status === "delivered" && request.delivery ? (
          <Delivered request={request} />
        ) : (
          <blockquote className="relative z-10 mx-5 mt-1 line-clamp-2 border-l-2 border-on-paper/10 pl-3 text-sm text-paper-muted italic sm:mx-6">
            &ldquo;{request.brief}&rdquo;
          </blockquote>
        )}

        <div className="mt-5 px-2 sm:px-3">
          <RouteLine request={request} />
        </div>

        <footer className="mt-4 flex items-center gap-4 border-t border-dashed border-on-paper/15 px-5 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1 text-sm">
            <NextStep request={request} today={today} first={first} />
          </div>
          {request.status === "paid" && request.progress && <Progress image={request.progress} first={first} />}
        </footer>
      </div>
    </article>
  );
}

function NextStep({ request, today, first }: { request: MyRequest; today: string; first: string }) {
  const due = request.dueAt ? daysUntil(request.dueAt, today) : undefined;
  const commissions = `/${request.artist.handle}/commissions`;

  switch (request.status) {
    case "quoted": {
      const left = request.quoteExpiresAt ? daysUntil(request.quoteExpiresAt, today) : undefined;
      return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <p>
            <span className="font-semibold">{first} sent a quote:</span>{" "}
            <span className="font-display text-base font-extrabold">{formatUsdExact(request.priceUsd)}</span>
            {left !== undefined && (
              <span className="mt-0.5 block text-xs">
                <Marker tone={left <= 1 ? "late" : "soon"}>Expires {relativeDay(left)}</Marker>
              </span>
            )}
          </p>
          {/* No checkout yet: say so, never pretend to charge. */}
          <span className="inline-flex h-9 items-center rounded-full border-2 border-dashed border-on-paper/20 px-3.5 text-[0.8125rem] font-semibold text-paper-muted">
            Pay {formatUsdExact(request.priceUsd)} · checkout opens soon
          </span>
        </div>
      );
    }
    case "paid":
      return request.step ? (
        <div className="grid gap-1.5">
          <StepTrack step={request.step} />
          <p className="text-xs text-paper-muted">
            {due !== undefined && (
              <Marker tone={due < 0 ? "late" : due <= 3 ? "soon" : "ok"}>
                {due < 0 ? `${-due} days late` : due === 0 ? "Due today" : `Due ${relativeDay(due)}`}
              </Marker>
            )}{" "}
            · {formatUsdExact(request.priceUsd)} paid
          </p>
        </div>
      ) : (
        <p>
          <span className="font-semibold">Paid, waiting its turn.</span>{" "}
          <span className="text-paper-muted">
            {first} starts soon{request.dueAt && <>; due {formatShortDate(request.dueAt)}</>}.
          </span>
        </p>
      );
    case "sent":
      return (
        <p>
          <span className="font-semibold">Waiting for {first} to reply.</span>{" "}
          <span className="text-paper-muted">Asked {relativeDay(daysUntil(request.sentAt, today))}. Nothing to pay until you get a quote.</span>
        </p>
      );
    case "waitlisted":
      return (
        <p>
          <span className="font-semibold">On {first}&apos;s waitlist.</span>{" "}
          <span className="text-paper-muted">No date yet and nothing to pay; you can leave any time.</span>
        </p>
      );
    case "delivered":
      return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p>
            <span className="font-semibold">Arrived {relativeDay(daysUntil(request.deliveredAt!, today))}.</span>{" "}
            <span className="text-paper-muted">{formatUsdExact(request.priceUsd)} paid.</span>
          </p>
          <PaperLink href={commissions}>Commission {first} again</PaperLink>
        </div>
      );
    case "declined":
      return (
        <div className="grid gap-2">
          {request.artistNote && (
            <p>
              <span className="font-semibold">{first}:</span> <span className="text-paper-muted">&ldquo;{request.artistNote}&rdquo;</span>
            </p>
          )}
          <p className="text-xs text-paper-muted">Returned to you. Nothing was charged.</p>
        </div>
      );
    case "expired":
    case "cancelled":
      return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-paper-muted">
            {request.status === "expired" ? "The quote ran out before it was paid." : "Cancelled."} Nothing was charged.
          </p>
          <PaperLink href={commissions}>Ask {first} again</PaperLink>
        </div>
      );
  }
}

/** The finished piece, printed on the card: the art is the hero here. */
function Delivered({ request }: { request: MyRequest }) {
  const image = request.delivery!;
  return (
    <figure className="mx-5 mt-4 sm:mx-6">
      <div
        className="relative mx-auto max-h-64 overflow-hidden rounded-[3px] border-[6px] border-paper shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.15),0_10px_24px_-12px_rgb(var(--shadow-rgb)/0.45)]"
        style={{ aspectRatio: `${image.width} / ${image.height}`, maxWidth: `calc(16rem * ${image.width / image.height})`, backgroundColor: image.palette?.[0] }}
      >
        <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 520px, 90vw" className="object-cover" />
      </div>
      <figcaption className="mt-2 text-center text-xs text-paper-muted">
        by {request.artist.name}, for {request.character?.name ?? "you"}
      </figcaption>
    </figure>
  );
}

/** The latest progress shot the artist shared, tucked into the corner like a photo. */
function Progress({ image, first }: { image: NonNullable<MyRequest["progress"]>; first: string }) {
  return (
    <figure className="relative shrink-0 rotate-[4deg]">
      <Tape tone="mint" className="-top-2 left-1/2 h-3.5! w-10! -translate-x-1/2 -rotate-6" />
      <span className="block bg-paper p-1 pb-3 shadow-[0_2px_6px_rgb(var(--shadow-rgb)/0.3)]">
        <span className="relative block size-14 overflow-hidden" style={{ backgroundColor: image.palette?.[0] }}>
          <Image src={image.src} alt={`Latest progress from ${first}`} fill sizes="56px" className="object-cover" />
        </span>
      </span>
    </figure>
  );
}

function Marker({ tone, children }: { tone: "late" | "soon" | "ok"; children: ReactNode }) {
  if (tone === "ok") return <span>{children}</span>;
  return (
    <span className={`-mx-0.5 inline-block -rotate-1 rounded-[3px] px-1 font-bold text-on-paper ${tone === "late" ? "bg-like/25" : "bg-star/35"}`}>
      {children}
    </span>
  );
}

function PaperLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-on-paper/15 px-3.5 text-[0.8125rem] font-semibold transition-colors hover:bg-on-paper/5"
    >
      {children}
      <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

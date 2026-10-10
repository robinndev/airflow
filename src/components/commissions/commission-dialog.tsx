"use client";

import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Ellipsis,
  Info,
  MessageCircle,
  MessagesSquare,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SaveButton } from "@/components/commissions/save-button";
import { FollowButton } from "@/components/profile/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { formatShortDate, formatUsd } from "@/lib/format";
import type {
  CommissionService,
  CommissionStatus,
  CommissionSummary,
  ImageAsset,
  Review,
  UsageRights,
} from "@/lib/profile/types";
import { CommissionRequestForm } from "./commission-request-form";
import { CUSTOM_SERVICE_ID, OPEN_SERVICE_EVENT, openService } from "./events";
import { ExampleCarousel } from "./example-carousel";

type CommissionDialogProps = {
  artist: { handle: string; displayName: string; avatar: ImageAsset; isPro: boolean };
  status: CommissionStatus;
  slotsLeft: number;
  note?: string;
  rating?: { average: number; count: number };
  terms?: CommissionSummary["terms"];
  services: CommissionService[];
  reviews: Review[];
};

type View = "details" | "request";

const USAGE_LABELS: { key: keyof UsageRights; label: string; hint: string }[] = [
  { key: "personal", label: "Personal", hint: "Profile pictures, gifts, your own non-monetized posts." },
  { key: "commercialContent", label: "Commercial: Content", hint: "Monetized videos, streams, book covers and ads." },
  { key: "commercialMerch", label: "Commercial: Merchandising", hint: "Prints, stickers, apparel and other products for sale." },
];

/**
 * Service detail modal: art on the left, details + request flow on the right.
 * Opened by any service row (or a #serviceId hash), so links are shareable.
 * Only the active service is rendered, so a closed modal costs no images.
 */
export function CommissionDialog(props: CommissionDialogProps) {
  const { artist, services } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("details");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [round, setRound] = useState(0);

  const open = useCallback(
    (id: string) => {
      const isCustom = id === CUSTOM_SERVICE_ID;
      if (!isCustom && !services.some((s) => s.id === id)) return;
      setActiveId(id);
      setView(isCustom ? "request" : "details");
      setTermsAccepted(false);
      setRound((r) => r + 1);
      history.replaceState(null, "", `#${id}`);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    },
    [services],
  );

  useEffect(() => {
    const onOpen = (event: Event) => open((event as CustomEvent<string>).detail);
    window.addEventListener(OPEN_SERVICE_EVENT, onOpen);
    // Deep link (/mira/commissions#svc_halfbody) goes through the same event.
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) openService(hash);
    return () => window.removeEventListener(OPEN_SERVICE_EVENT, onOpen);
  }, [open]);

  const close = () => dialogRef.current?.close();

  const service = services.find((s) => s.id === activeId);
  const isCustom = activeId === CUSTOM_SERVICE_ID;
  const firstName = artist.displayName.split(" ")[0];
  const hasTerms = Boolean(props.terms?.length);

  return (
    <dialog
      ref={dialogRef}
      aria-label={service ? service.title : "Custom commission request"}
      onClose={() =>
        history.replaceState(null, "", window.location.pathname + window.location.search)
      }
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-surface p-0 text-ink outline-none backdrop:bg-scrim/55 backdrop:backdrop-blur-[2px] open:flex sm:m-auto sm:h-[min(58rem,calc(100dvh-3rem))] sm:w-[min(80rem,calc(100vw-3rem))] sm:rounded-[28px] sm:shadow-lift"
    >
      {(service || isCustom) && (
        <div className="relative grid min-h-0 w-full md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)]">
          <CircleButton label="Close" onClick={close} className="absolute top-5 left-5 z-10">
            <X aria-hidden />
          </CircleButton>

          {/* Left: the art. Desktop scrolls a column; phones get a carousel instead. */}
          <div className="hidden min-h-0 overflow-y-auto overscroll-contain bg-canvas md:block">
            {service ? (
              <div className="mx-auto grid max-w-[38rem] gap-5 px-10 py-20">
                {service.examples.map((image, i) => (
                  <Image
                    key={`${image.src}-${i}`}
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 1280px) 608px, 45vw"
                    className="h-auto w-full rounded-[20px] bg-ice shadow-soft"
                  />
                ))}
              </div>
            ) : (
              <CustomArt />
            )}
          </div>

          {/* Right: details or the request form. */}
          <div className="flex min-h-0 flex-col md:border-l md:border-border">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {service && (
                <div className="relative aspect-[4/3] bg-ice md:hidden">
                  <ExampleCarousel images={service.examples} title={service.title} />
                </div>
              )}
              {isCustom && (
                <div className="h-44 md:hidden">
                  <CustomArt />
                </div>
              )}

              {view === "details" && service ? (
                <ServiceDetails {...props} service={service} firstName={firstName} />
              ) : (
                <div>
                  <div className="flex items-center gap-3 px-6 pt-8 sm:px-8 md:pt-20">
                    {service && (
                      <button
                        type="button"
                        onClick={() => setView("details")}
                        aria-label="Back to service details"
                        className="grid size-10 shrink-0 place-items-center rounded-full border border-border transition-colors hover:bg-ice"
                      >
                        <ArrowLeft aria-hidden className="size-4" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                        {props.status === "waitlist" ? "Join the waitlist" : "New request"}
                      </p>
                      <h2 className="truncate font-display text-2xl font-extrabold">
                        {service ? service.title : "Custom piece"}
                      </h2>
                    </div>
                  </div>
                  <div className="px-1 sm:px-2">
                    <CommissionRequestForm
                      key={round}
                      handle={artist.handle}
                      artistName={artist.displayName}
                      status={props.status}
                      services={services.map(({ id, title, priceFromUsd }) => ({
                        id,
                        title,
                        priceFromUsd,
                      }))}
                      serviceId={activeId ?? CUSTOM_SERVICE_ID}
                      onServiceChange={setActiveId}
                      lockService
                      termsAccepted={termsAccepted}
                      onDone={close}
                    />
                  </div>
                </div>
              )}
            </div>

            {view === "details" && service && (
              <footer className="grid gap-3 border-t border-border bg-surface px-6 py-5 sm:px-8">
                {props.status !== "closed" && hasTerms && (
                  <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-border px-4 py-3 transition-colors has-checked:border-ocean has-checked:bg-ice/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ocean">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="size-5 shrink-0 accent-ocean"
                    />
                    <span className="text-[0.9375rem] font-semibold text-ink">
                      I accept {firstName}&apos;s Terms of Service
                    </span>
                  </label>
                )}
                <div className="flex items-center gap-3">
                  {props.status === "closed" ? (
                    <p className="flex-1 text-sm text-muted">Commissions are closed right now.</p>
                  ) : (
                    <button
                      type="button"
                      disabled={hasTerms && !termsAccepted}
                      onClick={() => setView("request")}
                      className={buttonClasses({ size: "lg", className: "h-12 flex-1" })}
                    >
                      {hasTerms && !termsAccepted
                        ? "Accept terms to start request"
                        : props.status === "waitlist"
                          ? "Join the waitlist"
                          : "Start request"}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Message ${firstName}`}
                    className="grid size-12 shrink-0 place-items-center rounded-full border border-border transition-colors hover:bg-ice"
                  >
                    <MessageCircle aria-hidden className="size-5" />
                  </button>
                </div>
                {props.slotsLeft > 0 && props.slotsLeft <= 2 && props.status === "open" && (
                  <p className="text-center text-xs font-semibold text-mint-ink">
                    Only {props.slotsLeft} {props.slotsLeft === 1 ? "slot" : "slots"} left
                  </p>
                )}
              </footer>
            )}
          </div>

          {service && view === "details" && (
            <div className="absolute top-5 right-5 z-10 flex items-center gap-1 rounded-full bg-surface/90 p-1 shadow-soft backdrop-blur-sm">
              <SaveButton title={service.title} />
              <button
                type="button"
                aria-label="More options"
                className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
              >
                <Ellipsis aria-hidden className="size-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

function ServiceDetails({
  artist,
  note,
  rating,
  reviews,
  terms,
  service,
  firstName,
}: CommissionDialogProps & { service: CommissionService; firstName: string }) {
  const [tab, setTab] = useState<"description" | "reviews">("description");
  const original = service.discountPercent
    ? Math.round(service.priceFromUsd / (1 - service.discountPercent / 100))
    : null;

  return (
    <div className="grid gap-8 px-6 pt-8 pb-10 sm:px-8 md:pt-20">
      {/* Title & price */}
      <header>
        <div className="flex flex-wrap items-center gap-3">
          {service.discountPercent && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac/12 px-3 py-1 text-sm font-semibold text-lilac-ink">
              <Tag aria-hidden className="size-3.5" />
              {service.discountPercent}% off
            </span>
          )}
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <span aria-hidden className="size-2 rounded-full bg-mint" />
            {service.category}
          </span>
        </div>
        <h2 className="mt-3 font-display text-[2rem] leading-[1.1] font-extrabold tracking-tight">
          {service.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-lg text-muted">From</span>
          <span className="font-display text-[1.75rem] leading-none font-extrabold text-accent-strong">
            {formatUsd(service.priceFromUsd)}
          </span>
          {original && <s className="text-base text-muted">{formatUsd(original)}</s>}
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
          <Clock aria-hidden className="size-4" />
          Delivered in {service.turnaround}
        </p>
      </header>

      {/* Usage rights */}
      <section aria-labelledby="usage-heading">
        <SectionTitle id="usage-heading">Usage rights</SectionTitle>
        <ul className="mt-3 divide-y divide-border rounded-[16px] border border-border">
          {USAGE_LABELS.map(({ key, label, hint }) => {
            const allowed = service.usage[key];
            return (
              <li key={key} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full ${
                    allowed ? "bg-mint/15 text-mint-strong" : "bg-ice text-muted/70"
                  }`}
                >
                  {allowed ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : (
                    <X aria-hidden className="size-3.5" />
                  )}
                </span>
                <span
                  className={`flex-1 text-[0.9375rem] ${
                    allowed ? "font-medium text-ink" : "text-muted line-through"
                  }`}
                >
                  {label}
                  <span className="sr-only">{allowed ? " (included)" : " (not included)"}</span>
                </span>
                <span title={hint} className="text-muted/80">
                  <Info aria-hidden className="size-4" />
                  <span className="sr-only">{hint}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Artist */}
      <section aria-label="About the artist" className="grid gap-4">
        <div className="flex items-center gap-3.5">
          <span className="relative">
            <Avatar image={artist.avatar} size={48} className="size-12" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1.0625rem] font-bold">{artist.displayName}</p>
            <p className="truncate text-sm text-muted">@{artist.handle}</p>
          </div>
          <FollowButton handle={artist.handle} />
        </div>
        {note && (
          <blockquote className="rounded-[16px] bg-ice/70 px-5 py-4 text-[0.9375rem] leading-relaxed text-ink/85">
            {note}
          </blockquote>
        )}
        <div className="flex items-start gap-3 rounded-[16px] border border-border px-5 py-4">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-mint-strong" />
          <p className="text-sm leading-relaxed text-ink/85">
            <span className="font-semibold text-ink">Secure checkout.</span> You only pay after{" "}
            {firstName} accepts and sends a quote. Payment methods are shown at checkout.
          </p>
        </div>
      </section>

      {/* Description / reviews */}
      <section>
        <div
          role="tablist"
          aria-label="Service information"
          className="flex gap-7 border-b border-border"
        >
          <TabButton active={tab === "description"} onClick={() => setTab("description")}>
            Description
          </TabButton>
          <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
            <Star aria-hidden className="size-4 fill-star text-star" />
            {rating ? `${rating.average.toFixed(1)} · ${rating.count} reviews` : "Reviews"}
          </TabButton>
        </div>

        {tab === "description" ? (
          <div role="tabpanel" className="mt-6 grid gap-3">
            <p className="mb-2 text-[0.9375rem] leading-relaxed text-ink/85">
              {service.description}
            </p>
            <Feature icon={<Sparkles aria-hidden />} title="What's included">
              {service.includes.join(" · ")}
            </Feature>
            <Feature icon={<MessagesSquare aria-hidden />} title="Open communication">
              Sketch approval, WIP updates and revisions along the way
            </Feature>
            <Feature icon={<PackageCheck aria-hidden />} title="How it works">
              Request → quote → secure payment → delivery in {service.turnaround}
            </Feature>
          </div>
        ) : (
          <ul role="tabpanel" className="mt-6 grid gap-3">
            {reviews.length === 0 && <li className="text-sm text-muted">No reviews yet.</li>}
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </ul>
        )}
      </section>

      {terms && terms.length > 0 && <TermsCard terms={terms} firstName={firstName} />}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <li className="rounded-[16px] border border-border px-5 py-4">
      <div className="flex items-center gap-3">
        {review.authorAvatar ? (
          <Avatar image={{ ...review.authorAvatar, alt: "" }} size={40} className="size-10" />
        ) : (
          <InitialsAvatar name={review.author} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">@{review.author}</p>
          <p className="truncate text-xs text-muted">
            {review.serviceTitle} · {formatShortDate(review.createdAt)}
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-0.5" aria-label={`${review.rating} out of 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              aria-hidden
              className={`size-3.5 ${
                i < review.rating ? "fill-star text-star" : "text-border"
              }`}
            />
          ))}
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink/85">{review.text}</p>
    </li>
  );
}

const INITIALS_TINTS = [
  "bg-sky/20 text-sky-ink",
  "bg-lilac/20 text-lilac-ink",
  "bg-mint/20 text-mint-ink",
];

/** Fallback for reviewers without a profile picture. */
function InitialsAvatar({ name }: { name: string }) {
  const tint = INITIALS_TINTS[name.length % INITIALS_TINTS.length];
  return (
    <span
      aria-hidden
      className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold uppercase ${tint}`}
    >
      {name.replace(/[^a-z0-9]/gi, "").slice(0, 2)}
    </span>
  );
}

/** Collapsed to a preview with a fade; expands in place. */
function TermsCard({
  terms,
  firstName,
}: {
  terms: NonNullable<CommissionSummary["terms"]>;
  firstName: string;
}) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);

  return (
    <section aria-labelledby={`${contentId}-title`} className="rounded-[20px] border border-border">
      <h3 id={`${contentId}-title`} className="px-5 pt-5 font-display text-lg font-extrabold">
        {firstName}&apos;s Terms of Service
      </h3>
      <div id={contentId} className={`relative overflow-hidden px-5 ${expanded ? "" : "max-h-56"}`}>
        <div className="grid gap-5 pt-4 pb-5">
          {terms.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-bold tracking-wider text-ink uppercase">
                {section.title}
              </h4>
              <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-sm leading-relaxed text-ink/80 marker:text-border">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {!expanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface to-transparent"
          />
        )}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-b-[20px] border-t border-border py-3 text-sm font-semibold text-accent-strong transition-colors hover:bg-ice/50"
      >
        {expanded ? "Show less" : "Read full terms"}
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </section>
  );
}

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-xs font-bold tracking-wider text-muted uppercase">
      {children}
    </h3>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-3.5 text-[0.9375rem] font-semibold transition-colors ${
        active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-[16px] border border-border px-5 py-4">
      <span className="mt-0.5 text-lilac-ink [&_svg]:size-5">{icon}</span>
      <div>
        <p className="text-[0.9375rem] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}

function CustomArt() {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-br from-lilac/15 via-sky/10 to-mint/15">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-16 place-items-center rounded-[20px] bg-surface text-lilac-ink shadow-soft">
          <Sparkles aria-hidden className="size-7" />
        </span>
        <span className="font-display font-bold text-ink/70">Your idea here</span>
      </div>
    </div>
  );
}

function CircleButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur-sm transition-colors hover:bg-surface [&_svg]:size-5 ${className}`}
    >
      {children}
    </button>
  );
}

"use client";

import Image from "next/image";
import { CornerDownLeft, LoaderCircle, MapPin, Pencil, X } from "lucide-react";
import { useId, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { updateProfileDetails, type ProfileDetails } from "@/app/(site)/customize/actions";
import { HandNote, Scribble, Sparkle, Tape } from "@/components/explore/doodles";
import { FramedAvatar } from "@/components/frames/avatar-frame";
import { SocialIcon } from "@/components/icons/social-icon";
import { buttonClasses } from "@/components/ui/button";
import type { Customization } from "@/lib/customization/model";
import { nameStyle } from "@/lib/customization/style";
import { MAX_LINKS, normalizeUrl, toSocialLink } from "@/lib/profile/links";
import type { ImageAsset } from "@/lib/profile/types";

/*
 * "Edit profile" as a sketchbook spread: on the left, your artist card,
 * redrawn live as you type (with your frame and name style); on the right,
 * the page you write on. Picture and cover keep their own buttons.
 */

const PRONOUNS = ["she/her", "he/him", "they/them", "any/all", "she/they", "he/they"];

// Ink-on-paper fields: an underline you write on, not a box.
const ink =
  "w-full border-0 border-b-2 border-dashed border-paper-muted/35 bg-transparent px-0.5 pt-1 pb-1.5 text-[0.9375rem] text-on-paper outline-none transition-colors placeholder:text-paper-muted/60 focus:border-solid focus:border-ocean aria-invalid:border-danger";

export function EditProfileButton({
  initial,
  handle,
  avatar,
  custom,
}: {
  initial: ProfileDetails;
  handle: string;
  avatar: ImageAsset;
  /** The profile's (gated) customization, so the card wears the real frame and name style. */
  custom: Customization;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(initial);
  const [draftLink, setDraftLink] = useState("");
  const [error, setError] = useState<{ message: string; field?: keyof ProfileDetails } | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  const set = <K extends keyof ProfileDetails>(key: K, value: ProfileDetails[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  function open() {
    setForm(initial);
    setDraftLink("");
    setError(null);
    dialogRef.current?.showModal();
  }

  /** Turns the draft into a link sticker; false (with a message) when it isn't a web address. */
  function addDraftLink() {
    if (!draftLink.trim()) return true;
    const url = normalizeUrl(draftLink);
    if (!url) {
      setError({ message: `“${draftLink.trim()}” isn't a web address.`, field: "links" });
      return false;
    }
    // Already there: just clear the field.
    if (form.links.some((l) => normalizeUrl(l.url) === url)) {
      setDraftLink("");
      return true;
    }
    if (form.links.length >= MAX_LINKS) {
      setError({ message: `Up to ${MAX_LINKS} links.`, field: "links" });
      return false;
    }
    set("links", [...form.links, { url }]);
    setDraftLink("");
    return true;
  }

  function onLinkKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraftLink();
    }
  }

  function save() {
    // A link still sitting in the field counts — nobody should lose it to a missing Enter.
    const draftUrl = draftLink.trim() ? normalizeUrl(draftLink) : null;
    if (draftLink.trim() && !draftUrl) {
      setError({ message: `“${draftLink.trim()}” isn't a web address.`, field: "links" });
      return;
    }
    const fresh = draftUrl && !form.links.some((l) => normalizeUrl(l.url) === draftUrl);
    const payload = fresh ? { ...form, links: [...form.links, { url: draftUrl }] } : form;
    startTransition(async () => {
      const result = await updateProfileDetails(payload);
      if (result.ok) {
        setDraftLink("");
        dialogRef.current?.close();
      } else setError({ message: result.error, field: result.field });
    });
  }

  const name = nameStyle(custom);
  const links = form.links.flatMap((l) => {
    const url = normalizeUrl(l.url);
    return url ? [toSocialLink(url, l.label)] : [];
  });

  return (
    <>
      <button type="button" onClick={open} className={buttonClasses({ variant: "secondary" })}>
        <Pencil aria-hidden />
        Edit profile
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
        className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(60rem,calc(100vw-1.5rem))] overflow-hidden rounded-panel bg-surface p-0 text-ink shadow-lift outline-none backdrop:bg-scrim/60 backdrop:backdrop-blur-[3px] open:flex open:flex-col"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-baseline gap-3">
            <h2 id={`${id}-title`} className="font-display text-xl font-extrabold tracking-tight">
              Edit profile
            </h2>
            <HandNote tone="lilac" className="-rotate-2 text-xl">
              make it yours ✎
            </HandNote>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {/* Left page: the card, live */}
          <div className="relative overflow-hidden bg-ice px-6 py-8 md:py-10">
            <Sparkle className="absolute top-6 right-8 size-5 text-lilac" />
            <Sparkle className="absolute bottom-10 left-6 size-3 text-mint" />
            <figure className="relative mx-auto max-w-[19rem] -rotate-[1.5deg] rounded-[18px] dot-paper bg-[size:14px_14px] px-6 pt-9 pb-7 text-center text-on-paper shadow-lift">
              <Tape tone="lilac" className="-top-3 -left-5 -rotate-[24deg]" />
              <Tape tone="mint" className="-top-3 -right-6 rotate-[20deg]" />

              <FramedAvatar frame={custom.frame} className="mx-auto">
                <Image src={avatar.src} alt="" width={104} height={104} className="size-24 rounded-full bg-ice object-cover shadow-soft ring-4 ring-paper" />
              </FramedAvatar>

              <p
                style={name.style}
                className={`mt-5 font-display text-[calc(1.5rem*var(--name-scale,1))] leading-tight font-extrabold tracking-tight break-words text-on-paper ${name.className}`}
              >
                {form.displayName || "Your name"}
              </p>
              <p className="mt-0.5 font-hand text-xl leading-none text-paper-muted">@{handle}</p>

              {(form.headline || !form.bio) && (
                <p className="mt-3 text-sm font-semibold text-balance">{form.headline || "Your one-line headline"}</p>
              )}
              {form.bio && <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-pretty text-on-paper/80">{form.bio}</p>}

              {(form.pronouns || form.location) && (
                <p className="mt-4 flex flex-wrap justify-center gap-2">
                  {form.pronouns && (
                    <span className="rounded-full border-[1.5px] border-current px-2.5 py-0.5 font-display text-[0.6875rem] font-bold tracking-wide text-lilac-ink">
                      {form.pronouns}
                    </span>
                  )}
                  {form.location && (
                    <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-current px-2.5 py-0.5 font-display text-[0.6875rem] font-bold tracking-wide text-mint-ink">
                      <MapPin aria-hidden className="size-3" />
                      {form.location}
                    </span>
                  )}
                </p>
              )}

              {links.length > 0 && (
                <p className="mt-4 flex justify-center gap-2">
                  {links.map((link, i) => (
                    <span key={i} title={link.label} className="grid size-8 place-items-center rounded-full bg-ice text-ocean-ink">
                      <SocialIcon platform={link.platform} className="size-4" />
                    </span>
                  ))}
                </p>
              )}
            </figure>
            <HandNote tone="muted" className="mt-6 block rotate-[-2deg] text-center text-lg">
              ↑ this is what visitors see
            </HandNote>
          </div>

          {/* Right page: where you write */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="grid content-start gap-6 dot-paper bg-[size:18px_18px] px-6 py-7 text-on-paper sm:px-8"
          >
            <Prompt label="what should people call you?" htmlFor={`${id}-name`} count={[form.displayName.length, 50]}>
              <input
                id={`${id}-name`}
                value={form.displayName}
                maxLength={50}
                required
                aria-invalid={error?.field === "displayName" ? true : undefined}
                onChange={(e) => set("displayName", e.target.value)}
                className={`${ink} font-display text-xl font-extrabold`}
              />
            </Prompt>

            <Prompt label="say it in one line" htmlFor={`${id}-headline`} count={[form.headline.length, 80]}>
              <input
                id={`${id}-headline`}
                value={form.headline}
                maxLength={80}
                placeholder="Illustrator · OC designer · Commissions open"
                aria-invalid={error?.field === "headline" ? true : undefined}
                onChange={(e) => set("headline", e.target.value)}
                className={ink}
              />
            </Prompt>

            <Prompt label="tell your story" htmlFor={`${id}-bio`} count={[form.bio.length, 300]}>
              <textarea
                id={`${id}-bio`}
                value={form.bio}
                maxLength={300}
                rows={4}
                placeholder="What you draw, what you love, what people can commission you for."
                aria-invalid={error?.field === "bio" ? true : undefined}
                onChange={(e) => set("bio", e.target.value)}
                // Notebook lines under the text.
                className="w-full resize-none rounded-[6px] bg-transparent px-1 text-[0.9375rem] leading-[1.75rem] text-on-paper outline-none placeholder:text-paper-muted/60 focus:bg-ocean/[0.04] aria-invalid:outline-2 aria-invalid:outline-danger"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(transparent 0 calc(1.75rem - 1px), color-mix(in oklab, var(--ocean) 22%, transparent) calc(1.75rem - 1px) 1.75rem)",
                  backgroundAttachment: "local",
                }}
              />
            </Prompt>

            <div className="grid gap-6 sm:grid-cols-2">
              <Prompt label="pronouns" htmlFor={`${id}-pronouns`}>
                <input
                  id={`${id}-pronouns`}
                  value={form.pronouns}
                  maxLength={24}
                  placeholder="she/her"
                  aria-invalid={error?.field === "pronouns" ? true : undefined}
                  onChange={(e) => set("pronouns", e.target.value)}
                  className={ink}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRONOUNS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={form.pronouns === p}
                      onClick={() => set("pronouns", form.pronouns === p ? "" : p)}
                      className="rounded-full border border-paper-muted/30 px-2 py-0.5 text-xs font-medium text-paper-muted transition-colors hover:border-ocean hover:text-ocean-ink aria-pressed:border-ocean aria-pressed:bg-ocean aria-pressed:text-white"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Prompt>
              <Prompt label="drawing from…" htmlFor={`${id}-location`}>
                <input
                  id={`${id}-location`}
                  value={form.location}
                  maxLength={40}
                  placeholder="Lisbon, Portugal"
                  aria-invalid={error?.field === "location" ? true : undefined}
                  onChange={(e) => set("location", e.target.value)}
                  className={ink}
                />
              </Prompt>
            </div>

            <Prompt label="find me elsewhere" htmlFor={`${id}-link`} count={[form.links.length, MAX_LINKS]}>
              {form.links.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {form.links.map((link, i) => {
                    const url = normalizeUrl(link.url);
                    const social = url ? toSocialLink(url, link.label) : null;
                    return (
                      <li
                        key={`${link.url}-${i}`}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface py-1 pr-1 pl-2 text-sm font-medium text-ink shadow-soft"
                        style={{ rotate: `${((i * 7) % 5) - 2}deg` }}
                      >
                        <SocialIcon platform={social?.platform ?? "website"} className="size-4 shrink-0 text-accent-strong" />
                        <span className="truncate">{social?.label ?? link.url}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${social?.label ?? "link"}`}
                          onClick={() => set("links", form.links.filter((_, j) => j !== i))}
                          className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {form.links.length < MAX_LINKS && (
                <div className="relative">
                  <input
                    id={`${id}-link`}
                    value={draftLink}
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="paste a link — instagram.com/you"
                    aria-invalid={error?.field === "links" ? true : undefined}
                    aria-describedby={`${id}-link-hint`}
                    onChange={(e) => {
                      setDraftLink(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={onLinkKey}
                    onBlur={addDraftLink}
                    className={`${ink} pr-10`}
                  />
                  <span aria-hidden className="pointer-events-none absolute top-1.5 right-1 text-paper-muted/70">
                    <CornerDownLeft className="size-4" />
                  </span>
                  <p id={`${id}-link-hint`} className="mt-1.5 text-xs text-paper-muted">
                    Enter adds it. Instagram, TikTok, X, YouTube, Twitch, Bluesky and Ko-fi get their icon.
                  </p>
                </div>
              )}
            </Prompt>

            <button type="submit" hidden />
          </form>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-6 py-4">
          {error && (
            <p role="alert" className="mr-auto text-sm text-danger">
              {error.message}
            </p>
          )}
          <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClasses({ variant: "ghost" })}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={pending} className={buttonClasses({ className: "min-w-28" })}>
            {pending && <LoaderCircle aria-hidden className="animate-spin" />}
            Save changes
          </button>
        </footer>
      </dialog>
    </>
  );
}

/** A handwritten prompt above a field, with a small counter on the margin. */
function Prompt({
  label,
  htmlFor,
  count,
  children,
}: {
  label: string;
  htmlFor: string;
  count?: [number, number];
  children: ReactNode;
}) {
  const near = count && count[0] > count[1] * 0.9;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={htmlFor} className="relative font-hand text-[1.375rem] leading-none font-semibold text-lilac-ink">
          {label}
          <Scribble className="absolute -bottom-2 left-0 w-full max-w-36 text-lilac/40" />
        </label>
        {count && (
          <span className={`font-hand text-base leading-none tabular-nums ${near ? "text-danger" : "text-paper-muted"}`}>
            {count[0]}/{count[1]}
          </span>
        )}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

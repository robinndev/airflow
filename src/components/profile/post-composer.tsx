"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { useActionState, useId, useRef, useState, type ChangeEvent } from "react";
import { createPost, type ActionResult } from "@/app/(site)/[handle]/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { discardArt, prepareImage, uploadArt, type PreparedImage } from "@/lib/images/prepare";
import { POST_KIND_ORDER, POST_KINDS } from "@/lib/profile/post-kinds";
import type { ImageAsset, PostKind } from "@/lib/profile/types";

const MAX_LENGTH = 2000;
/** The feed lays out up to four pieces per post (justified rows, nothing cropped). */
const MAX_IMAGES = 4;

type PostComposerProps = {
  handle: string;
  displayName: string;
  avatar: ImageAsset;
  /** "card" on profiles; "inline" sits flush inside a list. */
  variant?: "card" | "inline";
  /** Preselected post type (the home feed's canvas opens straight into one). */
  initialKind?: PostKind;
  /** Called after a post is published (e.g. to close a dialog). */
  onPosted?: () => void;
};

export function PostComposer({
  handle,
  displayName,
  avatar,
  variant = "card",
  initialKind = "finished",
  onPosted,
}: PostComposerProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);

  function clearImages() {
    for (const image of images) URL.revokeObjectURL(image.previewUrl);
    setImages([]);
  }

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData): Promise<ActionResult> => {
      // Images go straight to storage first, side by side; the post then points at them.
      const uploads = await Promise.allSettled(images.map((image) => uploadArt(image, "posts")));
      const paths = uploads.flatMap((u) => (u.status === "fulfilled" ? [u.value] : []));
      const failed = uploads.find((u) => u.status === "rejected");
      if (failed) {
        await Promise.all(paths.map(discardArt));
        const reason = (failed as PromiseRejectedResult).reason;
        return { ok: false, error: reason instanceof Error ? reason.message : "Upload failed. Try again." };
      }
      formData.set(
        "images",
        JSON.stringify(images.map(({ width, height, palette }, i) => ({ path: paths[i], width, height, palette }))),
      );
      const result = await createPost(handle, prev, formData);
      if (result.ok) {
        setBody("");
        clearImages();
        onPosted?.();
      } else {
        await Promise.all(paths.map(discardArt));
      }
      return result;
    },
    null,
  );

  function removeImage(index: number) {
    URL.revokeObjectURL(images[index].previewUrl);
    setImages((current) => current.filter((_, i) => i !== index));
  }

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    setImageError(files.length > room ? `A post holds up to ${MAX_IMAGES} images — kept the first ${room}.` : null);
    setPreparingImage(true);
    try {
      const prepared = await Promise.all(files.slice(0, room).map((file) => prepareImage(file, 2400)));
      setImages((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Couldn't read that image.");
    } finally {
      setPreparingImage(false);
    }
  }

  const remaining = MAX_LENGTH - body.length;
  const canPost = body.trim().length > 0 && remaining >= 0 && !pending && !preparingImage;
  const error = imageError ?? (state && !state.ok ? state.error : null);

  return (
    <form
      action={formAction}
      aria-label="Create a post"
      className={
        variant === "card"
          ? "rounded-card border border-border bg-surface shadow-soft transition-shadow focus-within:border-sky/70 focus-within:shadow-lift"
          : "border-b border-border bg-surface"
      }
    >
      <div className="flex gap-3 px-5 pt-5">
        <Avatar image={avatar} size={44} className="size-11" />
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-body`} className="sr-only">
            Post text
          </label>
          <textarea
            id={`${id}-body`}
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder={`What's on your canvas, ${displayName.split(" ")[0]}?`}
            className="field-sizing-content block max-h-80 min-h-14 w-full resize-none bg-transparent pt-2.5 text-[0.9375rem] leading-relaxed text-ink outline-none placeholder:text-muted/80"
          />
        </div>
      </div>

      {images.length > 0 && (
        <ul aria-label="Selected images" className="flex flex-wrap gap-2 px-5 pt-2 sm:pl-[4.75rem]">
          {images.map((image, i) => (
            <li
              key={image.previewUrl}
              className="relative overflow-hidden rounded-[12px] border border-border bg-ice"
              style={{ backgroundColor: image.palette[0] }}
            >
              <Image
                src={image.previewUrl}
                alt={`Selected image ${i + 1} of ${images.length}`}
                width={image.width}
                height={image.height}
                unoptimized
                className={`w-auto object-contain ${images.length === 1 ? "max-h-64" : "h-28"}`}
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label={`Remove image ${i + 1}`}
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-scrim/70 text-white transition-colors hover:bg-scrim"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="px-5 pt-3 sm:pl-[4.75rem]">
        <legend className="sr-only">Post type</legend>
        <div className="flex flex-wrap gap-1.5">
          {POST_KIND_ORDER.map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="peer sr-only"
              />
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ocean ${
                  kind === value
                    ? `border-transparent ${POST_KINDS[value].className}`
                    : "border-border text-muted hover:text-ink"
                }`}
              >
                {POST_KINDS[value].label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex items-center gap-2 border-t border-border px-3 py-3 sm:px-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleImages}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={preparingImage || pending || images.length >= MAX_IMAGES}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          {preparingImage ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <ImagePlus aria-hidden />
          )}
          {images.length === 0 ? "Add images" : `Images ${images.length}/${MAX_IMAGES}`}
        </button>

        <p role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-xs text-danger">
          {error}
        </p>

        {body.length > 0 && <CharacterRing used={body.length} max={MAX_LENGTH} />}

        <button
          type="submit"
          disabled={!canPost}
          className={buttonClasses({ size: "sm", className: "px-4" })}
        >
          {pending ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <Send aria-hidden />
          )}
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}

/** Fills as you type; turns amber near the limit and shows the count in the last 20. */
function CharacterRing({ used, max }: { used: number; max: number }) {
  const remaining = max - used;
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, used / max);
  const color = remaining < 0 ? "var(--danger)" : remaining <= 100 ? "var(--star)" : "var(--ocean)";
  const showCount = remaining <= 20;

  return (
    <span
      role="meter"
      aria-label="Characters used"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={used}
      className="relative grid size-7 shrink-0 place-items-center"
    >
      <svg viewBox="0 0 24 24" className={`size-7 -rotate-90 transition-transform ${showCount ? "scale-110" : ""}`} aria-hidden>
        <circle cx="12" cy="12" r={radius} fill="none" strokeWidth="2.5" className="stroke-border" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          style={{ stroke: color }}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-[stroke-dashoffset,stroke] duration-150"
        />
      </svg>
      {showCount && (
        <span
          className="absolute text-[0.625rem] font-semibold tabular-nums"
          style={{ color }}
        >
          {remaining}
        </span>
      )}
    </span>
  );
}

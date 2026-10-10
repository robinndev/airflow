"use client";

import Image from "next/image";
import { Camera, LoaderCircle } from "lucide-react";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { updateProfileImage } from "@/app/(site)/[handle]/actions";
import { downscaleImage } from "@/lib/images/downscale";

type Slot = "avatar" | "banner";

const MAX_DIMENSION: Record<Slot, number> = { banner: 2400, avatar: 512 };

/**
 * Lets the owner pick a new banner/avatar. Shows an instant local preview,
 * then swaps to the server-rendered image once the action revalidates.
 */
export function ImagePickerButton({ handle, slot }: { handle: string; slot: Slot }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setError(null);
    setPreview(objectUrl);

    startTransition(async () => {
      let message: string | null = null;
      try {
        const image = await downscaleImage(file, MAX_DIMENSION[slot]);
        const result = await updateProfileImage(handle, slot, image);
        if (!result.ok) message = result.error;
      } catch (err) {
        message = err instanceof Error ? err.message : "Upload failed. Try again.";
      }
      startTransition(() => {
        setPreview(null);
        setError(message);
      });
      URL.revokeObjectURL(objectUrl);
    });
  }

  const label = slot === "banner" ? "Change cover" : "Change profile picture";

  return (
    <>
      {preview && (
        <Image
          src={preview}
          alt=""
          fill
          unoptimized
          className={`object-cover ${slot === "avatar" ? "rounded-full" : ""} ${pending ? "opacity-90" : ""}`}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleChange}
      />

      {slot === "banner" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-2 rounded-full bg-surface/90 px-3.5 text-sm font-semibold text-ink shadow-soft transition hover:bg-surface disabled:opacity-80 sm:right-[max(1.5rem,calc((100vw-1184px)/2+1.5rem))] sm:bottom-4"
        >
          {pending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <Camera aria-hidden className="size-4" />
          )}
          {pending ? "Uploading…" : label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          aria-label={label}
          title={label}
          className="absolute right-1 bottom-1 grid size-9 place-items-center rounded-full bg-surface text-ink shadow-lift ring-1 ring-border transition hover:bg-ice sm:right-2 sm:bottom-2"
        >
          {pending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <Camera aria-hidden className="size-4" />
          )}
        </button>
      )}

      <p
        role="status"
        aria-live="polite"
        className={
          error
            ? `absolute z-10 rounded-input bg-ink px-3 py-2 text-xs font-medium text-on-ink shadow-lift ${
                slot === "banner" ? "right-3 bottom-15 sm:right-6" : "top-full left-0 mt-2 w-56"
              }`
            : "sr-only"
        }
      >
        {error}
      </p>
    </>
  );
}

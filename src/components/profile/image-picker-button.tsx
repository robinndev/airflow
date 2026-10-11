"use client";

import Image from "next/image";
import { Camera, LoaderCircle } from "lucide-react";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { updateProfileImage } from "@/app/(site)/[handle]/actions";
import { AiImageDialog } from "@/components/uploads/ai-image-dialog";
import { AiImageError } from "@/lib/ai-check/browser";
import { discardArt, prepareImage, uploadArt } from "@/lib/images/prepare";
import { UploadNoticeDialog, type UploadNotice } from "./upload-notice-dialog";

type Slot = "avatar" | "banner";

const MAX_DIMENSION: Record<Slot, number> = { banner: 2400, avatar: 512 };

/**
 * Lets the owner pick a new banner/avatar. Shows an instant local preview,
 * then swaps to the server-rendered image once the action revalidates.
 */
export function ImagePickerButton({
  handle,
  slot,
  allowGif = false,
}: {
  handle: string;
  slot: Slot;
  /** Flow+: animated GIFs are allowed (free accounts get a friendly "Flow+" note instead). */
  allowGif?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notice, setNotice] = useState<UploadNotice | null>(null);
  const [aiRefusal, setAiRefusal] = useState<AiImageError | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    // Free accounts: explain the GIF perk up front, showing their GIF moving, before any upload.
    if (file.type === "image/gif" && !allowGif) {
      setNotice({ kind: "flow-plus", previewUrl: URL.createObjectURL(file) });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setNotice(null);
    setPreview(objectUrl);

    startTransition(async () => {
      let message: string | null = null;
      let refusal: AiImageError | null = null;
      try {
        // Straight to storage from the browser, then the profile points at it.
        const image = await prepareImage(file, MAX_DIMENSION[slot], { allowGif });
        URL.revokeObjectURL(image.previewUrl);
        const path = await uploadArt(image, slot);
        const result = await updateProfileImage(handle, slot, {
          path,
          width: image.width,
          height: image.height,
          palette: image.palette,
        });
        if (!result.ok) {
          message = result.error;
          await discardArt(path);
        }
      } catch (err) {
        if (err instanceof AiImageError) refusal = err;
        else message = err instanceof Error ? err.message : "Upload failed. Try again.";
      }
      startTransition(() => {
        setPreview(null);
        if (message) setNotice({ kind: "error", message });
        if (refusal) setAiRefusal(refusal);
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
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
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

      <UploadNoticeDialog
        notice={notice}
        slot={slot}
        onPickAnother={() => inputRef.current?.click()}
        onClose={() => {
          if (notice?.kind === "flow-plus") URL.revokeObjectURL(notice.previewUrl);
          setNotice(null);
        }}
      />
      <AiImageDialog error={aiRefusal} onClose={() => setAiRefusal(null)} onPickAnother={() => inputRef.current?.click()} />
    </>
  );
}

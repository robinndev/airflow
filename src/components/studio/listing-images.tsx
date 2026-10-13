"use client";

import { ImagePlus, LoaderCircle, Star, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { ListingArt } from "@/components/listings/listing-art";
import { AiImageDialog } from "@/components/uploads/ai-image-dialog";
import { AiImageError } from "@/lib/ai-check/browser";
import { artUrl, type ArtFolder } from "@/lib/art-storage";
import { prepareImage, uploadArt } from "@/lib/images/prepare";
import type { EditableImage } from "@/lib/listings/editable";

/** Listing art keeps its detail: long side up to 2400px, never cropped; GIFs go up as they are. */
const MAX_DIMENSION = 2400;

/**
 * The listing's pictures: add (checked for AI generators, resized, uploaded
 * straight to art/<you>/listings/), remove, and pick the cover. Files that
 * stop being used are removed when the listing is saved.
 */
export function ListingImages({
  value,
  onChange,
  max,
  label,
  coverLabel = "Cover",
  folder = "listings",
}: {
  value: EditableImage[];
  onChange: (images: EditableImage[]) => void;
  max: number;
  label: string;
  coverLabel?: string;
  /** Where in your art folder it goes (finished commissions go to `deliveries`). */
  folder?: ArtFolder;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<AiImageError | null>(null);
  const room = max - value.length - uploading;

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].slice(0, Math.max(0, room));
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading((n) => n + files.length);
    const added: EditableImage[] = [];
    for (const file of files) {
      try {
        const image = await prepareImage(file, MAX_DIMENSION, { allowGif: true, allowPng: true });
        const path = await uploadArt(image, folder);
        URL.revokeObjectURL(image.previewUrl);
        added.push({ src: artUrl(path), path, width: image.width, height: image.height, palette: image.palette });
      } catch (err) {
        if (err instanceof AiImageError) setRefusal(err);
        else setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (added.length) onChange([...value, ...added]);
  }

  return (
    <div>
      <ul aria-label={label} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((image, i) => (
          <li key={image.path} className="group relative aspect-square overflow-hidden rounded-[12px] bg-ice">
            <ListingArt image={image} alt="" sizes="140px" />
            {i === 0 ? (
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-paper/95 px-2 py-0.5 text-[0.6875rem] font-bold text-on-paper shadow-soft">
                <Star aria-hidden className="size-3 fill-star text-star" />
                {coverLabel}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onChange([image, ...value.filter((_, j) => j !== i)])}
                className="absolute bottom-1.5 left-1.5 rounded-full bg-paper/95 px-2 py-0.5 text-[0.6875rem] font-bold text-on-paper opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                Make {coverLabel.toLowerCase()}
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove picture ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-scrim/70 text-white backdrop-blur-sm transition hover:bg-scrim"
            >
              <X aria-hidden className="size-4" />
            </button>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`up-${i}`} className="skeleton grid aspect-square place-items-center rounded-[12px] bg-ice">
            <LoaderCircle aria-label="Uploading" className="size-5 animate-spin text-muted" />
          </li>
        ))}
        {room > 0 && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-border text-sm font-semibold text-muted transition-colors hover:border-ocean/50 hover:bg-ice/50 hover:text-ink"
            >
              <ImagePlus aria-hidden className="size-6" />
              Add
              <span className="text-xs font-normal">{value.length + uploading}/{max}</span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={add}
      />
      <p role="status" aria-live="polite" className="mt-2 text-sm text-danger empty:hidden">
        {error}
      </p>
      <AiImageDialog error={refusal} onClose={() => setRefusal(null)} onPickAnother={() => inputRef.current?.click()} />
    </div>
  );
}

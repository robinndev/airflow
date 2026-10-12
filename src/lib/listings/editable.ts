import { ART_BUCKET } from "@/lib/art-storage";
import type { Adoptable, CommissionService, ImageAsset } from "@/lib/profile/types";
import { PACKAGE_PRESETS, priceFrom, type ServiceCategory, type StyleTag } from "./catalog";
import type { AdoptableInput, ListingImage, ServiceInput } from "./schema";

/*
 * What the studio's editors hold while the artist works: the inputs the
 * Server Actions take (schema.ts), plus each image's URL for previews.
 * Client-safe.
 */

export type EditableImage = ListingImage & { src: string };

export type ServiceDraft = Omit<ServiceInput, "examples" | "category" | "styles"> & {
  category: ServiceCategory;
  styles: StyleTag[];
  examples: EditableImage[];
};

export type AdoptableDraft = Omit<AdoptableInput, "images"> & { images: EditableImage[] };

const MARKER = `/storage/v1/object/public/${ART_BUCKET}/`;

/** The storage path of an uploaded art URL (the editors send paths, not URLs). */
export function artPathOf(src: string) {
  const at = src.indexOf(MARKER);
  return at < 0 ? src : decodeURIComponent(src.slice(at + MARKER.length));
}

export const toEditableImage = (image: ImageAsset): EditableImage => ({
  src: image.src,
  path: artPathOf(image.src),
  width: image.width,
  height: image.height,
  palette: image.palette ?? [],
});

/** A short, readable id for a new package or add-on ("full-color", "full-color-2"). */
export function slugId(label: string, taken: readonly string[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "item";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export const NEW_SERVICE: ServiceDraft = {
  title: "",
  category: "illustration",
  styles: [],
  description: "",
  includes: ["1 character"],
  packages: [{ id: "standard", label: "Standard", priceUsd: 50, includes: [] }],
  turnaround: { min: 7, max: 14 },
  examples: [],
  usage: { personal: { kind: "included" }, commercialContent: null, commercialMerch: null },
  addons: [],
  status: "open",
  slotsTotal: 5,
  whenFull: "waitlist",
};

export const NEW_ADOPTABLE: AdoptableDraft = {
  name: "",
  species: "",
  description: "",
  images: [],
  priceUsd: 40,
  includes: ["Full ref sheet"],
  status: "available",
};

export function serviceDraft(service: CommissionService): ServiceDraft {
  return {
    id: service.id,
    title: service.title,
    category: service.category,
    styles: service.styles ?? [],
    description: service.description,
    includes: service.includes,
    packages: service.packages?.length
      ? service.packages.map((p) => ({ ...p, includes: [...p.includes] }))
      : [{ id: "standard", label: "Standard", priceUsd: service.priceFromUsd, includes: [] }],
    turnaround: { ...service.turnaroundDays },
    examples: service.examples.map(toEditableImage),
    usage: { ...service.usage },
    addons: (service.addons ?? []).map((a) => ({ ...a })),
    status: service.status ?? "open",
    slotsTotal: service.slots?.total ?? null,
    whenFull: service.whenFull ?? "waitlist",
  };
}

export function adoptableDraft(adoptable: Adoptable): AdoptableDraft {
  return {
    id: adoptable.id,
    name: adoptable.name,
    species: adoptable.species,
    description: adoptable.description,
    images: adoptable.images.map(toEditableImage),
    priceUsd: adoptable.priceUsd,
    includes: [...adoptable.includes],
    status: adoptable.status,
  };
}

/** Sketch → lineart → full color, priced as shares of the most expensive package so far. */
export function classicLadder(draft: Pick<ServiceDraft, "packages">): ServiceDraft["packages"] {
  const top = Math.max(priceFrom(draft.packages), ...draft.packages.map((p) => p.priceUsd), 10);
  return PACKAGE_PRESETS.map((preset) => ({
    id: slugId(preset.label, []),
    label: preset.label,
    priceUsd: Math.max(1, Math.round(top * preset.share)),
    includes: [...preset.includes],
  }));
}

/** What the server takes: images without their preview URLs. */
export const serviceInputOf = (draft: ServiceDraft): ServiceInput => ({
  ...draft,
  examples: draft.examples.map(({ path, width, height, palette }) => ({ path, width, height, palette })),
});

export const adoptableInputOf = (draft: AdoptableDraft): AdoptableInput => ({
  ...draft,
  images: draft.images.map(({ path, width, height, palette }) => ({ path, width, height, palette })),
});

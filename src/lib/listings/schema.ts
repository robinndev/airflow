import { z } from "zod";
import { variantFields } from "@/lib/images/schema";
import { LIMITS, SERVICE_CATEGORY_IDS, STYLE_IDS, MAX_STYLES } from "./catalog";

/*
 * What the studio's editors send. Shared by the forms (instant feedback) and
 * the Server Actions (the real check); the database's constraints are the
 * backstop. Client-safe.
 */

const cents = (n: number) => Math.round(n * 100) / 100;

const price = z
  .number({ error: "Add a price." })
  .min(LIMITS.priceUsd.min, `Prices start at $${LIMITS.priceUsd.min}.`)
  .max(LIMITS.priceUsd.max, `Prices go up to $${LIMITS.priceUsd.max.toLocaleString("en-US")}.`)
  .transform(cents);

const shortText = (max: number, what: string) => z.string().trim().min(1, `Name every ${what}.`).max(max, `Keep each ${what} under ${max} characters.`);

const includes = z.array(shortText(60, "included item")).max(LIMITS.includes, `List up to ${LIMITS.includes} things.`);

/** An image the browser already uploaded to art/<user id>/listings/ (src/lib/images/prepare.ts). */
export const listingImage = z.object({
  path: z.string().max(200),
  width: z.number().int().min(1).max(8192),
  height: z.number().int().min(1).max(8192),
  palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(8).optional(),
  ...variantFields,
});
export type ListingImage = z.infer<typeof listingImage>;

export const addonPrice = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("included") }),
  z.object({ kind: z.literal("fixed"), usd: price }),
  z.object({ kind: z.literal("percent"), percent: z.number().int().min(1, "Use at least 1%.").max(500, "Up to +500%.") }),
]);

export const serviceInput = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(3, "Give it a name (3 characters or more).").max(80, "Keep the name under 80 characters."),
    category: z.enum(SERVICE_CATEGORY_IDS as [string, ...string[]], { error: "Pick a category." }),
    styles: z.array(z.enum(STYLE_IDS as [string, ...string[]])).max(MAX_STYLES, `Pick up to ${MAX_STYLES} styles.`),
    description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
    includes,
    packages: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]{1,40}$/),
          label: shortText(40, "package"),
          priceUsd: price,
          includes,
        }),
      )
      .min(1, "Add at least one package with a price.")
      .max(LIMITS.packages, `Up to ${LIMITS.packages} packages.`),
    turnaround: z
      .object({
        min: z.number().int().min(LIMITS.turnaroundDays.min).max(LIMITS.turnaroundDays.max),
        max: z.number().int().min(LIMITS.turnaroundDays.min).max(LIMITS.turnaroundDays.max, "Turnaround is up to a year."),
      })
      .refine((t) => t.min <= t.max, "The shortest turnaround can't be longer than the longest."),
    examples: z.array(listingImage).max(LIMITS.examples, `Up to ${LIMITS.examples} examples.`),
    usage: z.object({
      personal: addonPrice.nullable(),
      commercialContent: addonPrice.nullable(),
      commercialMerch: addonPrice.nullable(),
    }),
    addons: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]{1,40}$/),
          label: shortText(40, "add-on"),
          hint: z.string().trim().max(80).optional(),
          price: addonPrice,
        }),
      )
      .max(LIMITS.addons, `Up to ${LIMITS.addons} add-ons.`),
    status: z.enum(["open", "waitlist", "closed"]),
    slotsTotal: z.number().int().min(1, "At least 1 slot.").max(LIMITS.slots, `Up to ${LIMITS.slots} slots.`).nullable(),
    whenFull: z.enum(["waitlist", "closed"]),
  })
  .refine((s) => new Set(s.packages.map((p) => p.id)).size === s.packages.length, "Two packages share an id.")
  .refine((s) => s.examples.length > 0, { message: "Add at least one example of your work.", path: ["examples"] });

export type ServiceInput = z.input<typeof serviceInput>;

export const adoptableInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Name your character.").max(60, "Keep the name under 60 characters."),
  species: z.string().trim().max(60, "Keep the species under 60 characters."),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
  images: z
    .array(listingImage)
    .min(1, "Add a picture of the character.")
    .max(LIMITS.adoptImages, `Up to ${LIMITS.adoptImages} pictures.`),
  priceUsd: price,
  includes,
  status: z.enum(["available", "reserved", "sold"]),
});

export type AdoptableInput = z.input<typeof adoptableInput>;

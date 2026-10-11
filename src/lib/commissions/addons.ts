import type { AddonPrice, CommissionService, UsageRights } from "@/lib/profile/types";

/*
 * What a buyer can tick on a commission, right under its price: the licenses
 * (personal, commercial content, merchandising) and the artist's add-ons
 * ("+$10 shading"). Each one is included (ticked and locked), sold on top for
 * a fixed amount or a share of the "from" price, or, for licenses, not
 * offered. The artist's proposal still sets the final price. Client-safe.
 */

export type Option = {
  id: string;
  label: string;
  hint?: string;
  /** Null: a license this service doesn't offer. */
  price: AddonPrice | null;
  group: "license" | "addon";
};

export const LICENSES: { key: keyof UsageRights; label: string; hint: string }[] = [
  { key: "personal", label: "Personal", hint: "Profile pictures, gifts, your own non-monetized posts." },
  { key: "commercialContent", label: "Commercial: Content", hint: "Monetized videos, streams, book covers and ads." },
  { key: "commercialMerch", label: "Commercial: Merchandising", hint: "Prints, stickers, apparel and other products for sale." },
];

export const licenseId = (key: keyof UsageRights) => `license:${key}`;

/** Licenses first, then add-ons, in the artist's order. */
export function serviceOptions(service: Pick<CommissionService, "usage" | "addons">): Option[] {
  return [
    ...LICENSES.map(({ key, label, hint }) => ({
      id: licenseId(key),
      label,
      hint,
      price: service.usage[key],
      group: "license" as const,
    })),
    ...(service.addons ?? []).map((addon) => ({ ...addon, group: "addon" as const })),
  ];
}

/** Whether the buyer can tick it: offered, and not already in the price. */
export const isOptional = (option: Option) => option.price !== null && option.price.kind !== "included";

/** What an option adds in dollars, on top of the "from" price (cents kept, so totals add up). */
export function optionUsd(price: AddonPrice | null, base: number) {
  if (!price || price.kind === "included") return 0;
  if (price.kind === "fixed") return price.usd;
  return Math.round(base * price.percent) / 100;
}

/** What the buyer ticked, in the artist's order. Included, unoffered and unknown ids are dropped. */
export function pickOptions(options: Option[], ids: Iterable<string>): Option[] {
  const wanted = new Set(ids);
  return options.filter((option) => wanted.has(option.id) && isOptional(option));
}

/** The extras on top of the "from" price. */
export const extrasUsd = (picked: Option[], base: number) => picked.reduce((sum, option) => sum + optionUsd(option.price, base), 0);

/**
 * Personal or commercial, from the licenses the buyer ends up holding
 * (included ones plus the ones they ticked).
 */
export function usageOf(usage: UsageRights, pickedIds: Iterable<string>): "personal" | "commercial" {
  const picked = new Set(pickedIds);
  const holds = (key: keyof UsageRights) => usage[key]?.kind === "included" || (usage[key] !== null && picked.has(licenseId(key)));
  return holds("commercialContent") || holds("commercialMerch") ? "commercial" : "personal";
}

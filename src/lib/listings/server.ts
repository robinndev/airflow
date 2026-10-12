import "server-only";
import { toImageAsset, type StoredImage } from "@/lib/art-storage";
import { ACCOUNT_COLUMNS, configured, toArtistProfile, type AccountRow } from "@/lib/profile/accounts";
import type { Adoptable, AddonPrice, ArtistProfile, CommissionService, ServiceAddon, ServicePackage, UsageRights } from "@/lib/profile/types";
import { createSupabasePublic } from "@/lib/supabase/server";
import { cleanStyles, isServiceCategory, sortPackages, turnaroundLabel, type AdoptStatus } from "./catalog";

/*
 * Real listings (Supabase `services`, `adoptables`) as the app's types.
 * Public reads with the cookie-less client: callers cache them ("use cache")
 * and the studio's Server Actions invalidate the tags. A database that hasn't
 * had the listings migration yet reads as "no listings" instead of failing.
 */

export type ServiceRow = {
  id: string;
  owner_id: string;
  title: string;
  category: string;
  styles: string[];
  description: string;
  includes: string[];
  packages: ServicePackage[];
  price_from_usd: number | string;
  turnaround_min_days: number;
  turnaround_max_days: number;
  examples: StoredImage[];
  usage: Partial<UsageRights> | null;
  addons: ServiceAddon[];
  status: "open" | "waitlist" | "closed";
  slots_total: number | null;
  slots_taken: number;
  when_full: "waitlist" | "closed";
  paused_status: "open" | "waitlist" | "closed" | null;
  position: number;
  created_at: string;
};

export type AdoptableRow = {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  description: string;
  images: StoredImage[];
  price_usd: number | string;
  includes: string[];
  status: AdoptStatus;
  sold_at: string | null;
  position: number;
  created_at: string;
};

type WithOwner<T> = T & { owner: AccountRow & { draws?: string[] } };

export const SERVICE_COLUMNS =
  "id, owner_id, title, category, styles, description, includes, packages, price_from_usd, turnaround_min_days, turnaround_max_days, examples, usage, addons, status, slots_total, slots_taken, when_full, paused_status, position, created_at";
export const ADOPTABLE_COLUMNS =
  "id, owner_id, name, species, description, images, price_usd, includes, status, sold_at, position, created_at";
const OWNER = `owner:profiles!inner(${ACCOUNT_COLUMNS}, draws)`;

/** PostgREST / Postgres codes for "that table doesn't exist here yet". */
const NOT_MIGRATED = new Set(["42P01", "PGRST205"]);

const isAddonPrice = (value: unknown): value is AddonPrice => {
  const v = value as AddonPrice | null;
  return (
    !!v &&
    (v.kind === "included" ||
      (v.kind === "fixed" && typeof v.usd === "number") ||
      (v.kind === "percent" && typeof v.percent === "number"))
  );
};

const license = (value: unknown) => (isAddonPrice(value) ? value : null);

export function toService(row: ServiceRow, ownerHandle: string): CommissionService {
  const packages = sortPackages(
    (Array.isArray(row.packages) ? row.packages : []).map((p) => ({
      id: String(p.id),
      label: String(p.label),
      priceUsd: Number(p.priceUsd),
      includes: Array.isArray(p.includes) ? p.includes.map(String) : [],
    })),
  );
  const days = { min: row.turnaround_min_days, max: row.turnaround_max_days };
  return {
    id: row.id,
    ownerHandle,
    category: isServiceCategory(row.category) ? row.category : "other",
    styles: cleanStyles(row.styles ?? []),
    title: row.title,
    description: row.description,
    usage: {
      personal: license(row.usage?.personal),
      commercialContent: license(row.usage?.commercialContent),
      commercialMerch: license(row.usage?.commercialMerch),
    },
    priceFromUsd: Number(row.price_from_usd),
    turnaround: turnaroundLabel(days),
    turnaroundDays: days,
    includes: row.includes ?? [],
    examples: (row.examples ?? []).map((image, i) => toImageAsset(image, `${row.title}, example ${i + 1}`)),
    addons: (Array.isArray(row.addons) ? row.addons : []).filter((a) => a?.id && a.label && isAddonPrice(a.price)),
    // One package is just the price: no picker.
    packages: packages.length > 1 ? packages : undefined,
    status: row.status,
    slots: row.slots_total ? { total: row.slots_total, taken: row.slots_taken } : null,
    whenFull: row.when_full,
    ...(row.paused_status && { paused: true }),
    createdAt: row.created_at,
  };
}

export function toAdoptable(row: AdoptableRow, ownerHandle: string): Adoptable {
  return {
    id: row.id,
    ownerHandle,
    name: row.name,
    species: row.species,
    description: row.description,
    images: (row.images ?? []).map((image, i) => toImageAsset(image, i === 0 ? row.name : `${row.name}, ${i + 1}`)),
    priceUsd: Number(row.price_usd),
    includes: row.includes ?? [],
    status: row.status,
    createdAt: row.created_at,
    ...(row.sold_at && { soldAt: row.sold_at }),
  };
}

/** A real account's services, in the artist's order. */
export async function fetchServicesByHandle(handle: string): Promise<CommissionService[]> {
  if (!configured()) return [];
  const { data, error } = await createSupabasePublic()
    .from("services")
    .select(`${SERVICE_COLUMNS}, ${OWNER}`)
    .eq("owner.handle", handle)
    .order("position")
    .returns<WithOwner<ServiceRow>[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load @${handle}'s services: ${error.message}`);
  return data.map((row) => toService(row, handle));
}

/** A real account's adoptables, in the artist's order. */
export async function fetchAdoptablesByHandle(handle: string): Promise<Adoptable[]> {
  if (!configured()) return [];
  const { data, error } = await createSupabasePublic()
    .from("adoptables")
    .select(`${ADOPTABLE_COLUMNS}, ${OWNER}`)
    .eq("owner.handle", handle)
    .order("position")
    .returns<WithOwner<AdoptableRow>[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load @${handle}'s adoptables: ${error.message}`);
  return data.map((row) => toAdoptable(row, handle));
}

export type Listed<T> = { listing: T; owner: ArtistProfile };

/** Every real service, newest first, with its artist (discovery: search, Explore). */
export async function fetchAllServices(limit = 500): Promise<Listed<CommissionService>[]> {
  if (!configured()) return [];
  const { data, error } = await createSupabasePublic()
    .from("services")
    .select(`${SERVICE_COLUMNS}, ${OWNER}`)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<WithOwner<ServiceRow>[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load services: ${error.message}`);
  return data.map((row) => ({ listing: toService(row, row.owner.handle), owner: toArtistProfile(row.owner) }));
}

/** Every real adoptable, newest first, with its artist. */
export async function fetchAllAdoptables(limit = 500): Promise<Listed<Adoptable>[]> {
  if (!configured()) return [];
  const { data, error } = await createSupabasePublic()
    .from("adoptables")
    .select(`${ADOPTABLE_COLUMNS}, ${OWNER}`)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<WithOwner<AdoptableRow>[]>();
  if (error && NOT_MIGRATED.has(error.code)) return [];
  if (error) throw new Error(`Couldn't load adoptables: ${error.message}`);
  return data.map((row) => ({ listing: toAdoptable(row, row.owner.handle), owner: toArtistProfile(row.owner) }));
}

/** Real accounts for artist search, newest first. */
export async function fetchArtistAccounts(limit = 1000): Promise<ArtistProfile[]> {
  if (!configured()) return [];
  const { data, error } = await createSupabasePublic()
    .from("profiles")
    .select(`${ACCOUNT_COLUMNS}, headline, draws`)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AccountRow[]>();
  if (error?.code === "42703") return [];
  if (error) throw new Error(`Couldn't load artists: ${error.message}`);
  return data.map(toArtistProfile);
}

import { cacheLife, cacheTag } from "next/cache";
import { MOODS, moodsOf, type MoodSlug } from "./palette";
import { demoImages as art, demoPool, type PoolTheme } from "./profile/demo-images";
import type { DrawTag } from "./profile/draws";
import { db } from "./profile/mock-db";
import type { ImageAsset } from "./profile/types";

/*
 * Explore data. Real artists, services and adoptables come from the mock DB;
 * the wider community is generated deterministically from the demo image
 * pool so the page reads like a busy marketplace. Replace with
 * search-backed queries later — the shapes below are what the UI needs.
 */

export type ArtistRef = {
  handle: string;
  name: string;
  avatar: ImageAsset;
  href: string;
  verified?: boolean;
  isPro?: boolean;
};

export type StickerShape = "circle" | "scallop" | "arch" | "squircle" | "blob" | "burst" | "cloud";

export type Category = {
  slug: string;
  label: string;
  /** Artists offering it. */
  count: number;
  cover: ImageAsset;
  shape: StickerShape;
};

export type HeroPiece = { id: string; title: string; image: ImageAsset; artist: ArtistRef; href: string };

export type StudioStatus = "open" | "soon" | "closing";

/** An artist's commission sheet: three price tiers, slots and terms at a glance. */
export type Studio = {
  id: string;
  artist: ArtistRef;
  specialty: string;
  /** What the artist draws (their profile's `draws`); Explore filters studios by it. */
  draws: DrawTag[];
  tiers: { label: string; priceUsd: number; originalUsd?: number; image: ImageAsset }[];
  slots: { total: number; taken: number };
  turnaround: string;
  rating: { average: number; count: number };
  status: StudioStatus;
  /** ISO time slots open (status "soon"). */
  opensAt?: string;
  discountPercent?: number;
  href: string;
};

export type AdoptSale =
  | { type: "flat"; priceUsd: number }
  | { type: "auction"; bidUsd: number; endsAt: string }
  | { type: "offer" };

export type Adopt = {
  id: string;
  name: string;
  species: string;
  image: ImageAsset;
  artist: ArtistRef;
  sale: AdoptSale;
  status: "available" | "reserved" | "adopted";
  href: string;
};

export type Drop = {
  title: string;
  count: number;
  artist: ArtistRef;
  at: string;
  previews: ImageAsset[];
  href: string;
};

export type Resident = {
  artist: ArtistRef & { headline: string; location?: string };
  quote: string;
  followers: number;
  artworks: number;
  rating: { average: number; count: number };
  slots: { total: number; taken: number };
  menu: { title: string; priceUsd: number; discountPercent?: number; href: string }[];
  works: { title: string; image: ImageAsset; href: string }[];
  href: string;
};

export type WallPiece = {
  id: string;
  title: string;
  image: ImageAsset;
  artist: ArtistRef;
  href: string;
  moods: MoodSlug[];
  likes: number;
  postedAt: string;
  /** Lowest price when the artist is taking commissions right now. */
  commissionFromUsd?: number;
  adopt?: { priceUsd?: number; status: Adopt["status"] };
};

export const TAGS = [
  "oc", "adoptables", "fantasy", "chibi", "backgrounds", "furry", "fursona", "ych",
  "anime", "portrait", "cozy", "mermaid", "kemonomimi", "pixel art", "watercolor", "wolf", "fox",
];

export const POPULAR_SEARCHES = ["fursona headshot", "ref sheet", "pastel chibi", "pixel icon", "mermaid"];

/** Mock marketplace pulse until analytics exist. */
export const PULSE = { openStudios: 2184, openedToday: 214, adoptsThisWeek: 1306 };

const asset = ({ src, alt, width, height, focus, palette }: ImageAsset): ImageAsset => ({
  src, alt, width, height, focus, palette,
});

const poolId = (image: ImageAsset) => image.src.split("/").pop()!.split(".")[0];
const byId = new Map(demoPool.map((image) => [poolId(image), image]));
const pool = (id: string) => asset(byId.get(id)!);

/** Stable pseudo-random number in [0, 1) per key, so every render agrees. */
function noise(key: string) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

/* ------------------------------------------------------------------ artists */

type PoolArtist = {
  handle: string;
  name: string;
  theme: PoolTheme;
  avatarId: string;
  verified?: boolean;
  isPro?: boolean;
};

const POOL_ARTISTS: PoolArtist[] = [
  { handle: "bramblefox", name: "Bramble", theme: "furry", avatarId: "12088040", verified: true, isPro: true },
  { handle: "wolfiesketch", name: "Wolfie", theme: "furry", avatarId: "11794256" },
  { handle: "selenetide", name: "Selene", theme: "creature", avatarId: "12048327", verified: true },
  { handle: "akemidraws", name: "Akemi", theme: "kemonomimi", avatarId: "12322633", isPro: true },
  { handle: "kikochibi", name: "Kiko", theme: "chibi", avatarId: "12338874", isPro: true },
  { handle: "junopaints", name: "Juno Park", theme: "scenery", avatarId: "12274809", verified: true },
  { handle: "pixiebit", name: "Pixie Bit", theme: "pixel", avatarId: "12160940" },
  { handle: "marigold.ink", name: "Marigold", theme: "traditional", avatarId: "12335203", verified: true },
];

function poolArtist(handle: string): ArtistRef {
  const a = POOL_ARTISTS.find((p) => p.handle === handle)!;
  return {
    handle: a.handle,
    name: a.name,
    avatar: { ...pool(a.avatarId), alt: a.name, focus: "50% 22%" },
    href: `/explore/search?q=${encodeURIComponent(`@${a.handle}`)}`,
    verified: a.verified,
    isPro: a.isPro,
  };
}

function realArtist(handle: string): ArtistRef {
  const p = db.profiles.find((profile) => profile.handle === handle)!;
  return {
    handle: p.handle,
    name: p.displayName,
    avatar: p.avatar,
    href: `/${p.handle}`,
    verified: true,
    isPro: p.plan === "pro",
  };
}

/** Pool images keyed by owner; the two furry artists split their theme. */
function ownerOf(image: (typeof demoPool)[number]): string {
  const sameTheme = demoPool.filter((p) => p.theme === image.theme);
  const owners = POOL_ARTISTS.filter((a) => a.theme === image.theme);
  return owners[sameTheme.indexOf(image) % owners.length].handle;
}

/* --------------------------------------------------------------- categories */

export const CATEGORIES: Category[] = [
  { slug: "illustration", label: "Illustration", count: 4210, cover: asset(art.sunsetReflection), shape: "arch" },
  { slug: "character-design", label: "Character design", count: 2860, cover: pool("12307987"), shape: "scallop" },
  { slug: "adoptables", label: "Adoptables", count: 1940, cover: asset(art.bunnyAdopt), shape: "cloud" },
  { slug: "icons", label: "Icons & avatars", count: 3320, cover: pool("12322633"), shape: "circle" },
  { slug: "ref-sheets", label: "Ref sheets", count: 1210, cover: pool("12069081"), shape: "squircle" },
  { slug: "chibi", label: "Chibi", count: 1580, cover: pool("12338874"), shape: "burst" },
  { slug: "furry", label: "Furry", count: 1650, cover: pool("12088040"), shape: "blob" },
  { slug: "backgrounds", label: "Backgrounds", count: 740, cover: pool("12274809"), shape: "arch" },
  { slug: "emotes", label: "Emotes & badges", count: 980, cover: pool("12338155"), shape: "scallop" },
  { slug: "pixel-art", label: "Pixel art", count: 610, cover: pool("12160940"), shape: "squircle" },
  { slug: "comics", label: "Comics", count: 420, cover: pool("12121283"), shape: "circle" },
];

/* ------------------------------------------------------------------ studios */

const TIERS: Record<PoolTheme, { specialty: string; tiers: [string, number][] }> = {
  furry: { specialty: "Fursonas & ferals", tiers: [["Headshot", 55], ["Half-body", 90], ["Full-body", 140]] },
  creature: { specialty: "Mermaids & creatures", tiers: [["Bust", 90], ["Full design", 150], ["Ref sheet", 220]] },
  kemonomimi: { specialty: "Kemonomimi & anime OCs", tiers: [["Bust", 70], ["Half-body", 110], ["Full scene", 180]] },
  chibi: { specialty: "Chibis & sticker packs", tiers: [["Single", 25], ["Couple", 45], ["Sticker pack", 60]] },
  scenery: { specialty: "Painted backgrounds", tiers: [["Simple BG", 120], ["Scene", 200], ["Key art", 320]] },
  pixel: { specialty: "Pixel icons & sprites", tiers: [["Icon", 20], ["Animated", 45], ["Sprite sheet", 90]] },
  traditional: { specialty: "Watercolor & markers", tiers: [["Sketch", 40], ["Watercolor", 65], ["Original", 140]] },
};

const DRAWS: Record<PoolTheme, DrawTag[]> = {
  furry: ["anthro", "feral", "ref_sheet"],
  creature: ["humanoid", "feral", "oc_design"],
  kemonomimi: ["human", "humanoid", "oc_design"],
  chibi: ["human", "anthro", "pony", "chibi", "emote"],
  scenery: ["background", "concept"],
  pixel: ["human", "anthro", "feral", "pony", "pixel", "emote", "animation"],
  traditional: ["human", "feral"],
};

const STUDIO_PLAN: {
  handle: string;
  status: StudioStatus;
  slots: [number, number];
  turnaround: string;
  /** Hours from now until slots open (status "soon"). */
  opensInHours?: number;
  discountPercent?: number;
  images: string[];
}[] = [
  { handle: "bramblefox", status: "open", slots: [5, 2], turnaround: "1–2 weeks", images: ["12088040", "11766852", "11755983"] },
  { handle: "junopaints", status: "open", slots: [4, 1], turnaround: "2–3 weeks", discountPercent: 15, images: ["12249218", "12208176", "12274809"] },
  { handle: "akemidraws", status: "open", slots: [6, 4], turnaround: "10 days", images: ["12322633", "12316668", "12289595"] },
  { handle: "kikochibi", status: "soon", slots: [10, 0], turnaround: "1 week", opensInHours: 2.25, images: ["12338874", "12333389", "12338155"] },
  { handle: "pixiebit", status: "soon", slots: [8, 0], turnaround: "5 days", opensInHours: 26, images: ["12160940", "12057737", "12158656"] },
  { handle: "wolfiesketch", status: "soon", slots: [4, 0], turnaround: "2 weeks", opensInHours: 75, images: ["11794256", "12241758", "12121283"] },
  { handle: "selenetide", status: "closing", slots: [4, 3], turnaround: "3 weeks", images: ["12048327", "12326145", "12113056"] },
  { handle: "marigold.ink", status: "closing", slots: [3, 2], turnaround: "2 weeks", images: ["12327459", "12300153", "12337305"] },
];

function poolStudio(plan: (typeof STUDIO_PLAN)[number], now: number): Studio {
  const artist = POOL_ARTISTS.find((a) => a.handle === plan.handle)!;
  const { specialty, tiers } = TIERS[artist.theme];
  const r = noise(plan.handle);
  return {
    id: `studio-${plan.handle}`,
    artist: poolArtist(plan.handle),
    specialty,
    draws: DRAWS[artist.theme],
    tiers: tiers.map(([label, price], i) => ({
      label,
      priceUsd: plan.discountPercent ? Math.round(price * (1 - plan.discountPercent / 100)) : price,
      originalUsd: plan.discountPercent ? price : undefined,
      image: pool(plan.images[i]),
    })),
    slots: { total: plan.slots[0], taken: plan.slots[1] },
    turnaround: plan.turnaround,
    rating: { average: r > 0.7 ? 4.8 : r > 0.35 ? 4.9 : 5, count: 18 + Math.round(r * 160) },
    status: plan.status,
    opensAt: plan.opensInHours ? new Date(now + plan.opensInHours * 3_600_000).toISOString() : undefined,
    discountPercent: plan.discountPercent,
    href: poolArtist(plan.handle).href,
  };
}

const MIRA_TIERS: Record<string, string> = {
  svc_headshot: "Headshot",
  svc_halfbody: "Half-body",
  svc_full: "Full scene",
};

/** Mira's sheet comes straight from her real services. */
function miraStudio(): Studio | null {
  const profile = db.profiles.find((p) => p.handle === "mira");
  if (!profile) return null;
  const services = db.services
    .filter((s) => s.id in MIRA_TIERS)
    .toSorted((a, b) => a.priceFromUsd - b.priceFromUsd);
  const { slotsTotal, slotsTaken, turnaround, rating } = profile.commissions;
  return {
    id: "studio-mira",
    artist: realArtist("mira"),
    specialty: "Painted skies & quiet cities",
    draws: profile.draws,
    tiers: services.map((s) => ({
      label: MIRA_TIERS[s.id],
      priceUsd: s.discountPercent ? Math.round(s.priceFromUsd * (1 - s.discountPercent / 100)) : s.priceFromUsd,
      originalUsd: s.discountPercent ? s.priceFromUsd : undefined,
      image: asset(s.examples[0]),
    })),
    slots: { total: slotsTotal, taken: slotsTaken },
    turnaround,
    rating: rating ?? { average: 5, count: 0 },
    status: "open",
    discountPercent: services.find((s) => s.discountPercent)?.discountPercent,
    href: "/mira/commissions",
  };
}

/* ------------------------------------------------------------------- adopts */

function adopts(now: number): Adopt[] {
  const kai = realArtist("kai");
  const fromDb = (id: string, name: string, species: string): Adopt | null => {
    const artwork = db.artworks.find((a) => a.id === id);
    if (!artwork?.adopt) return null;
    return {
      id,
      name,
      species,
      image: asset(artwork.image),
      artist: kai,
      sale: { type: "flat", priceUsd: artwork.adopt.priceUsd },
      status: artwork.adopt.status === "sold" ? "adopted" : "available",
      href: "/kai/gallery",
    };
  };

  const generated: Adopt[] = [
    {
      id: "adopt-yuki",
      name: "Yuki",
      species: "Snow fox",
      image: pool("12280555"),
      artist: poolArtist("akemidraws"),
      sale: { type: "flat", priceUsd: 120 },
      status: "available",
      href: "/explore/adoptables",
    },
    {
      id: "adopt-cloud",
      name: "Cloud",
      species: "Fluff wolf",
      image: pool("12241758"),
      artist: poolArtist("wolfiesketch"),
      sale: { type: "auction", bidUsd: 64, endsAt: new Date(now + 5.5 * 3_600_000).toISOString() },
      status: "available",
      href: "/explore/adoptables",
    },
    {
      id: "adopt-marina",
      name: "Marina",
      species: "Sea spirit",
      image: pool("12048327"),
      artist: poolArtist("selenetide"),
      sale: { type: "offer" },
      status: "available",
      href: "/explore/adoptables",
    },
    {
      id: "adopt-pepperoni",
      name: "Pepperoni",
      species: "Pizza cat",
      image: pool("12338155"),
      artist: poolArtist("kikochibi"),
      sale: { type: "flat", priceUsd: 22 },
      status: "reserved",
      href: "/explore/adoptables",
    },
  ];

  return [
    fromDb("art_11", "Pip", "Bunny mechanic"),
    generated[0],
    generated[1],
    fromDb("art_13", "Rosie", "Braided bunny"),
    generated[2],
    generated[3],
  ].filter((a): a is Adopt => a !== null);
}

/* --------------------------------------------------------------------- wall */

const POOL_TITLES: Record<string, string> = {
  "11805058": "Crow keeper", "12241758": "Cloud & her fluff", "11766852": "Big wolf, red ribbon",
  "11794256": "Night shift", "12088040": "Ember the fox", "12069081": "Wolf expressions",
  "11755983": "Forest patrol", "12121283": "Snowfield skirmish", "12048327": "Marina, sea spirit",
  "12253474": "Low tide", "12113056": "Wren the oracle", "12326145": "Mermaid ballet",
  "12230135": "Wave caller", "12296405": "Twin tides", "12200552": "Coral dive",
  "12325806": "Lily guardian", "12307987": "Autumn coat", "12322633": "Rose, after class",
  "12343900": "Bamboo grove", "12316668": "Cotton candy day", "12280555": "Yuki, snow fox",
  "12289595": "Kitsune nap", "12338155": "Pizza cat", "12341813": "Mouse café",
  "12338874": "Mocha wink", "12333389": "Stargazing crew", "12339713": "Spiky kitty",
  "12274809": "Harbor balcony", "12208176": "Last train home", "12253295": "Rooftop witch",
  "12220505": "Frog-hat forest", "12292914": "Sky lancer", "12282740": "Broomstick sunset",
  "12249218": "Shrine gate", "12297248": "Red in the snow", "12178737": "Hooded traveler",
  "12158656": "Pocket island", "12057737": "Strawberry idol", "12287050": "Seaside dusk",
  "12231063": "Sailor smile", "12160940": "Ice fairy", "12300153": "Moss & ribbons",
  "12327459": "Blue watercolor", "12335203": "Umbrella day", "12337305": "Best friends",
};

function wall(studios: Studio[], adoptList: Adopt[]): WallPiece[] {
  const openFrom = new Map(
    studios
      .filter((s) => s.status !== "soon")
      .map((s) => [s.artist.handle, Math.min(...s.tiers.map((t) => t.priceUsd))]),
  );
  const adoptBySrc = new Map(adoptList.map((a) => [a.image.src, a]));
  const day = (offset: number) => new Date(Date.UTC(2026, 9, 10) - offset * 86_400_000).toISOString().slice(0, 10);

  const pieceOf = (image: ImageAsset, title: string, artist: ArtistRef, id: string, href: string): WallPiece => {
    const r = noise(id);
    const adopt = adoptBySrc.get(image.src);
    return {
      id,
      title,
      image,
      artist,
      href: adopt?.href ?? href,
      moods: moodsOf(image.palette),
      likes: Math.round(120 + r * r * 4200),
      postedAt: day(Math.floor(noise(`${id}:age`) * 30)),
      commissionFromUsd: openFrom.get(artist.handle),
      adopt: adopt && {
        priceUsd: adopt.sale.type === "flat" ? adopt.sale.priceUsd : undefined,
        status: adopt.status,
      },
    };
  };

  const real = db.artworks.map((a) =>
    pieceOf(asset(a.image), a.title, realArtist(a.ownerHandle), a.id, `/${a.ownerHandle}/gallery`),
  );
  const generated = demoPool.map((image) => {
    const owner = ownerOf(image);
    const id = poolId(image);
    return pieceOf(asset(image), POOL_TITLES[id] ?? "Untitled", poolArtist(owner), `pool-${id}`, poolArtist(owner).href);
  });

  // "For you": interleave so real artists and the wider community mix.
  return generated.flatMap((piece, i) => (real[i] ? [piece, real[i]] : [piece]));
}

/* ---------------------------------------------------------------- resident */

function resident(): Resident | null {
  const p = db.profiles.find((profile) => profile.handle === "mira");
  if (!p) return null;
  // Main piece (landscape), a tall companion and a small print, in that order.
  const works = ["art_5", "art_3", "art_7"].flatMap((id) => {
    const a = db.artworks.find((artwork) => artwork.id === id);
    return a ? [{ title: a.title, image: asset(a.image), href: "/mira/gallery" }] : [];
  });
  return {
    artist: { ...realArtist("mira"), headline: p.headline, location: p.location },
    quote: "I paint big skies, quiet cities and the characters who wander through them.",
    followers: p.stats.followers,
    artworks: p.stats.artworks,
    rating: p.commissions.rating ?? { average: 5, count: 0 },
    slots: { total: p.commissions.slotsTotal, taken: p.commissions.slotsTaken },
    menu: db.services
      .filter((s) => s.ownerHandle === "mira")
      .toSorted((a, b) => a.priceFromUsd - b.priceFromUsd)
      .map((s) => ({
        title: s.title,
        priceUsd: s.priceFromUsd,
        discountPercent: s.discountPercent,
        href: `/mira/commissions#${s.id}`,
      })),
    works,
    href: "/mira",
  };
}

/* -------------------------------------------------------------------- reads */

export type ExploreData = {
  hero: HeroPiece[];
  studios: Studio[];
  resident: Resident | null;
  adopts: Adopt[];
  drop: Drop;
  wall: WallPiece[];
  moodCounts: Record<MoodSlug, number>;
  /** Faces for the "made by humans" note. */
  crowd: ArtistRef[];
};

export async function getExploreData(): Promise<ExploreData> {
  "use cache";
  cacheLife("minutes");
  cacheTag("explore");

  // Countdowns are anchored to the top of the hour so cached copies stay believable.
  const now = Math.floor(Date.now() / 3_600_000) * 3_600_000;

  const mira = miraStudio();
  const studios = [...(mira ? [mira] : []), ...STUDIO_PLAN.map((plan) => poolStudio(plan, now))];
  const adoptList = adopts(now);
  const pieces = wall(studios, adoptList);

  const heroPiece = (id: string, title: string, owner: string): HeroPiece => ({
    id: `hero-${id}`,
    title,
    image: pool(id),
    artist: poolArtist(owner),
    href: poolArtist(owner).href,
  });
  // The second piece carries the "slots open" note in the collage.
  const hero: HeroPiece[] = [
    heroPiece("12230135", "Wave caller", "selenetide"),
    { id: "hero-golden-hour", title: "Golden Hour", image: asset(art.sunsetReflection), artist: realArtist("mira"), href: "/mira" },
    heroPiece("12088040", "Ember the fox", "bramblefox"),
    heroPiece("12338874", "Mocha wink", "kikochibi"),
    heroPiece("12160940", "Ice fairy", "pixiebit"),
  ];

  const moodCounts = Object.fromEntries(
    MOODS.map((m) => [m.slug, pieces.filter((p) => p.moods.includes(m.slug)).length]),
  ) as Record<MoodSlug, number>;

  return {
    hero,
    studios,
    resident: resident(),
    adopts: adoptList,
    drop: {
      title: "Moonlight bakery",
      count: 6,
      artist: poolArtist("kikochibi"),
      at: new Date(now + 3 * 3_600_000).toISOString(),
      previews: [pool("12341813"), pool("12333389"), pool("12339713")],
      href: "/explore/adoptables",
    },
    wall: pieces,
    moodCounts,
    crowd: [
      realArtist("mira"),
      poolArtist("bramblefox"),
      poolArtist("kikochibi"),
      realArtist("kai"),
      poolArtist("selenetide"),
      poolArtist("akemidraws"),
    ],
  };
}

/** Compact search entries — shipped to the client for instant autocomplete. */
export type SearchIndex = {
  categories: { slug: string; label: string }[];
  artists: { handle: string; displayName: string; headline: string; avatar: ImageAsset; isPro: boolean; href: string }[];
  services: { id: string; title: string; ownerHandle: string; priceFromUsd: number; cover?: ImageAsset; href: string }[];
  tags: string[];
};

export async function getSearchIndex(): Promise<SearchIndex> {
  "use cache";
  cacheLife("hours");
  cacheTag("search-index");

  const strip = ({ src, alt, width, height, focus }: ImageAsset): ImageAsset => ({ src, alt, width, height, focus });

  return {
    categories: CATEGORIES.map(({ slug, label }) => ({ slug, label })),
    artists: [
      ...db.profiles.map((p) => ({
        handle: p.handle,
        displayName: p.displayName,
        headline: p.headline,
        avatar: strip(p.avatar),
        isPro: p.plan === "pro",
        href: `/${p.handle}`,
      })),
      ...POOL_ARTISTS.map((a) => {
        const ref = poolArtist(a.handle);
        return {
          handle: a.handle,
          displayName: a.name,
          headline: TIERS[a.theme].specialty,
          avatar: strip(ref.avatar),
          isPro: Boolean(a.isPro),
          href: ref.href,
        };
      }),
    ],
    services: [
      ...db.services.map((s) => ({
        id: s.id,
        title: s.title,
        ownerHandle: s.ownerHandle,
        priceFromUsd: s.priceFromUsd,
        cover: s.examples[0] && strip(s.examples[0]),
        href: `/${s.ownerHandle}/commissions#${s.id}`,
      })),
      ...STUDIO_PLAN.flatMap((plan) => {
        const artist = POOL_ARTISTS.find((a) => a.handle === plan.handle)!;
        return TIERS[artist.theme].tiers.map(([label, price], i) => ({
          id: `${plan.handle}-${i}`,
          title: `${label} · ${TIERS[artist.theme].specialty}`,
          ownerHandle: plan.handle,
          priceFromUsd: price,
          cover: strip(pool(plan.images[i])),
          href: poolArtist(plan.handle).href,
        }));
      }),
    ],
    tags: TAGS,
  };
}

import { demoImages } from "./demo-images";
import type { ArtistProfile, Post } from "./types";

/*
 * In-memory stand-in for the real database. It lives on `globalThis` so it
 * survives dev hot reloads, but it resets on every server restart and is not
 * shared between serverless instances. Replace with Postgres when auth and
 * storage land — the query layer in `queries.ts` is the only consumer.
 */

const art = demoImages;

const profiles: ArtistProfile[] = [
  {
    id: "usr_mira",
    handle: "mira",
    displayName: "Mira Solenne",
    pronouns: "she/her",
    headline: "Illustrator · Background artist · OC designer",
    bio: "I paint big skies, quiet cities and the characters who wander through them. Commissions are open — I love working on your OCs.",
    location: "Lisbon, Portugal",
    joinedAt: "2025-03-14",
    plan: "pro",
    avatar: art.miraAvatar,
    banner: art.valleyBanner,
    stats: { followers: 12840, following: 312, artworks: 128 },
    availability: { note: "Freelance, collabs & book covers" },
    commissions: {
      status: "open",
      slotsTotal: 5,
      slotsTaken: 2,
      startingPriceUsd: 45,
      turnaround: "2–3 weeks",
      types: ["Icons", "Half-body", "Full illustration", "Ref sheets"],
    },
    gallery: {
      total: 128,
      preview: [art.sunsetReflection, art.skyWhirl, art.rainyRoad, art.snowVillage],
    },
    links: [
      { platform: "instagram", label: "Instagram", url: "https://instagram.com/" },
      { platform: "tiktok", label: "TikTok", url: "https://tiktok.com/" },
      { platform: "x", label: "X", url: "https://x.com/" },
      { platform: "youtube", label: "YouTube", url: "https://youtube.com/" },
      { platform: "kofi", label: "Ko-fi", url: "https://ko-fi.com/" },
      { platform: "website", label: "mirasolenne.art", url: "https://example.com/" },
    ],
    appearance: {
      accent: "ocean",
      bannerFocusY: 45,
      buttonShape: "pill",
      sidebarPosition: "left",
    },
  },
  {
    id: "usr_kai",
    handle: "kai",
    displayName: "Kai Rivers",
    pronouns: "they/them",
    headline: "Furry character artist · Adoptables",
    bio: "Soft creatures and stranger ones. Adopts drop every other Friday — every one comes with a ref sheet.",
    joinedAt: "2026-01-09",
    plan: "free",
    avatar: art.kaiAvatar,
    banner: art.heroBanner,
    stats: { followers: 2310, following: 540, artworks: 46 },
    commissions: {
      status: "waitlist",
      slotsTotal: 3,
      slotsTaken: 3,
      startingPriceUsd: 30,
      turnaround: "3–4 weeks",
      types: ["Adoptables", "Chibis"],
    },
    gallery: {
      total: 46,
      preview: [art.bunnyAdopt, art.campfire, art.pinkBunny, art.plushBunny],
    },
    links: [
      { platform: "instagram", label: "Instagram", url: "https://instagram.com/" },
      { platform: "twitch", label: "Twitch", url: "https://twitch.tv/" },
      { platform: "bluesky", label: "Bluesky", url: "https://bsky.app/" },
    ],
    appearance: {
      accent: "mint",
      bannerFocusY: 35,
      // Set while Kai was on a Pro trial — ignored on the free plan.
      buttonShape: "square",
      sidebarPosition: "right",
    },
  },
];

const posts: Post[] = [
  {
    id: "pst_1",
    authorHandle: "mira",
    kind: "finished",
    body: "Golden hour, finally finished 🌅\n\nThree weeks of layering glazes until the water felt like it was glowing from inside. Prints coming soon — let me know which size you'd want!",
    media: [art.sunsetReflection],
    createdAt: "2026-10-02T15:20:00Z",
    pinned: true,
    likes: 2841,
    comments: 164,
  },
  {
    id: "pst_2",
    authorHandle: "mira",
    kind: "update",
    body: "Commission slots are open for October! 3 of 5 left. Icons, half-bodies and full illustrations — OCs very welcome. Hit the Commissions button on my profile to request one.",
    media: [],
    createdAt: "2026-10-08T10:05:00Z",
    likes: 412,
    comments: 37,
  },
  {
    id: "pst_3",
    authorHandle: "mira",
    kind: "wip",
    body: "Two pieces for my 'Quiet Worlds' series. Still deciding whether the floating island needs more light — thoughts?",
    media: [art.skyWhirl, art.snowVillage],
    createdAt: "2026-10-06T19:42:00Z",
    likes: 958,
    comments: 88,
  },
  {
    id: "pst_4",
    authorHandle: "mira",
    kind: "finished",
    body: "After the rain — a little palate cleanser between commissions.",
    media: [art.rainyRoad],
    createdAt: "2026-09-27T12:00:00Z",
    likes: 1630,
    comments: 51,
  },
  {
    id: "pst_5",
    authorHandle: "mira",
    kind: "sketch",
    body: "City studies. Trying to push warm light without losing the cold feeling of the blue one.",
    media: [art.cityRain, art.amberCity],
    createdAt: "2026-09-21T08:30:00Z",
    likes: 774,
    comments: 22,
  },
  {
    id: "pst_6",
    authorHandle: "kai",
    kind: "finished",
    body: "New bunny adopt is up! Comes with a full ref sheet and commercial-use rights for the buyer.",
    media: [art.bunnyAdopt],
    createdAt: "2026-10-03T17:00:00Z",
    pinned: true,
    likes: 205,
    comments: 14,
  },
  {
    id: "pst_7",
    authorHandle: "kai",
    kind: "finished",
    body: "Campfire stories 🔥",
    media: [art.campfire],
    createdAt: "2026-09-30T21:10:00Z",
    likes: 340,
    comments: 19,
  },
  {
    id: "pst_8",
    authorHandle: "kai",
    kind: "sketch",
    body: "Two bunny concepts for next Friday's drop. Which one should go first?",
    media: [art.pinkBunny, art.plushBunny],
    createdAt: "2026-09-26T14:00:00Z",
    likes: 188,
    comments: 41,
  },
];

type Store = { profiles: ArtistProfile[]; posts: Post[] };

const globalForStore = globalThis as unknown as { __artiflowStore?: Store };

export const db: Store = (globalForStore.__artiflowStore ??= {
  profiles,
  posts,
});

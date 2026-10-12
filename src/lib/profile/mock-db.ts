import { demoImages } from "./demo-images";
import type {
  ArtistProfile,
  Artwork,
  CommissionRequest,
  CommissionService,
  Post,
  Review,
} from "./types";

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
    draws: ["human", "humanoid", "background", "oc_design"],
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
      rating: { average: 4.9, count: 132 },
      note: "Thanks for considering me for your commission! Please read the service details before requesting — I'll reply with a quote within 48 hours. Sketch approval comes before any rendering.",
      terms: [
        {
          title: "Timeline",
          items: [
            "Sketch within 5 days of payment.",
            "Final delivery within the service's turnaround — I'll keep you posted if anything changes.",
            "Rush orders are available for +30%; ask before requesting.",
          ],
        },
        {
          title: "Revisions",
          items: [
            "Unlimited small changes at the sketch stage.",
            "After rendering starts, revisions are limited to the number listed in the service.",
          ],
        },
        {
          title: "Refunds",
          items: [
            "Full refund before I start the sketch.",
            "50% refund after the sketch is approved.",
            "No refunds once final rendering has begun.",
          ],
        },
        {
          title: "Usage",
          items: [
            "I may share the piece in my portfolio unless we agree otherwise.",
            "Commercial use only as listed in the service.",
            "No AI training, NFT minting or reselling the artwork.",
          ],
        },
        {
          title: "Communication",
          items: ["I'm based in Lisbon (UTC+0) and usually reply within 48 hours."],
        },
      ],
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
    draws: ["anthro", "feral", "oc_design", "ref_sheet"],
    bio: "Soft creatures and stranger ones. Adopts drop every other Friday — every one comes with a ref sheet.",
    joinedAt: "2026-01-09",
    plan: "free",
    avatar: art.kaiAvatar,
    banner: art.heroBanner,
    stats: { followers: 2310, following: 540, artworks: 46 },
    commissions: {
      status: "waitlist",
      rating: { average: 5, count: 18 },
      note: "Waitlist only right now — join and I'll reach out when a slot opens. Adopts include full ownership and commercial rights.",
      terms: [
        {
          title: "Payment",
          items: ["Full payment upfront once your slot opens.", "Unpaid slots are released after 72 hours."],
        },
        {
          title: "Refunds",
          items: ["No refunds after the design is delivered."],
        },
        {
          title: "Ownership",
          items: [
            "You own the character and may resell it for no more than you paid plus extra art.",
            "Please credit @kai as the original designer.",
          ],
        },
      ],
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
  {
    id: "usr_nadia",
    handle: "nadiadraws",
    displayName: "Nadia Park",
    headline: "Comic artist · Neon & night scenes",
    draws: ["human", "humanoid", "background"],
    bio: "Drawing my OCs in cities that never sleep. Currently working on a webcomic.",
    location: "Seoul, South Korea",
    joinedAt: "2025-11-02",
    plan: "free",
    avatar: { ...art.nightDrive, alt: "Nadia Park", focus: "50% 15%" },
    banner: { ...art.rainyRoad, alt: "Rain-soaked road at dusk" },
    stats: { followers: 4120, following: 288, artworks: 64 },
    commissions: {
      status: "closed",
      slotsTotal: 0,
      slotsTaken: 0,
      startingPriceUsd: 60,
      turnaround: "3 weeks",
      types: ["Comic pages"],
    },
    gallery: { total: 64, preview: [art.nightDrive, art.cityRain, art.amberCity] },
    links: [{ platform: "instagram", label: "Instagram", url: "https://instagram.com/" }],
    appearance: { accent: "sky", bannerFocusY: 50 },
  },
  {
    id: "usr_pebble",
    handle: "pebblecat",
    displayName: "Pebble",
    pronouns: "he/him",
    headline: "Cozy illustrator · Shops & critters",
    draws: ["anthro", "feral", "chibi", "emote"],
    bio: "Tiny shops, tinier cats. Sticker sheets every month.",
    joinedAt: "2026-04-18",
    plan: "pro",
    avatar: { ...art.shopKeeper, alt: "Pebble", focus: "50% 30%" },
    banner: { ...art.amberCity, alt: "Amber-lit city at night" },
    stats: { followers: 8930, following: 120, artworks: 210 },
    commissions: {
      status: "open",
      slotsTotal: 4,
      slotsTaken: 1,
      startingPriceUsd: 25,
      turnaround: "1–2 weeks",
      types: ["Stickers", "Chibis"],
    },
    gallery: { total: 210, preview: [art.shopKeeper, art.kitchenMorning, art.snowVillage] },
    links: [{ platform: "kofi", label: "Ko-fi", url: "https://ko-fi.com/" }],
    appearance: { accent: "lilac", bannerFocusY: 40, buttonShape: "pill" },
    // Demo of a fully decorated Flow+ profile (src/lib/customization).
    customization: {
      theme: { preset: "sakura" },
      background: { pattern: "hearts" },
      name: { font: "hand", gradient: ["#ff7aa8", "#c04dff"], effect: "sticker" },
      buttons: { shape: "sketch", style: "solid" },
      layout: { sidebar: "left" },
      frame: "kitty",
    },
    about: {
      height: 1080,
      background: "transparent",
      blocks: [
        { id: "hello", type: "text", x: 60, y: 40, w: 520, h: 96, rotate: -3, z: 4, text: "hi, i'm pebble! ♡", font: "hand", size: 64, align: "left", color: "#c04dff", background: "transparent" },
        { id: "intro", type: "text", x: 60, y: 150, w: 440, h: 150, rotate: 0, z: 2, text: "I draw tiny round creatures and far too many bunnies. Commissions open whenever the sticker shop restocks!", font: "sans", size: 20, align: "left" },
        { id: "tape-1", type: "sticker", sticker: "tape", color: "#ffe9a8", x: 30, y: 128, w: 120, h: 50, rotate: -14, z: 8 },
        { id: "pic-bunny", type: "image", image: { path: art.pinkBunny.src, width: art.pinkBunny.width, height: art.pinkBunny.height }, alt: "Pink bunny sketch", frame: "polaroid", x: 580, y: 40, w: 300, h: 360, rotate: 5, z: 3 },
        { id: "heart-1", type: "sticker", sticker: "heart", color: "#ff6fa5", x: 860, y: 16, w: 96, h: 96, rotate: 12, z: 6 },
        { id: "likes", type: "list", title: "Likes", items: ["Strawberry milk", "Rainy café days", "Plushies (too many)", "Pastel everything", "Your OCs!!"], marker: "heart", x: 60, y: 330, w: 300, h: 300, rotate: -2, z: 3, font: "sans", size: 19, align: "left", background: "#fff0f6" },
        { id: "star-1", type: "sticker", sticker: "star", color: "#ffd166", x: 320, y: 300, w: 72, h: 72, rotate: -10, z: 6 },
        { id: "dni", type: "list", title: "DNI", items: ["Reposting art without credit", "AI image generators", "Mean comments"], marker: "cross", x: 390, y: 350, w: 280, h: 230, rotate: 2, z: 3, font: "sans", size: 19, align: "left", background: "#f1edff" },
        { id: "pic-plush", type: "image", image: { path: art.plushBunny.src, width: art.plushBunny.width, height: art.plushBunny.height }, alt: "Plush bunny", frame: "tape", x: 700, y: 440, w: 260, h: 260, rotate: -4, z: 2 },
        { id: "paw-1", type: "sticker", sticker: "paw", color: "#b892ff", x: 610, y: 630, w: 84, h: 84, rotate: 14, z: 6 },
        { id: "facts", type: "list", title: "Fun facts", items: ["Left-handed artist", "Owns 3 cats, draws 30", "Still can't draw hands (working on it)"], marker: "star", x: 60, y: 670, w: 420, h: 220, rotate: 1, z: 3, font: "sans", size: 19, align: "left", background: "#eaf6ff" },
        { id: "pic-kitchen", type: "image", image: { path: art.kitchenMorning.src, width: art.kitchenMorning.width, height: art.kitchenMorning.height }, alt: "A cozy kitchen morning", frame: "round", x: 510, y: 740, w: 220, h: 220, rotate: 0, z: 2 },
        { id: "sparkle-1", type: "sticker", sticker: "sparkle", color: "#5ee7ff", x: 720, y: 735, w: 70, h: 70, rotate: 0, z: 6 },
        { id: "bubble", type: "sticker", sticker: "speech", color: "#ffffff", x: 740, y: 860, w: 230, h: 180, rotate: -3, z: 4 },
        { id: "thanks", type: "text", x: 762, y: 892, w: 190, h: 96, rotate: -3, z: 5, text: "thank u for\nvisiting!!", font: "hand", size: 30, align: "center", color: "#5a2236", background: "transparent" },
        { id: "status", type: "html", html: "<div style=\"background:linear-gradient(90deg,#ff7aa8,#c04dff);color:#fff;font:700 15px system-ui;padding:12px 16px;border-radius:16px\">✿ currently: drawing bunnies</div>", x: 60, y: 920, w: 400, h: 64, rotate: 0, z: 2 },
      ],
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
    topComment: { author: "theowrites", text: "The reflection on the water is unreal. A3 print please!" },
    createdAt: "2026-10-02T15:20:00Z",
    pinned: true,
    likes: 2841,
    comments: 164,
  },
  {
    id: "pst_2",
    authorHandle: "mira",
    kind: "update",
    body: "Commission slots are open for October! 3 of 5 left — half-bodies are 20% off this month. OCs very welcome 💙",
    media: [],
    embed: { type: "service", serviceId: "svc_halfbody" },
    createdAt: "2026-10-10T04:10:00Z",
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
    body: "New bunny adopt is up! Pip comes with a full ref sheet and commercial-use rights for the buyer 🐰",
    media: [],
    embed: { type: "adoptable", artworkId: "art_11" },
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
  {
    id: "pst_9",
    authorHandle: "nadiadraws",
    kind: "update",
    body: "Got my commission from @mira and I can't stop staring at it 💙 Nadia finally has her late-shift portrait.",
    media: [art.nightDrive],
    createdAt: "2026-10-09T21:30:00Z",
    likes: 1204,
    comments: 63,
  },
  {
    id: "pst_10",
    authorHandle: "pebblecat",
    kind: "sketch",
    body: "Sticker sheet doodles for November. Which critter should get its own sticker?",
    media: [art.shopKeeper],
    topComment: { author: "kai", text: "The octopus. Obviously the octopus 🐙" },
    createdAt: "2026-10-08T15:45:00Z",
    likes: 860,
    comments: 97,
  },
  {
    id: "pst_12",
    authorHandle: "pebblecat",
    kind: "update",
    body: "This is the kind of lighting I dream about. Saving it as a study reference 🙏",
    media: [],
    quotePostId: "pst_1",
    createdAt: "2026-10-09T08:10:00Z",
    likes: 318,
    comments: 12,
  },
  {
    id: "pst_11",
    authorHandle: "nadiadraws",
    kind: "wip",
    body: "Page 14 thumbnails. Rain scenes are going to be the death of me.",
    media: [art.cityRain, art.amberCity],
    createdAt: "2026-10-05T11:20:00Z",
    likes: 530,
    comments: 28,
  },
];

const artworks: Artwork[] = [
  // Mira
  { id: "art_1", ownerHandle: "mira", title: "Golden Hour", image: art.sunsetReflection, kind: "personal", likes: 2841, createdAt: "2026-10-02" },
  { id: "art_2", ownerHandle: "mira", title: "Nadia's late shift", image: art.nightDrive, kind: "commission", client: "nadiadraws", likes: 932, createdAt: "2026-09-29" },
  { id: "art_3", ownerHandle: "mira", title: "Quiet Worlds I — Skyward", image: art.skyWhirl, kind: "personal", likes: 958, createdAt: "2026-09-25" },
  { id: "art_4", ownerHandle: "mira", title: "Lune, headshot study", image: art.silverHair, kind: "commission", client: "lune.oc", likes: 640, createdAt: "2026-09-22" },
  { id: "art_5", ownerHandle: "mira", title: "After the Rain", image: art.rainyRoad, kind: "personal", likes: 1630, createdAt: "2026-09-18" },
  { id: "art_6", ownerHandle: "mira", title: "Corner shop keeper", image: art.shopKeeper, kind: "commission", client: "pebblecat", likes: 701, createdAt: "2026-09-12" },
  { id: "art_7", ownerHandle: "mira", title: "Quiet Worlds II — Snowfall", image: art.snowVillage, kind: "personal", likes: 812, createdAt: "2026-09-08" },
  { id: "art_8", ownerHandle: "mira", title: "Sunday morning, for Theo", image: art.kitchenMorning, kind: "commission", client: "theowrites", likes: 455, createdAt: "2026-09-02" },
  { id: "art_9", ownerHandle: "mira", title: "Flooded City", image: art.cityRain, kind: "personal", likes: 774, createdAt: "2026-08-28" },
  { id: "art_10", ownerHandle: "mira", title: "Amber Stacks", image: art.amberCity, kind: "personal", likes: 520, createdAt: "2026-08-20" },
  // Kai
  { id: "art_11", ownerHandle: "kai", title: "Pip — bunny mechanic", image: art.bunnyAdopt, kind: "adoptable", adopt: { priceUsd: 45, status: "available" }, likes: 205, createdAt: "2026-10-03" },
  { id: "art_12", ownerHandle: "kai", title: "Campfire stories", image: art.campfire, kind: "personal", likes: 340, createdAt: "2026-09-30" },
  { id: "art_13", ownerHandle: "kai", title: "Rosie — braided bunny", image: art.pinkBunny, kind: "adoptable", adopt: { priceUsd: 40, status: "sold" }, likes: 188, createdAt: "2026-09-26" },
  { id: "art_14", ownerHandle: "kai", title: "Marsh & her plush", image: art.plushBunny, kind: "adoptable", adopt: { priceUsd: 40, status: "available" }, likes: 176, createdAt: "2026-09-26" },
  { id: "art_15", ownerHandle: "kai", title: "Ronin's ref", image: art.kaiAvatar, kind: "commission", client: "ronin.wolf", likes: 260, createdAt: "2026-09-14" },
  { id: "art_16", ownerHandle: "kai", title: "6th anniversary!", image: art.heroBanner, kind: "personal", likes: 412, createdAt: "2026-09-01" },
];

const services: CommissionService[] = [
  {
    id: "svc_headshot",
    ownerHandle: "mira",
    category: "Portraits",
    usage: { personal: { kind: "included" }, commercialContent: { kind: "percent", percent: 50 }, commercialMerch: null },
    title: "Headshot & icon",
    description: "A clean shoulders-up portrait of your character — perfect for avatars and socials.",
    priceFromUsd: 45,
    turnaround: "5–7 days",
    includes: ["1 character", "Shoulders up", "Simple background", "1 revision", "High-res PNG"],
    examples: [art.silverHair, art.kitchenMorning, art.nightDrive],
    addons: [
      { id: "shading", label: "Full shading", price: { kind: "fixed", usd: 10 } },
      { id: "animation", label: "Animated blink", price: { kind: "fixed", usd: 10 }, hint: "A short loop, GIF and MP4" },
      { id: "transparent", label: "Transparent background", price: { kind: "fixed", usd: 5 } },
    ],
  },
  {
    id: "svc_halfbody",
    ownerHandle: "mira",
    category: "Illustration",
    usage: { personal: { kind: "included" }, commercialContent: { kind: "included" }, commercialMerch: { kind: "percent", percent: 200 } },
    discountPercent: 20,
    title: "Half-body illustration",
    description: "Waist-up illustration with a soft painted background and lighting that matches the mood.",
    priceFromUsd: 85,
    turnaround: "1–2 weeks",
    includes: ["1 character", "Waist up", "Painted background", "2 revisions", "Process timelapse"],
    examples: [art.nightDrive, art.shopKeeper, art.kitchenMorning],
    popular: true,
    addons: [
      { id: "lighting", label: "Mood lighting", price: { kind: "included" } },
      { id: "character", label: "Extra character", price: { kind: "percent", percent: 70 } },
      { id: "background", label: "Detailed background", price: { kind: "fixed", usd: 30 }, hint: "A full scene instead of a soft painted one" },
      { id: "timelapse", label: "Full process video", price: { kind: "fixed", usd: 15 } },
    ],
  },
  {
    id: "svc_full",
    ownerHandle: "mira",
    category: "Illustration",
    usage: { personal: { kind: "included" }, commercialContent: { kind: "included" }, commercialMerch: { kind: "percent", percent: 100 } },
    title: "Full illustration",
    description: "A complete scene with environment, atmosphere and storytelling — my favorite thing to paint.",
    priceFromUsd: 160,
    turnaround: "2–3 weeks",
    includes: ["Up to 2 characters", "Full scene", "2 revisions", "Print-ready file", "Commercial use available"],
    examples: [art.sunsetReflection, art.rainyRoad, art.skyWhirl],
  },
  {
    id: "svc_refsheet",
    ownerHandle: "mira",
    category: "Character design",
    usage: { personal: { kind: "included" }, commercialContent: { kind: "included" }, commercialMerch: null },
    title: "Character ref sheet",
    description: "Front and back views, palette and expressions so your OC stays consistent everywhere.",
    priceFromUsd: 120,
    turnaround: "2 weeks",
    includes: ["Front & back view", "Color palette", "3 expressions", "2 revisions"],
    examples: [art.silverHair, art.shopKeeper, art.nightDrive],
    addons: [
      { id: "outfit", label: "Extra outfit", price: { kind: "fixed", usd: 40 } },
      { id: "props", label: "Weapon or prop sheet", price: { kind: "fixed", usd: 25 } },
    ],
  },
  {
    id: "svc_adopt",
    ownerHandle: "kai",
    category: "Adoptables",
    usage: { personal: { kind: "included" }, commercialContent: { kind: "included" }, commercialMerch: { kind: "included" } },
    title: "Custom adoptable",
    description: "An original creature designed around your vibe, delivered with a full ref sheet.",
    priceFromUsd: 30,
    turnaround: "3–4 weeks",
    includes: ["Original design", "Full ref sheet", "Commercial rights"],
    examples: [art.bunnyAdopt, art.pinkBunny, art.plushBunny],
    popular: true,
  },
  {
    id: "svc_chibi",
    ownerHandle: "kai",
    category: "Chibi",
    usage: { personal: { kind: "included" }, commercialContent: { kind: "percent", percent: 50 }, commercialMerch: { kind: "percent", percent: 100 } },
    title: "Chibi",
    description: "Tiny, squishy and full of personality. Great for stickers and emotes.",
    priceFromUsd: 30,
    turnaround: "2 weeks",
    includes: ["1 character", "Transparent background", "1 revision"],
    examples: [art.plushBunny, art.campfire, art.pinkBunny],
    addons: [
      { id: "transparent", label: "Transparent background", price: { kind: "included" } },
      { id: "cutlines", label: "Sticker cut lines", price: { kind: "fixed", usd: 5 } },
      { id: "emote", label: "Emote-ready sizes", price: { kind: "fixed", usd: 10 }, hint: "28, 56 and 112 px" },
    ],
  },
];

const reviews: Review[] = [
  { id: "rev_1", artistHandle: "mira", author: "nadiadraws", authorAvatar: { ...art.nightDrive, focus: "50% 15%" }, rating: 5, serviceTitle: "Half-body illustration", text: "Mira nailed my OC's vibe on the first sketch. Super clear updates the whole way.", createdAt: "2026-09-30" },
  { id: "rev_2", artistHandle: "mira", author: "theowrites", authorAvatar: { ...art.kitchenMorning, focus: "50% 12%" }, rating: 5, serviceTitle: "Full illustration", text: "The lighting in the background is unreal. Worth every cent — already planning the next one.", createdAt: "2026-09-05" },
  { id: "rev_3", artistHandle: "mira", author: "lune.oc", rating: 4, serviceTitle: "Headshot & icon", text: "Lovely work and fast delivery. One revision round was all I needed.", createdAt: "2026-08-21" },
  { id: "rev_4", artistHandle: "kai", author: "ronin.wolf", authorAvatar: { ...art.campfire, focus: "70% 30%" }, rating: 5, serviceTitle: "Custom adoptable", text: "Kai turned three vague words into my favorite character. The ref sheet is gorgeous.", createdAt: "2026-09-16" },
];

type Store = {
  profiles: ArtistProfile[];
  posts: Post[];
  artworks: Artwork[];
  services: CommissionService[];
  reviews: Review[];
  requests: CommissionRequest[];
};

const globalForStore = globalThis as unknown as {
  __artiflowStore?: Store;
  __artiflowSeed?: string;
};

/** Bump to wipe what was made in dev (posts, uploads, requests) without restarting the server. */
const SEED_VERSION = 2;

// Re-seed when the seed data above changes (e.g. a new field), otherwise keep
// the store across hot reloads so posts/images created in dev survive.
const seed = JSON.stringify({ SEED_VERSION, profiles, posts, artworks, services, reviews });
if (globalForStore.__artiflowSeed !== seed) {
  globalForStore.__artiflowSeed = seed;
  globalForStore.__artiflowStore = structuredClone({
    profiles,
    posts,
    artworks,
    services,
    reviews,
    requests: [],
  });
}

export const db: Store = globalForStore.__artiflowStore!;

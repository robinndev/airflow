import { demoImages as art } from "@/lib/profile/demo-images";
import type { CharacterRecord, CollectionRecord } from "./assemble";
import type { Piece } from "./types";

/*
 * DEMO ONLY: the demo artists' characters and collections. Their pieces are
 * mock-db's artworks (`art_…`), plus Pebble's fox OC Kinako below, whose art
 * is third-party (credited in demo-images.ts). Real accounts' galleries live
 * in Supabase (src/lib/gallery/server.ts). Drop this file with the demo data.
 */

const kinako = (id: string, title: string, image: Piece["image"], createdAt: string, likes: number, extra: Partial<Piece> = {}): Piece => ({
  id,
  ownerHandle: "pebblecat",
  title,
  image,
  kind: "personal",
  likes,
  createdAt,
  ...extra,
});

/** Pebble's pieces (mock-db has none): everything Kinako is in. */
export const demoPieces: Piece[] = [
  kinako("kin_design", "Kinako, official design", art.kinakoDesign, "2026-10-08", 1204, {
    description: "Her current design. Green school jacket, the bell she can't sneak around in, and the hair stick she keeps losing.",
    tags: ["ref", "full body"],
  }),
  kinako("kin_side", "Side view, with the tail", art.kinakoSide, "2026-10-01", 512, { tags: ["ref"] }),
  kinako("kin_back", "Back view (it's mostly tail)", art.kinakoBack, "2026-09-27", 880, { tags: ["ref"] }),
  kinako("kin_winter", "Winter coat", art.kinakoWinter, "2026-09-20", 640, { tags: ["outfit", "winter"] }),
  kinako("kin_stars", "Star festival outfit", art.kinakoStars, "2026-09-12", 731, { tags: ["outfit"] }),
  kinako("kin_newyear", "New Year 2026: year of the horse", art.kinakoNewYear, "2026-09-02", 455, { tags: ["holiday"] }),
  kinako("kin_melted", "Above 30°C", art.kinakoMelted, "2026-08-25", 1890, { description: "Summer, as experienced by a fox with a winter coat." }),
  kinako("kin_nap", "Nap mode", art.kinakoNap, "2026-08-18", 1102),
  kinako("kin_headstand", "Headstand", art.kinakoHeadstand, "2026-08-10", 377),
  kinako("kin_tumble", "Ran into a tree", art.kinakoTumble, "2026-08-02", 623),
  kinako("kin_slugs", "Slug Kinako", art.kinakoSlugs, "2026-07-21", 942, { description: "Someone asked what she'd be as a slug. Now we know." }),
  kinako("kin_moss", "Moss version", art.kinakoMoss, "2026-07-10", 318),
  kinako("kin_doodle", "Sleepy doodle", art.kinakoDoodle, "2026-07-02", 260, { tags: ["sketch"] }),
];

export const demoCharacters: CharacterRecord[] = [
  {
    id: "chr_kinako",
    ownerHandle: "pebblecat",
    slug: "kinako",
    name: "Kinako",
    tagline: "Naps anywhere. Melts above 30°C.",
    species: "Fox spirit",
    pronouns: "she/her",
    story:
      "Kinako showed up at the shop one rainy afternoon and never really left. Nobody knows how old she is (she says \"old enough\"), only that she's a fox spirit who traded her shrine for a warm counter and a steady supply of fried tofu.\n\nShe means well. She also knocks things over with her tail, falls asleep mid-sentence and can't sneak up on anyone, because of the bell. In summer she stops being solid entirely.",
    traits: ["Sleepy", "Curious", "Clumsy", "Loyal to snacks", "Can't keep a secret"],
    tags: ["kitsune", "fox", "shop critter"],
    palette: ["#fbe8c5", "#f1a7ab", "#879732", "#8b2d42", "#c8a58e"],
    coverId: "kin_design",
    art: [
      { artworkId: "kin_design", section: "design" },
      { artworkId: "kin_side", section: "design" },
      { artworkId: "kin_back", section: "design" },
      { artworkId: "kin_winter", section: "outfits" },
      { artworkId: "kin_stars", section: "outfits" },
      { artworkId: "kin_newyear", section: "outfits" },
      { artworkId: "kin_melted", section: "expressions" },
      { artworkId: "kin_nap", section: "expressions" },
      { artworkId: "kin_headstand", section: "expressions" },
      { artworkId: "kin_tumble", section: "expressions" },
      { artworkId: "kin_slugs", section: "versions" },
      { artworkId: "kin_moss", section: "versions" },
      { artworkId: "kin_doodle", section: "art" },
    ],
    createdAt: "2026-07-02",
  },
  {
    id: "chr_pip",
    ownerHandle: "kai",
    slug: "pip",
    name: "Pip",
    tagline: "Fixes everything except her sleep schedule.",
    species: "Bunny",
    pronouns: "she/her",
    story: "Grease on her paws, a wrench behind her ear and a soft spot for broken things. Pip runs a repair stall out of a teal jacket with too many pockets.",
    traits: ["Handy", "Stubborn", "Kind"],
    tags: ["bunny", "mechanic"],
    palette: [],
    coverId: "art_11",
    art: [{ artworkId: "art_11", section: "design" }],
    adoptableId: "adopt_pip",
    createdAt: "2026-10-03",
  },
  {
    id: "chr_marsh",
    ownerHandle: "kai",
    slug: "marsh",
    name: "Marsh",
    tagline: "Never seen without her plush.",
    species: "Bunny",
    pronouns: "she/they",
    story: "Shy at first, then impossible to stop talking to. The plush is called Marshmallow, and it has opinions.",
    traits: ["Shy", "Chatty (eventually)"],
    tags: ["bunny", "soft"],
    palette: [],
    coverId: "art_14",
    art: [{ artworkId: "art_14", section: "design" }],
    adoptableId: "adopt_marsh",
    createdAt: "2026-09-26",
  },
];

export const demoCollections: CollectionRecord[] = [
  {
    id: "col_quiet-worlds",
    ownerHandle: "mira",
    slug: "quiet-worlds",
    title: "Quiet Worlds",
    description: "Small places that feel far away. A personal series, one a season.",
    coverId: "art_3",
    artworkIds: ["art_3", "art_7", "art_1"],
    createdAt: "2026-09-08",
  },
  {
    id: "col_after-dark",
    ownerHandle: "mira",
    slug: "after-dark",
    title: "After dark",
    description: "Cities at night, wet streets, neon. Some personal, some commissioned.",
    coverId: "art_9",
    artworkIds: ["art_9", "art_2", "art_5", "art_10"],
    createdAt: "2026-08-20",
  },
];

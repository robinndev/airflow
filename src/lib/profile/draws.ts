/*
 * What an artist draws (`profiles.draws`, Postgres enum `draw_tag`): who they
 * draw (subjects, asked at sign-up) and what they make (specialties, added
 * from "Edit profile"). Profiles show them as labels ("Furry artist", "OC
 * designer"); Explore filters the open studios by them, so a buyer looking for
 * a pony artist doesn't land on someone who only paints backgrounds.
 * Client-safe. Adding a tag: add it here and to the enum (a migration).
 */

export const SUBJECTS = [
  { id: "human", label: "Humans", artist: "Human artist", hint: "People, realistic to anime" },
  { id: "anthro", label: "Anthro / furry", artist: "Furry artist", hint: "Animal people on two legs" },
  { id: "humanoid", label: "Humanoids", artist: "Humanoid artist", hint: "Elves, demons, kemonomimi, androids" },
  { id: "feral", label: "Ferals", artist: "Feral artist", hint: "Animals and creatures on four legs" },
  { id: "pony", label: "Ponies", artist: "Pony artist", hint: "Ponies, MLP style and beyond" },
] as const;

export const SPECIALTIES = [
  { id: "oc_design", label: "OC design", artist: "OC designer" },
  { id: "concept", label: "Concept art", artist: "Concept artist" },
  { id: "background", label: "Backgrounds", artist: "Background artist" },
  { id: "chibi", label: "Chibi", artist: "Chibi artist" },
  { id: "pixel", label: "Pixel art", artist: "Pixel artist" },
  { id: "emote", label: "Emotes & badges", artist: "Emote artist" },
  { id: "ref_sheet", label: "Ref sheets", artist: "Ref sheet artist" },
  { id: "animation", label: "Animation", artist: "Animator" },
] as const;

export type SubjectTag = (typeof SUBJECTS)[number]["id"];
export type DrawTag = SubjectTag | (typeof SPECIALTIES)[number]["id"];

const ALL = [...SUBJECTS, ...SPECIALTIES];
export const DRAW_TAGS = ALL.map((tag) => tag.id) as DrawTag[];
export const SUBJECT_TAGS = SUBJECTS.map((tag) => tag.id) as SubjectTag[];

export const isDrawTag = (value: unknown): value is DrawTag => DRAW_TAGS.includes(value as DrawTag);
export const isSubject = (tag: DrawTag): tag is SubjectTag => (SUBJECT_TAGS as DrawTag[]).includes(tag);

/** Known tags only, once each, in catalog order (what the database and the profile expect). */
export function cleanDraws(values: readonly unknown[]): DrawTag[] {
  return DRAW_TAGS.filter((tag) => values.includes(tag));
}

export const drawLabel = (tag: DrawTag) => ALL.find((t) => t.id === tag)!.label;

/**
 * The labels a profile shows, in order. Someone who ticked every subject
 * "draws it all" (one label instead of five), then their specialties.
 */
export function artistLabels(draws: readonly DrawTag[]): { tag: DrawTag | "all"; label: string }[] {
  const subjects = SUBJECTS.filter((s) => draws.includes(s.id));
  const specialties = SPECIALTIES.filter((s) => draws.includes(s.id));
  const who =
    subjects.length === SUBJECTS.length
      ? [{ tag: "all" as const, label: "Draws it all" }]
      : subjects.map((s) => ({ tag: s.id, label: s.artist }));
  return [...who, ...specialties.map((s) => ({ tag: s.id, label: s.artist }))];
}

/** Explore's open studios, filtered to one tag (profile labels link here). */
export const exploreDrawsHref = (tag: DrawTag | "all") => (tag === "all" ? "/explore#studios" : `/explore?draws=${tag}#studios`);

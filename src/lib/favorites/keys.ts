/*
 * What can be saved to a moodboard, and how a saved thing is named. Shared by
 * the save buttons (client), the Server Actions and the /favorites page.
 * See supabase/migrations/*_favorites.sql for the table.
 */

export const FAVORITE_KINDS = ["post", "art", "service"] as const;

/** A post (bookmark), a piece of art (heart on galleries and Explore's wall) or a commission service (bookmark). */
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

/** `kind:id`, e.g. `art:pool-12088040`. */
export type FavoriteKey = `${FavoriteKind}:${string}`;

export const favoriteKey = (kind: FavoriteKind, id: string): FavoriteKey => `${kind}:${id}`;

export const isFavoriteKind = (value: unknown): value is FavoriteKind =>
  FAVORITE_KINDS.includes(value as FavoriteKind);

/** Demo ids (`pst_3`, `art_4`, `pool-12088040`, `svc_full`), as the table's `demo_id` check allows. */
export const DEMO_ID = /^[a-z]+[_-][a-z0-9_-]{1,60}$/;

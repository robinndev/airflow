"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { loadFavoriteKeys, setFavorite } from "@/app/(site)/favorite-actions";
import { favoriteKey, type FavoriteKey, type FavoriteKind } from "@/lib/favorites/keys";
import { showToast } from "./toast-events";

/*
 * What the viewer has saved, shared by every save button on the page. Pages
 * stay static: the header tells the store who is signed in
 * (<FavoritesSession>), the keys load once per viewer, and buttons update
 * optimistically, then confirm with the server.
 */

type State = {
  /** Undefined until the header has streamed in. */
  viewer: string | null | undefined;
  keys: ReadonlySet<FavoriteKey>;
};

let state: State = { viewer: undefined, keys: new Set() };
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function mark(key: FavoriteKey, saved: boolean) {
  const keys = new Set(state.keys);
  if (saved) keys.add(key);
  else keys.delete(key);
  update({ keys });
}

/** Called by the header with the signed-in viewer's id: a new viewer starts from their own keys. */
export function syncViewer(viewer: string | null) {
  if (viewer === state.viewer) return;
  update({ viewer, keys: new Set() });
  if (!viewer) return;
  loadFavoriteKeys()
    .then((keys) => {
      // Keys saved meanwhile stay; another viewer's answer is dropped.
      if (state.viewer === viewer) update({ keys: new Set([...keys, ...state.keys]) });
    })
    .catch(() => {});
}

export type SaveTarget = { kind: FavoriteKind; id: string; title?: string };

/** Saved state of one thing, and a toggle that sends visitors to sign in. */
export function useFavorite({ kind, id, title }: SaveTarget) {
  const key = favoriteKey(kind, id);
  const saved = useSyncExternalStore(
    subscribe,
    () => state.keys.has(key),
    () => false,
  );
  const router = useRouter();
  const pathname = usePathname();

  function signIn() {
    router.push(`/sign-in?next=${encodeURIComponent(pathname + window.location.search)}`);
  }

  async function write(next: boolean, savedAt?: string) {
    mark(key, next);
    const result = await setFavorite(kind, id, next, savedAt).catch(() => null);
    if (result?.ok) return true;
    mark(key, !next);
    if (result && !result.ok && result.signIn) signIn();
    else showToast({ message: result?.error ?? "Couldn't reach the studio. Try again in a moment." });
    return false;
  }

  async function toggle() {
    if (state.viewer === null) return signIn();
    const next = !saved;
    if (!(await write(next))) return;
    const what = title ? ` “${title}”` : "";
    showToast(
      next
        ? { message: `Saved${what} to favorites`, link: { label: "View", href: "/favorites" } }
        : { message: `Removed${what} from favorites`, undo: () => void write(true) },
    );
  }

  return { saved, toggle };
}

/**
 * The moodboard's own unpin: the piece comes down right away, and Undo puts
 * it back in its old place (`savedAt`). `setHidden` shows or hides it on the board.
 */
export async function unpin(target: Required<SaveTarget> & { savedAt: string }, setHidden: (hidden: boolean) => void) {
  const key = favoriteKey(target.kind, target.id);
  const fail = (error?: string) => showToast({ message: error ?? "Couldn't reach the studio. Try again in a moment." });

  setHidden(true);
  mark(key, false);
  const result = await setFavorite(target.kind, target.id, false).catch(() => null);
  if (!result?.ok) {
    mark(key, true);
    setHidden(false);
    return fail(result?.error);
  }
  showToast({
    message: `Unpinned “${target.title}”`,
    undo: async () => {
      setHidden(false);
      mark(key, true);
      const back = await setFavorite(target.kind, target.id, true, target.savedAt).catch(() => null);
      if (back?.ok) return;
      mark(key, false);
      setHidden(true);
      fail(back?.error);
    },
  });
}

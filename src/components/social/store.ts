"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { loadFollowing, loadFollowsYou, loadLikes, setFollow, setLike, type CountResult } from "@/app/(site)/social-actions";
import { showToast } from "@/components/favorites/toast-events";

/*
 * Who the viewer follows and which posts they liked, shared by every follow
 * and like button on the page. Pages stay static: the header tells the store
 * who is signed in (<SocialSession>), follows load once per viewer, likes
 * load in one batch for the posts on screen, and buttons update
 * optimistically, then confirm with the server.
 *
 * Followers lists also ask which of the people on screen follow the viewer
 * ("Follows you", "Follow back"), in one batch like likes.
 *
 * Counts: the page renders a count; after the viewer's own follow or like,
 * the store shows its own number (optimistic, then the server's answer)
 * until the page renders a newer count of its own.
 */

type Counter = {
  /** The count the page rendered. */
  base: number;
  /** What to show instead while `base` is still the one on the page. */
  value?: number;
};

type State = {
  /** Undefined until the header has streamed in. */
  viewer: string | null | undefined;
  following: ReadonlySet<string>;
  followsLoaded: boolean;
  liked: ReadonlySet<string>;
  /** Posts whose liked state came from the server. */
  likesKnown: ReadonlySet<string>;
  /** Handles that follow the viewer, among the ones asked about. */
  followsYou: ReadonlySet<string>;
  followsYouKnown: ReadonlySet<string>;
  /** Handles and posts the viewer changed in this session: what they did wins over any load. */
  touched: ReadonlySet<string>;
  counters: ReadonlyMap<string, Counter>;
};

let state: State = {
  viewer: undefined,
  following: new Set(),
  followsLoaded: false,
  liked: new Set(),
  likesKnown: new Set(),
  followsYou: new Set(),
  followsYouKnown: new Set(),
  touched: new Set(),
  counters: new Map(),
};
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const followKey = (handle: string) => `follow:${handle}`;
const likeKey = (postId: string) => `like:${postId}`;

function toggled(set: ReadonlySet<string>, item: string, on: boolean) {
  const next = new Set(set);
  if (on) next.add(item);
  else next.delete(item);
  return next;
}

// Counts ----------------------------------------------------------------------

function setBase(key: string, base: number) {
  if (state.counters.get(key)?.base === base) return;
  update({ counters: new Map(state.counters).set(key, { base }) });
}

/** Moves a count the page shows; no-op when nothing on the page shows it. */
function setCount(key: string, value: (current: number) => number) {
  const counter = state.counters.get(key);
  if (!counter) return;
  const current = counter.value ?? counter.base;
  update({ counters: new Map(state.counters).set(key, { ...counter, value: Math.max(0, value(current)) }) });
}

/** The count to show: the page's, or the viewer's newer one while the page hasn't caught up. */
function useCount(key: string, rendered: number) {
  useEffect(() => setBase(key, rendered), [key, rendered]);
  const counter = useSyncExternalStore(
    subscribe,
    () => state.counters.get(key),
    () => undefined,
  );
  return counter?.base === rendered && counter.value !== undefined ? counter.value : rendered;
}

// Loading ---------------------------------------------------------------------

/** Posts with a like button on the page (asked about once the viewer is known). */
const wanted = new Set<string>();
let queued = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function askLikes(postIds: Iterable<string>) {
  for (const id of postIds) if (!state.likesKnown.has(id)) queued.add(id);
  if (!state.viewer || queued.size === 0 || flushTimer) return;
  // Buttons mount together: one request for all of them.
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    const viewer = state.viewer;
    const ids = [...queued];
    queued = new Set();
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      loadLikes(batch)
        .then((liked) => {
          if (state.viewer !== viewer) return;
          const known = new Set(state.likesKnown);
          const next = new Set(state.liked);
          for (const id of batch) {
            known.add(id);
            if (state.touched.has(likeKey(id))) continue;
            if (liked.includes(id)) next.add(id);
            else next.delete(id);
          }
          update({ likesKnown: known, liked: next });
        })
        .catch(() => {});
    }
  }, 30);
}

/** People on a list (asked about once the viewer is known). */
const wantedFollowers = new Set<string>();
let queuedFollowers = new Set<string>();
let followersTimer: ReturnType<typeof setTimeout> | undefined;

function askFollowsYou(handles: Iterable<string>) {
  for (const handle of handles) if (!state.followsYouKnown.has(handle)) queuedFollowers.add(handle);
  if (!state.viewer || queuedFollowers.size === 0 || followersTimer) return;
  followersTimer = setTimeout(() => {
    followersTimer = undefined;
    const viewer = state.viewer;
    const handles = [...queuedFollowers];
    queuedFollowers = new Set();
    for (let i = 0; i < handles.length; i += 200) {
      const batch = handles.slice(i, i + 200);
      loadFollowsYou(batch)
        .then((followers) => {
          if (state.viewer !== viewer) return;
          const known = new Set(state.followsYouKnown);
          const next = new Set(state.followsYou);
          for (const handle of batch) {
            known.add(handle);
            if (followers.includes(handle)) next.add(handle);
            else next.delete(handle);
          }
          update({ followsYouKnown: known, followsYou: next });
        })
        .catch(() => {});
    }
  }, 30);
}

/** Called by the header with the signed-in viewer's id: a new viewer starts from their own state. */
export function syncViewer(viewer: string | null) {
  if (viewer === state.viewer) return;
  update({
    viewer,
    following: new Set(),
    followsLoaded: false,
    liked: new Set(),
    likesKnown: new Set(),
    followsYou: new Set(),
    followsYouKnown: new Set(),
    touched: new Set(),
  });
  if (!viewer) return;
  loadFollowing()
    .then((handles) => {
      if (state.viewer !== viewer) return;
      // Handles followed or unfollowed meanwhile keep what the viewer did.
      const next = new Set(handles);
      for (const key of state.touched) {
        if (!key.startsWith("follow:")) continue;
        const handle = key.slice("follow:".length);
        if (state.following.has(handle)) next.add(handle);
        else next.delete(handle);
      }
      update({ following: next, followsLoaded: true });
    })
    .catch(() => {});
  askLikes(wanted);
  askFollowsYou(wantedFollowers);
}

// Writing ---------------------------------------------------------------------

/** The newest request per key: older answers arriving late are ignored. */
const latest = new Map<string, number>();
let requests = 0;

function useSignIn() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/sign-in?next=${encodeURIComponent(pathname + window.location.search)}`);
}

/**
 * Flips one follow or like: shows it right away, then confirms. On failure it
 * goes back, unless the viewer has pressed again since.
 */
async function write(
  key: string,
  apply: (on: boolean) => void,
  on: boolean,
  send: () => Promise<CountResult>,
  signIn: () => void,
) {
  const id = ++requests;
  latest.set(key, id);
  update({ touched: toggled(state.touched, key, true) });
  apply(on);
  setCount(key, (n) => n + (on ? 1 : -1));

  const result = await send().catch(() => null);
  if (latest.get(key) !== id) return;
  if (result?.ok) return setCount(key, () => result.count);
  apply(!on);
  setCount(key, (n) => n + (on ? -1 : 1));
  if (result && result.signIn) signIn();
  else showToast({ message: result?.error ?? "Couldn't reach the studio. Try again in a moment." });
}

/** Follows or unfollows; a no-op when that's already the case (an Undo pressed twice). */
function sendFollow(handle: string, on: boolean, current: boolean, signIn: () => void) {
  if (state.viewer === null) return signIn();
  if (on === current) return;
  const apply = (value: boolean) => update({ following: toggled(state.following, handle, value) });
  void write(followKey(handle), apply, on, () => setFollow(handle, on), signIn);
}

/**
 * Whether the viewer follows `handle`, and a toggle that sends visitors to
 * sign in. `initial` is the server's answer when the page knows it, so the
 * button doesn't flip once follows load. `set` is for an Undo: it follows or
 * unfollows whatever the button showed when it was made.
 */
export function useFollow(handle: string, initial?: boolean) {
  const key = followKey(handle);
  const current = () => (state.followsLoaded || state.touched.has(key) ? state.following.has(handle) : (initial ?? false));
  const following = useSyncExternalStore(subscribe, current, () => initial ?? false);
  const signIn = useSignIn();

  const toggle = () => sendFollow(handle, !following, following, signIn);
  const set = (on: boolean) => sendFollow(handle, on, current(), signIn);

  return { following, toggle, set };
}

/** Whether follow buttons know their state: a visitor, or the viewer's follows have loaded. */
export function useFollowsReady() {
  return useSyncExternalStore(
    subscribe,
    () => state.viewer === null || state.followsLoaded,
    () => false,
  );
}

/** The signed-in viewer's id (null: a visitor; undefined until the header knows). */
export function useSocialViewer() {
  return useSyncExternalStore(
    subscribe,
    () => state.viewer,
    () => undefined,
  );
}

/**
 * Whether `handle` follows the viewer: undefined until known. `known` is the
 * page's answer when it already has it (everyone on your own followers list).
 */
export function useFollowsYou(handle: string, known?: boolean) {
  useEffect(() => {
    if (known !== undefined) return;
    wantedFollowers.add(handle);
    askFollowsYou([handle]);
  }, [handle, known]);
  const followsYou = useSyncExternalStore(
    subscribe,
    () => (state.followsYouKnown.has(handle) ? state.followsYou.has(handle) : undefined),
    () => undefined,
  );
  return known ?? followsYou;
}

/** Someone's follower count, moved by the viewer's own follow. */
export function useFollowerCount(handle: string, rendered: number) {
  return useCount(followKey(handle), rendered);
}

/** Whether the viewer liked a post, its count, and a toggle that sends visitors to sign in. */
export function useLike(postId: string, rendered: number) {
  const key = likeKey(postId);
  useEffect(() => {
    wanted.add(postId);
    askLikes([postId]);
  }, [postId]);
  const liked = useSyncExternalStore(
    subscribe,
    () => state.liked.has(postId),
    () => false,
  );
  const count = useCount(key, rendered);
  const signIn = useSignIn();

  function toggle() {
    if (state.viewer === null) return signIn();
    const apply = (on: boolean) => update({ liked: toggled(state.liked, postId, on) });
    void write(key, apply, !liked, () => setLike(postId, !liked), signIn);
  }

  return { liked, count, toggle };
}

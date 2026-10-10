import { useSyncExternalStore } from "react";
import type { Invite } from "@/lib/auth/invites";

/*
 * The sign-up form and the canvas on the desk live in different trees (sheet
 * vs. art column), so they share a tiny store: the canvas signs itself with
 * the handle being typed and pins the inviter's polaroid once a code checks out.
 */

type DeskState = { handle: string; invite: Invite | null; signed: boolean };

const EMPTY: DeskState = { handle: "", invite: null, signed: false };
let state = EMPTY;
const listeners = new Set<() => void>();

export function setDesk(patch: Partial<DeskState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function resetDesk() {
  setDesk(EMPTY);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDesk() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

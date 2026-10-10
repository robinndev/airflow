// Mock social graph until follows are persisted (Phase 2 in the blueprint).
const FOLLOWING: Record<string, string[]> = {
  mira: ["kai", "nadiadraws"],
};

export function getFollowing(handle: string): string[] {
  return FOLLOWING[handle] ?? [];
}

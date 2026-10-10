import { cookies } from "next/headers";

export const PREVIEW_AS_VISITOR_COOKIE = "artiflow-preview-visitor";
/** Set by "Sign out", cleared by signing in or up (see src/app/(auth)/actions.ts). */
export const SIGNED_OUT_COOKIE = "artiflow-signed-out";

/** The demo account everyone is "signed in" as until real auth exists. */
const DEMO_VIEWER_HANDLE = "mira";

export type Viewer = { handle: string };

/**
 * Placeholder for real auth. Reads cookies so you can sign out, and so owners
 * can preview their profile the way visitors see it. Must be called inside
 * <Suspense>.
 */
export async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  if (store.get(SIGNED_OUT_COOKIE)?.value === "1") return null;
  if (store.get(PREVIEW_AS_VISITOR_COOKIE)?.value === "1") return null;
  return { handle: DEMO_VIEWER_HANDLE };
}

export async function isPreviewingAsVisitor() {
  const store = await cookies();
  return store.get(PREVIEW_AS_VISITOR_COOKIE)?.value === "1";
}

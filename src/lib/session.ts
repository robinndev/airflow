import { cookies } from "next/headers";

export const PREVIEW_AS_VISITOR_COOKIE = "artiflow-preview-visitor";

/** The demo account everyone is "signed in" as until real auth exists. */
const DEMO_VIEWER_HANDLE = "mira";

export type Viewer = { handle: string };

/**
 * Placeholder for real auth. Reads a cookie so owners can preview their
 * profile the way visitors see it. Must be called inside <Suspense>.
 */
export async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  if (store.get(PREVIEW_AS_VISITOR_COOKIE)?.value === "1") return null;
  return { handle: DEMO_VIEWER_HANDLE };
}

export async function isPreviewingAsVisitor() {
  const store = await cookies();
  return store.get(PREVIEW_AS_VISITOR_COOKIE)?.value === "1";
}

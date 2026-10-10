import { normalizeHandleInput } from "@/lib/auth/handles";
import { defaultSvg } from "@/lib/profile/default-art";

/** /defaults/avatar/<handle>.svg and /defaults/banner/<handle>.svg (see default-art.ts). */
export async function GET(_request: Request, { params }: RouteContext<"/defaults/[kind]/[file]">) {
  const { kind, file } = await params;
  const handle = normalizeHandleInput(decodeURIComponent(file).replace(/\.svg$/, "")).slice(0, 32);
  if ((kind !== "avatar" && kind !== "banner") || !handle) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(defaultSvg(kind, handle), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}

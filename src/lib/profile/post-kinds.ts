import type { PostKind } from "./types";

export const POST_KINDS: Record<PostKind, { label: string; className: string }> = {
  finished: { label: "Finished piece", className: "bg-ocean/10 text-ocean-ink" },
  wip: { label: "WIP", className: "bg-lilac/12 text-lilac-ink" },
  sketch: { label: "Sketch", className: "bg-sky/15 text-sky-ink" },
  update: { label: "Update", className: "bg-mint/15 text-mint-ink" },
};

export const POST_KIND_ORDER: PostKind[] = ["finished", "wip", "sketch", "update"];

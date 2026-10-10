import type { PostKind } from "./types";

export const POST_KINDS: Record<PostKind, { label: string; className: string }> = {
  finished: { label: "Finished piece", className: "bg-ocean/10 text-[#0670d0]" },
  wip: { label: "WIP", className: "bg-lilac/12 text-[#5d54d6]" },
  sketch: { label: "Sketch", className: "bg-sky/15 text-[#0b6a96]" },
  update: { label: "Update", className: "bg-mint/15 text-[#0b6f7a]" },
};

export const POST_KIND_ORDER: PostKind[] = ["finished", "wip", "sketch", "update"];

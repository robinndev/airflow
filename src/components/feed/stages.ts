import { Frame, Layers, NotebookPen, Pencil, type LucideIcon } from "lucide-react";
import type { PostKind } from "@/lib/profile/types";

/** Where a piece is in its life: sketch → WIP → finished. Updates are studio notes. */
export const STAGES: Record<PostKind, { label: string; filter: string; icon: LucideIcon }> = {
  sketch: { label: "Sketch", filter: "Sketches", icon: Pencil },
  wip: { label: "In progress", filter: "WIPs", icon: Layers },
  finished: { label: "Finished", filter: "Finished", icon: Frame },
  update: { label: "Studio note", filter: "Notes", icon: NotebookPen },
};

/** The process track shown on artwork labels. */
export const PROCESS: PostKind[] = ["sketch", "wip", "finished"];

export const STAGE_FILTERS: PostKind[] = ["finished", "wip", "sketch", "update"];

export function parseStage(value: string | string[] | undefined): PostKind | null {
  return typeof value === "string" && value in STAGES ? (value as PostKind) : null;
}

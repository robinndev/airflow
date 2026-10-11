import { Flag, Hourglass } from "lucide-react";
import { Stamp } from "@/components/explore/stamp";
import { dueState, type Lane, type QueueOrder } from "@/lib/commissions/queue";
import { glowOf } from "@/lib/palette";

/** Each column's color, used on its tape label, its dot and its drop highlight. */
export const LANE_TONE: Record<Lane, { dot: string; outline: string; wash: string; ink: string }> = {
  request: { dot: "bg-lilac", outline: "outline-lilac/60", wash: "bg-lilac/[0.07]", ink: "text-lilac-ink" },
  proposal: { dot: "bg-sky", outline: "outline-sky/70", wash: "bg-sky/[0.08]", ink: "text-sky-ink" },
  queued: { dot: "bg-mint", outline: "outline-mint/70", wash: "bg-mint/[0.08]", ink: "text-mint-ink" },
  wip: { dot: "bg-ocean", outline: "outline-ocean/60", wash: "bg-ocean/[0.06]", ink: "text-ocean-ink" },
  delivered: { dot: "bg-star", outline: "outline-star/70", wash: "bg-star/[0.08]", ink: "text-ink" },
};

/** The washi tape's color: the character's most vivid swatch. */
export const tapeOf = (order: QueueOrder) => glowOf(order.character?.palette ?? order.references[0]?.palette, 1)[0];

/** A slight, stable tilt per ticket, so the wall looks pinned up by hand. */
export function tiltOf(id: string, max = 1.2) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (((h >>> 0) / 4294967296) * 2 - 1) * max;
}

export function PaymentStamp({
  order,
  onPaper = false,
  className = "",
}: {
  order: QueueOrder;
  onPaper?: boolean;
  className?: string;
}) {
  if (order.payment === "paid") {
    return (
      <Stamp tone="mint" onPaper={onPaper} className={className}>
        Paid
      </Stamp>
    );
  }
  if (order.payment === "invoiced") {
    return (
      <Stamp tone="lilac" onPaper={onPaper} className={className}>
        Invoice sent
      </Stamp>
    );
  }
  // Unpaid only matters once work has started.
  if (order.lane === "queued" || order.lane === "wip" || order.lane === "delivered") {
    return (
      <Stamp tone="like" onPaper={onPaper} className={className}>
        Unpaid
      </Stamp>
    );
  }
  return null;
}

// Highlighter pen behind the text: pink when late, yellow when close. Readable on paper in both themes.
const MARKER = {
  late: "bg-like/25 font-bold",
  soon: "bg-star/35 font-bold",
  ok: "",
  done: "",
  none: "",
} as const;

/** When it's due (or expires, or was delivered), marked up the way an artist would on a planner. */
export function DueLabel({ order, today, className = "" }: { order: QueueOrder; today: string; className?: string }) {
  const due = dueState(order, today);
  const Icon = order.lane === "proposal" ? Hourglass : Flag;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <Icon
        aria-hidden
        className={`size-3.5 shrink-0 ${due.tone === "late" ? "fill-like text-like" : due.tone === "soon" ? "text-star" : "opacity-55"}`}
      />
      <span
        className={`truncate rounded-[3px] ${MARKER[due.tone]} ${due.tone === "late" || due.tone === "soon" ? "-mx-1 -rotate-1 px-1" : ""}`}
      >
        {due.label}
      </span>
    </span>
  );
}

/** The character's colors as little paint dots (`ring` matches what they sit on). */
export function Swatches({
  palette,
  ring = "ring-paper",
  className = "",
}: {
  palette: string[];
  ring?: string;
  className?: string;
}) {
  return (
    <span aria-hidden className={`flex -space-x-1 ${className}`}>
      {palette.slice(0, 4).map((hex) => (
        <span key={hex} className={`size-3 rounded-full ring-[1.5px] ${ring}`} style={{ backgroundColor: hex }} />
      ))}
    </span>
  );
}

import type { CommissionStatus } from "@/lib/profile/types";

const styles: Record<CommissionStatus, { label: string; dot: string; pill: string }> = {
  open: {
    label: "Commissions open",
    dot: "bg-mint-dot",
    pill: "bg-mint/12 text-mint-ink",
  },
  waitlist: {
    label: "Waitlist only",
    dot: "bg-lilac",
    pill: "bg-lilac/12 text-lilac-ink",
  },
  closed: {
    label: "Commissions closed",
    dot: "bg-muted",
    pill: "bg-ice text-muted",
  },
};

export function CommissionStatusPill({ status }: { status: CommissionStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.pill}`}
    >
      <span aria-hidden className={`relative flex size-2`}>
        {status === "open" && (
          <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${s.dot}`} />
        )}
        <span className={`relative inline-flex size-2 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}

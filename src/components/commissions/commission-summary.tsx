import { Clock, Star, Users } from "lucide-react";
import { CommissionStatusPill } from "@/components/profile/commission-status-pill";
import type { CommissionSummary as Summary } from "@/lib/profile/types";

export function CommissionSummary({ commissions }: { commissions: Summary }) {
  const slotsLeft = Math.max(0, commissions.slotsTotal - commissions.slotsTaken);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card border border-border bg-surface px-4 py-3 text-sm shadow-soft">
      <CommissionStatusPill status={commissions.status} />
      {commissions.rating && (
        <span className="inline-flex items-center gap-1.5">
          <Star aria-hidden className="size-4 fill-star text-star" />
          <span className="font-semibold text-ink">{commissions.rating.average.toFixed(1)}</span>
          <span className="text-muted">({commissions.rating.count} reviews)</span>
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 text-muted">
        <Clock aria-hidden className="size-4" />
        Usually {commissions.turnaround}
      </span>
      <span className="inline-flex items-center gap-1.5 text-muted">
        <Users aria-hidden className="size-4" />
        {slotsLeft} of {commissions.slotsTotal} slots left
      </span>
    </div>
  );
}

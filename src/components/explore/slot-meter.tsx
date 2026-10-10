/**
 * Commission slots as a row of lights: open slots glow mint, claimed ones are
 * dimmed. Upcoming openings show every slot as an empty ring.
 */
export function SlotMeter({
  total,
  taken,
  upcoming = false,
  className = "",
}: {
  total: number;
  taken: number;
  upcoming?: boolean;
  className?: string;
}) {
  const open = Math.max(0, total - taken);
  const label = upcoming ? `${total} slots` : open === 0 ? "Fully booked" : `${open} of ${total} open`;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`size-3 rounded-full ${
              upcoming
                ? "ring-[1.5px] ring-lilac/70 ring-inset"
                : i < taken
                  ? "bg-ink/15"
                  : "bg-mint-strong shadow-[0_0_0_3px_color-mix(in_oklab,var(--mint)_22%,transparent)]"
            }`}
          />
        ))}
      </span>
      <span className="text-sm font-semibold whitespace-nowrap text-ink">{label}</span>
    </span>
  );
}

import { Check, Clock, MessageCircle, Sparkles } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { CommissionService, CommissionStatus } from "@/lib/profile/types";
import { CUSTOM_SERVICE_ID } from "./events";
import { ExampleCarousel } from "./example-carousel";
import { buttonClasses } from "@/components/ui/button";
import { OpenServiceButton } from "./open-service-button";
import { SaveButton } from "./save-button";

const row =
  "grid overflow-hidden rounded-panel border bg-surface shadow-soft transition-shadow hover:shadow-lift sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]";

const media = "relative m-2 aspect-[4/3] overflow-hidden rounded-[18px] sm:mr-0 sm:aspect-auto sm:min-h-64";

export function ServiceRow({
  service,
  status,
}: {
  service: CommissionService;
  status: CommissionStatus;
}) {
  return (
    <article className={`${row} border-border`}>
      <div className={`${media} bg-ice`}>
        <ExampleCarousel images={service.examples} title={service.title} serviceId={service.id} />
        {service.popular && (
          <span className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-scrim/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Sparkles aria-hidden className="size-3.5 text-mint" />
            Most popular
          </span>
        )}
      </div>

      <div className="flex flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl leading-snug font-extrabold text-ink">
            <OpenServiceButton
              serviceId={service.id}
              className="text-left decoration-2 underline-offset-4 hover:underline"
            >
              {service.title}
            </OpenServiceButton>
          </h3>
          <SaveButton serviceId={service.id} title={service.title} />
        </div>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-display text-lg font-bold text-ink">
            from {formatUsd(service.priceFromUsd)}
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock aria-hidden className="size-3.5" />
            {service.turnaround}
          </span>
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{service.description}</p>

        <ul aria-label="Includes" className="mt-4 flex flex-wrap gap-1.5">
          {service.includes.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-ice px-2.5 py-1 text-xs font-medium text-ink/85"
            >
              <Check aria-hidden className="size-3 text-mint-strong" />
              {item}
            </li>
          ))}
        </ul>

        <RowActions serviceId={service.id} status={status} askLabel={`Ask about ${service.title}`} />
      </div>
    </article>
  );
}

/** "Custom piece" sits in the same list, styled as the open-ended option. */
export function CustomServiceRow({
  artistName,
  status,
}: {
  artistName: string;
  status: CommissionStatus;
}) {
  return (
    <article className={`${row} border-dashed border-lilac/45`}>
      <div
        className={`${media} grid place-items-center bg-gradient-to-br from-lilac/15 via-sky/10 to-mint/15`}
      >
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <span className="grid size-14 place-items-center rounded-[18px] bg-surface text-lilac-ink shadow-soft">
            <Sparkles aria-hidden className="size-6" />
          </span>
          <span className="font-display text-sm font-bold text-ink/70">Your idea here</span>
        </div>
      </div>

      <div className="flex flex-col p-5 sm:p-6">
        <h3 className="font-display text-xl leading-snug font-extrabold text-ink">Custom piece</h3>
        <p className="mt-1 font-display text-lg font-bold text-lilac-ink">You set the budget</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Something that doesn&apos;t fit a service? Describe it and {artistName.split(" ")[0]}{" "}
          will send you a custom quote.
        </p>
        <ul aria-label="Includes" className="mt-4 flex flex-wrap gap-1.5">
          {["Any format", "Personal or commercial", "Quote before paying"].map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-lilac/10 px-2.5 py-1 text-xs font-medium text-ink/85"
            >
              <Check aria-hidden className="size-3 text-lilac-ink" />
              {item}
            </li>
          ))}
        </ul>

        <RowActions
          serviceId={CUSTOM_SERVICE_ID}
          status={status}
          askLabel="Ask about a custom piece"
          label="Request custom"
        />
      </div>
    </article>
  );
}

function RowActions({
  serviceId,
  status,
  askLabel,
  label,
}: {
  serviceId: string;
  status: CommissionStatus;
  askLabel: string;
  label?: string;
}) {
  return (
    <div className="mt-auto flex items-center gap-2 pt-5">
      {status === "closed" ? (
        <p className="flex-1 text-sm text-muted">Commissions are closed right now.</p>
      ) : (
        <OpenServiceButton serviceId={serviceId} className={buttonClasses({ className: "flex-1" })}>
          {status === "waitlist" ? "Join waitlist" : (label ?? "Request")}
        </OpenServiceButton>
      )}
      <button
        type="button"
        aria-label={askLabel}
        title="Ask a question"
        className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-ink transition-colors hover:bg-ice"
      >
        <MessageCircle aria-hidden className="size-[1.125rem]" />
      </button>
    </div>
  );
}

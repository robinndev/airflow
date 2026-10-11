import { Fragment } from "react";
import { isClosed, STOP_LABEL, STOPS, stampOf, stopOf, type MyRequest } from "@/lib/commissions/requests";
import { formatShortDate } from "@/lib/format";

/**
 * The parcel's route: Sent → Quote → Paid → In the works → Delivered. Stops
 * it reached are inked with their date; the road ahead is pencilled dashes.
 * A closed request ends where it stopped, crossed out.
 */
export function RouteLine({ request }: { request: MyRequest }) {
  const at = STOPS.indexOf(stopOf(request));
  const closed = isClosed(request);

  return (
    <ol aria-label="Progress" className="flex items-start">
      {STOPS.map((stop, i) => {
        const reached = i <= at;
        const current = i === at;
        const stamped = stampOf(request, stop);
        return (
          <Fragment key={stop}>
            {i > 0 && (
              <li aria-hidden className="mt-[0.5625rem] h-0 min-w-2 flex-1">
                <span
                  className={`block border-t-2 ${i <= at ? "border-solid border-on-paper/55" : "border-dashed border-on-paper/15"}`}
                />
              </li>
            )}
            <li
              aria-current={current ? "step" : undefined}
              className="flex w-14 shrink-0 flex-col items-center text-center sm:w-16"
            >
              <span
                className={`relative grid size-5 place-items-center rounded-full ${
                  current
                    ? closed
                      ? "bg-like/20 ring-2 ring-like"
                      : "bg-ocean ring-4 ring-ocean/20"
                    : reached
                      ? "bg-on-paper/70"
                      : "border-2 border-dashed border-on-paper/20"
                }`}
              >
                {current && !closed && request.status !== "delivered" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-ocean/40 [animation-duration:2.4s]" />
                )}
                {current && closed && <span className="text-[0.6875rem] leading-none font-black text-like">✕</span>}
              </span>
              <span className={`mt-1.5 text-[0.6875rem] leading-tight font-semibold ${reached ? "text-on-paper" : "text-paper-muted"}`}>
                {STOP_LABEL[stop]}
              </span>
              <span className="text-[0.625rem] leading-tight text-paper-muted tabular-nums">
                {stamped ? formatShortDate(stamped) : " "}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

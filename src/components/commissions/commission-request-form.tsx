"use client";

import { CircleCheck, LoaderCircle, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { useViewerId } from "@/components/favorites/store";
import { submitCommissionRequest, type RequestSent } from "@/app/(site)/[handle]/actions";
import { buttonClasses } from "@/components/ui/button";
import { extrasUsd, pickOptions, type Option } from "@/lib/commissions/addons";
import { formatUsd, formatUsdExact } from "@/lib/format";
import type { CommissionBudget, CommissionStatus, CommissionUsage } from "@/lib/profile/types";
import { OptionsPicker } from "./addon-picker";
import { CUSTOM_SERVICE_ID } from "./events";

type ServiceOption = { id: string; title: string; priceFromUsd: number };

type CommissionRequestFormProps = {
  handle: string;
  artistName: string;
  status: CommissionStatus;
  services: ServiceOption[];
  serviceId: string;
  onServiceChange: (id: string) => void;
  /** The chosen service's licenses and add-ons (included ones come ticked), and which the buyer ticked. */
  options?: Option[];
  addonIds?: string[];
  onAddonsChange?: (ids: string[]) => void;
  onDone: () => void;
  /** Hide the service picker when the request starts from a specific service. */
  lockService?: boolean;
  /** Terms were already accepted in the service details view. */
  termsAccepted?: boolean;
  /** The package picked in the details view, and its price (add-on percentages apply to it). */
  packageId?: string;
  packagePrice?: number;
  /** The artist wrote terms of service (otherwise the buyer agrees to Artiflow's rules). */
  hasTerms?: boolean;
};

const CUSTOM = CUSTOM_SERVICE_ID;
const MAX_LENGTH = 2000;

const BUDGETS: { value: CommissionBudget; label: string }[] = [
  { value: "under-50", label: "Under $50" },
  { value: "50-150", label: "$50–150" },
  { value: "150-300", label: "$150–300" },
  { value: "300-plus", label: "$300+" },
];

const USAGES: { value: CommissionUsage; label: string; hint: string }[] = [
  { value: "personal", label: "Personal", hint: "Avatars, gifts, your own socials" },
  { value: "commercial", label: "Commercial", hint: "Merch, games, ads — extra license fee" },
];

const field =
  "w-full rounded-input border border-border bg-surface px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-ocean";
const label = "block text-sm font-semibold text-ink";

/** Lives inside RequestDialog, which owns the selected service and remounts it per request. */
export function CommissionRequestForm({
  handle,
  artistName,
  status,
  services,
  serviceId,
  onServiceChange,
  options = [],
  addonIds = [],
  onAddonsChange = () => {},
  onDone,
  lockService = false,
  termsAccepted = false,
  packageId,
  packagePrice,
  hasTerms = true,
}: CommissionRequestFormProps) {
  const id = useId();
  const viewer = useViewerId();
  const pathname = usePathname();
  const firstName = artistName.split(" ")[0];
  const [usage, setUsage] = useState<CommissionUsage>("personal");
  const [budget, setBudget] = useState<CommissionBudget | null>(null);
  const [description, setDescription] = useState("");
  // Controlled so a failed submit (React resets forms after actions) keeps them.
  const [deadline, setDeadline] = useState("");
  const [references, setReferences] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [state, formAction, pending] = useActionState(
    (prev: RequestSent | null, formData: FormData) =>
      submitCommissionRequest(handle, prev, formData),
    null,
  );

  const isCustom = serviceId === CUSTOM;
  const selected = services.find((s) => s.id === serviceId);
  const isWaitlist = status === "waitlist";
  const base = packagePrice ?? selected?.priceFromUsd ?? 0;
  const extra = selected ? extrasUsd(pickOptions(options, addonIds), base) : 0;

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-full bg-mint/15 text-mint-strong">
          <CircleCheck aria-hidden className="size-7" />
        </span>
        <p className="mt-4 font-display text-xl font-extrabold text-ink">
          {state.waitlisted ? "You're on the waitlist!" : "Request sent!"}
        </p>
        <p className="mt-1.5 max-w-sm text-sm text-muted">
          {firstName} will review it and send you a quote. You&apos;ll get a notification — nothing
          is charged until you accept.
        </p>
        <button
          type="button"
          onClick={onDone}
          className={buttonClasses({ variant: "secondary", size: "sm", className: "mt-6" })}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-6 p-5 sm:p-6">
      {lockService && <input type="hidden" name="serviceId" value={serviceId} />}
      {packageId && <input type="hidden" name="packageId" value={packageId} />}
      <fieldset hidden={lockService}>
        <legend className={label}>What would you like?</legend>
        <div className="mt-2.5 grid gap-2">
          {[...services, { id: CUSTOM, title: "Custom piece", priceFromUsd: 0 }].map((option) => {
            const active = serviceId === option.id;
            const custom = option.id === CUSTOM;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ocean ${
                  active ? "border-ocean bg-ice/70" : "border-border bg-surface hover:bg-ice/40"
                }`}
              >
                <input
                  type="radio"
                  name={lockService ? undefined : "serviceId"}
                  value={option.id}
                  checked={active}
                  onChange={() => onServiceChange(option.id)}
                  className="sr-only"
                />
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`grid size-4 shrink-0 place-items-center rounded-full border-2 ${
                      active ? "border-ocean" : "border-border"
                    }`}
                  >
                    {active && <span className="size-1.5 rounded-full bg-ocean" />}
                  </span>
                  <span className="truncate text-sm font-semibold text-ink">
                    {custom && <Sparkles aria-hidden className="mr-1 inline size-3.5 text-lilac" />}
                    {option.title}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {custom ? "You set the budget" : `from ${formatUsd(option.priceFromUsd)}`}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>


      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${id}-description`} className={label}>
            Describe your idea
          </label>
          <span className="text-xs text-muted tabular-nums">
            {description.length}/{MAX_LENGTH}
          </span>
        </div>
        <textarea
          id={`${id}-description`}
          name="description"
          required
          minLength={20}
          maxLength={MAX_LENGTH}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            isCustom
              ? "What do you have in mind? Characters, format, where it'll be used…"
              : "Character(s), pose, expression, mood, colors… the more detail the better."
          }
          className={`${field} mt-2 resize-y py-3 leading-relaxed`}
        />
      </div>

      {isCustom && (
        <fieldset>
          <legend className={label}>Budget</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {BUDGETS.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="budget"
                  value={option.value}
                  checked={budget === option.value}
                  onChange={() => setBudget(option.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-sm font-medium text-ink transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-on-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ocean hover:bg-ice">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* A service lists its licenses with the add-ons (the server works out the usage); a custom piece asks. */}
      {!isCustom && options.length > 0 ? (
        <OptionsPicker options={options} selected={addonIds} onChange={onAddonsChange} />
      ) : (
        <fieldset>
          <legend className={label}>How will you use it?</legend>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {USAGES.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-[12px] border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ocean ${
                  usage === option.value ? "border-ocean bg-ice/70" : "border-border hover:bg-ice/40"
                }`}
              >
                <input
                  type="radio"
                  name="usage"
                  value={option.value}
                  checked={usage === option.value}
                  onChange={() => setUsage(option.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="block text-xs text-muted">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-6 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <div>
          <label htmlFor={`${id}-deadline`} className={label}>
            Deadline <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${id}-deadline`}
            type="date"
            name="deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`${field} mt-2 h-11`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-references`} className={label}>
            References <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${id}-references`}
            name="references"
            value={references}
            onChange={(e) => setReferences(e.target.value)}
            maxLength={1000}
            placeholder="Links to your OC's ref sheet, Toyhouse, Pinterest…"
            className={`${field} mt-2 h-11`}
          />
        </div>
      </div>

      {termsAccepted ? (
        <input type="hidden" name="acceptedTerms" value="on" />
      ) : (
        <label className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-ice/60 px-3.5 py-3 text-sm text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ocean">
          <input
            type="checkbox"
            name="acceptedTerms"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-ocean"
          />
          <span>
            {hasTerms
              ? <>I&apos;ve read the service details and accept {firstName}&apos;s terms of service.</>
              : <>I&apos;ve read the service details and agree to Artiflow&apos;s commission rules.</>}
          </span>
        </label>
      )}

      <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="text-ink">
            {selected ? (
              <>
                Estimated{" "}
                <span className="font-display font-extrabold">from {formatUsdExact(base + extra)}</span>
                {extra > 0 && <span className="text-muted"> incl. {formatUsdExact(extra)} in extras</span>}
              </>
            ) : (
              <span className="font-semibold">Custom quote</span>
            )}
          </p>
          <p className="text-xs text-muted">Nothing is charged now — {firstName} sends a final quote first.</p>
        </div>
        {viewer === null ? (
          // Visitors (a custom piece opens straight on the form): requests live in an account.
          <Link
            href={`/sign-in?next=${encodeURIComponent(`${pathname}#${serviceId}`)}`}
            className={buttonClasses({ className: "sm:min-w-44" })}
          >
            Sign in to send
          </Link>
        ) : (
          <button type="submit" disabled={pending} className={buttonClasses({ className: "sm:min-w-44" })}>
            {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Send aria-hidden />}
            {pending ? "Sending…" : isWaitlist ? "Join waitlist" : "Send request"}
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="-mt-3 text-sm text-danger empty:hidden">
        {state && !state.ok ? state.error : null}
      </p>
    </form>
  );
}

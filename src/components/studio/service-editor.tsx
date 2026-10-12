"use client";

import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { saveService } from "@/app/(site)/studio/actions";
import { showToast } from "@/components/favorites/toast-events";
import { ServiceSheet } from "@/components/listings/service-sheet";
import { buttonClasses } from "@/components/ui/button";
import { LICENSES } from "@/lib/commissions/addons";
import {
  LIMITS,
  MAX_STYLES,
  SERVICE_CATEGORIES,
  SERVICE_INCLUDES,
  STYLES,
  priceFrom,
  sortPackages,
  turnaroundLabel,
  type ServiceCategory,
  type StyleTag,
} from "@/lib/listings/catalog";
import { classicLadder, serviceInputOf, slugId, type ServiceDraft } from "@/lib/listings/editable";
import { serviceInput } from "@/lib/listings/schema";
import type { AddonPrice, CommissionService, ImageAsset, UsageRights } from "@/lib/profile/types";
import { Block, ChipInput, Field, MoneyInput, Segmented, inputClass } from "./fields";
import { ListingImages } from "./listing-images";

type Artist = { handle: string; name: string; avatar: ImageAsset };

const STATUS_OPTIONS = [
  { value: "open" as const, label: "Open", dot: "bg-mint-dot" },
  { value: "waitlist" as const, label: "Waitlist", dot: "bg-lilac" },
  { value: "closed" as const, label: "Closed", dot: "bg-muted" },
];

/**
 * Making or editing a commission service: the form on the left, the sheet
 * buyers will see on the right, updating as you type. Packages are the steps
 * of the same piece (sketch → lineart → full color); slots cap how many
 * requests it takes before it switches to Waitlist or Closed.
 */
export function ServiceEditor({
  draft: initial,
  taken = 0,
  artist,
  onClose,
}: {
  draft: ServiceDraft | null;
  /** Slots already taken (editing). */
  taken?: number;
  artist: Artist;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<ServiceDraft | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const titleId = useId();

  // A new listing to edit starts a fresh draft (set during render, not in an effect).
  const [shownFor, setShownFor] = useState(initial);
  if (initial !== shownFor) {
    setShownFor(initial);
    setDraft(initial);
    setError(null);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (initial && !dialog?.open) dialog?.showModal();
    if (!initial && dialog?.open) dialog.close();
  }, [initial]);

  const set = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  function save() {
    if (!draft) return;
    const input = serviceInputOf(draft);
    const check = serviceInput.safeParse(input);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Something's missing.");
    setError(null);
    startSaving(async () => {
      const result = await saveService(input);
      if (!result.ok) return setError(result.error);
      showToast({ message: draft.id ? "Service saved" : "Service listed. It's on your profile and in search." });
      onClose();
    });
  }

  const preview = draft && previewOf(draft, artist.handle, taken);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (saving) e.preventDefault();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-canvas p-0 text-ink outline-none backdrop:bg-scrim/55 backdrop:backdrop-blur-[2px] open:flex sm:m-auto sm:h-[min(60rem,calc(100dvh-3rem))] sm:w-[min(76rem,calc(100vw-3rem))] sm:rounded-[28px] sm:shadow-lift"
    >
      {draft && preview && (
        <div className="flex min-h-0 w-full flex-col">
          <header className="flex items-center gap-3 border-b border-border bg-surface px-5 py-3.5 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-muted uppercase">Made to order</p>
              <h2 id={titleId} className="truncate font-display text-xl font-extrabold">
                {draft.id ? `Edit ${draft.title || "service"}` : "New commission service"}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-ice hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid-cols-[minmax(0,1fr)_23rem] lg:overflow-hidden">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="grid content-start gap-8 bg-surface px-5 py-6 sm:px-8 lg:overflow-y-auto lg:overscroll-contain"
            >
              <Block title="Your work" note="The first picture is the cover. Up to 6.">
                <ListingImages
                  label="Examples"
                  value={draft.examples}
                  onChange={(examples) => set("examples", examples)}
                  max={LIMITS.examples}
                />
              </Block>

              <Block title="The basics">
                <Field label="Name" htmlFor={`${titleId}-name`}>
                  <input
                    id={`${titleId}-name`}
                    value={draft.title}
                    maxLength={80}
                    placeholder="Fursona headshot, Half-body illustration…"
                    onChange={(e) => set("title", e.target.value)}
                    className={`${inputClass} h-11 text-base`}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Category" htmlFor={`${titleId}-category`}>
                    <select
                      id={`${titleId}-category`}
                      value={draft.category}
                      onChange={(e) => set("category", e.target.value as ServiceCategory)}
                      className={`${inputClass} h-10`}
                    >
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Turnaround value={draft.turnaround} onChange={(t) => set("turnaround", t)} />
                </div>
                <Field label="Style" hint={`Up to ${MAX_STYLES}. Buyers filter by it.`}>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLES.map((style) => {
                      const on = draft.styles.includes(style.id);
                      const full = !on && draft.styles.length >= MAX_STYLES;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          aria-pressed={on}
                          disabled={full}
                          onClick={() =>
                            set("styles", on ? draft.styles.filter((s) => s !== style.id) : ([...draft.styles, style.id] as StyleTag[]))
                          }
                          className="inline-flex h-8 items-center rounded-full border border-border px-3 text-sm font-medium text-ink transition-colors hover:bg-ice disabled:opacity-40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink"
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Description" htmlFor={`${titleId}-description`} hint="What it is, what you love drawing, what you won't draw.">
                  <textarea
                    id={`${titleId}-description`}
                    value={draft.description}
                    maxLength={2000}
                    rows={4}
                    onChange={(e) => set("description", e.target.value)}
                    className={`${inputClass} resize-y py-2.5 leading-relaxed`}
                  />
                </Field>
              </Block>

              <Block title="Packages" note="Steps of the same piece. Buyers pick one.">
                <Packages draft={draft} onChange={(packages) => set("packages", packages)} />
                <Field label="Every package includes">
                  <ChipInput
                    label="Every package includes"
                    value={draft.includes}
                    onChange={(includes) => set("includes", includes)}
                    suggestions={SERVICE_INCLUDES}
                  />
                </Field>
              </Block>

              <Block title="Slots" note="A slot is taken when a request arrives, and comes back if you decline it.">
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.slotsTotal !== null}
                    onChange={(e) => set("slotsTotal", e.target.checked ? 5 : null)}
                    className="size-4 accent-ocean"
                  />
                  Limit how many requests I take
                </label>
                {draft.slotsTotal !== null && (
                  <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <Field label="Slots" htmlFor={`${titleId}-slots`}>
                      <input
                        id={`${titleId}-slots`}
                        type="number"
                        min={1}
                        max={LIMITS.slots}
                        value={draft.slotsTotal}
                        onChange={(e) => set("slotsTotal", Math.max(1, Math.min(LIMITS.slots, Number(e.target.value) || 1)))}
                        className={`${inputClass} h-10 tabular-nums`}
                      />
                    </Field>
                    <Field label="When they run out">
                      <Segmented
                        label="When the slots run out"
                        value={draft.whenFull}
                        onChange={(whenFull) => set("whenFull", whenFull)}
                        options={[
                          { value: "waitlist", label: "Switch to waitlist", dot: "bg-lilac" },
                          { value: "closed", label: "Close it", dot: "bg-muted" },
                        ]}
                      />
                    </Field>
                  </div>
                )}
              </Block>

              <Block title="Licenses" note="Included ones come ticked; extras are added to the price.">
                <Licenses value={draft.usage} onChange={(usage) => set("usage", usage)} />
              </Block>

              <Block title="Add-ons" note="Optional extras buyers can tick, like +$10 shading.">
                <Addons value={draft.addons} onChange={(addons) => set("addons", addons)} />
              </Block>

              <button type="submit" hidden />
            </form>

            <aside aria-label="Preview" className="border-t border-border bg-canvas px-5 py-6 sm:px-8 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:px-6">
              <p className="mb-5 text-[0.6875rem] font-bold tracking-[0.14em] text-muted uppercase">How buyers see it</p>
              <ServiceSheet
                service={preview}
                status={draft.status}
                slots={preview.slots ?? null}
                artist={artist}
                action={
                  <span className={buttonClasses({ size: "sm", className: "pointer-events-none" })}>
                    {draft.status === "waitlist" ? "Join waitlist" : draft.status === "closed" ? "Notify me" : "Request"}
                  </span>
                }
              />
              {preview.addons && preview.addons.length > 0 && (
                <p className="mt-4 text-xs text-muted">
                  Add-ons: {preview.addons.map((a) => a.label).join(" · ")}
                </p>
              )}
            </aside>
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-surface px-5 py-3.5 sm:px-6">
            <Segmented label="Status" value={draft.status} onChange={(status) => set("status", status)} options={STATUS_OPTIONS} />
            <p role="status" aria-live="polite" className="min-w-0 flex-1 text-sm text-danger empty:hidden">
              {error}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClasses({ variant: "ghost" })}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className={buttonClasses({ className: "min-w-32" })}>
                {saving && <LoaderCircle aria-hidden className="animate-spin" />}
                {saving ? "Saving…" : draft.id ? "Save changes" : "List it"}
              </button>
            </div>
          </footer>
        </div>
      )}
    </dialog>
  );
}

function previewOf(draft: ServiceDraft, ownerHandle: string, taken: number): CommissionService {
  const packages = sortPackages(draft.packages.filter((p) => p.label.trim() || p.priceUsd));
  return {
    id: draft.id ?? "preview",
    ownerHandle,
    category: draft.category,
    styles: draft.styles,
    title: draft.title,
    usage: draft.usage as UsageRights,
    description: draft.description,
    priceFromUsd: priceFrom(packages),
    turnaround: turnaroundLabel(draft.turnaround),
    turnaroundDays: draft.turnaround,
    includes: draft.includes,
    examples: draft.examples.map((e) => ({ src: e.src, alt: "", width: e.width, height: e.height, palette: e.palette })),
    addons: draft.addons as CommissionService["addons"],
    packages: packages.length > 1 ? packages : undefined,
    status: draft.status,
    slots: draft.slotsTotal ? { total: draft.slotsTotal, taken: Math.min(taken, draft.slotsTotal) } : null,
  };
}

/** "Delivered in 5 to 7 days" — days or weeks, stored as days. */
function Turnaround({ value, onChange }: { value: { min: number; max: number }; onChange: (v: { min: number; max: number }) => void }) {
  const id = useId();
  const [unit, setUnit] = useState<1 | 7>(value.min % 7 === 0 && value.max % 7 === 0 ? 7 : 1);
  const show = (days: number) => Math.max(1, Math.round(days / unit));
  const update = (key: "min" | "max", n: number) => {
    const days = Math.max(1, Math.min(LIMITS.turnaroundDays.max, Math.round(n) * unit));
    const next = { ...value, [key]: days };
    if (key === "min" && next.max < days) next.max = days;
    if (key === "max" && next.min > days) next.min = days;
    onChange(next);
  };
  return (
    <Field label="Turnaround" hint={`Shown as “${turnaroundLabel(value)}”.`} htmlFor={`${id}-min`}>
      <div className="flex items-center gap-2 text-sm text-muted">
        <input
          id={`${id}-min`}
          type="number"
          min={1}
          aria-label="Shortest"
          value={show(value.min)}
          onChange={(e) => update("min", Number(e.target.value) || 1)}
          className={`${inputClass} h-10 w-16 tabular-nums`}
        />
        to
        <input
          type="number"
          min={1}
          aria-label="Longest"
          value={show(value.max)}
          onChange={(e) => update("max", Number(e.target.value) || 1)}
          className={`${inputClass} h-10 w-16 tabular-nums`}
        />
        <select
          aria-label="Unit"
          value={unit}
          onChange={(e) => {
            const next = Number(e.target.value) as 1 | 7;
            setUnit(next);
            onChange({ min: Math.max(1, Math.round(value.min / unit)) * next, max: Math.max(1, Math.round(value.max / unit)) * next });
          }}
          className={`${inputClass} h-10 w-auto`}
        >
          <option value={1}>days</option>
          <option value={7}>weeks</option>
        </select>
      </div>
    </Field>
  );
}

function Packages({ draft, onChange }: { draft: ServiceDraft; onChange: (packages: ServiceDraft["packages"]) => void }) {
  const packages = draft.packages;
  const update = (i: number, patch: Partial<ServiceDraft["packages"][number]>) =>
    onChange(packages.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...packages];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      <ol className="grid gap-3">
        {packages.map((p, i) => (
          <li key={p.id} className="rounded-[16px] border border-border bg-canvas p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-paper font-display text-xs font-extrabold text-on-paper shadow-soft">
                {i + 1}
              </span>
              <input
                aria-label={`Package ${i + 1} name`}
                value={p.label}
                maxLength={40}
                placeholder="Sketch, Lineart, Full color…"
                onChange={(e) => update(i, { label: e.target.value })}
                className={`${inputClass} h-10 min-w-36 flex-1 font-semibold`}
              />
              <MoneyInput label={`Package ${i + 1} price`} value={p.priceUsd} onChange={(priceUsd) => update(i, { priceUsd })} className="w-28" />
              <div className="flex items-center">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-ice disabled:opacity-30">
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label="Move down" disabled={i === packages.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-ice disabled:opacity-30">
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove package ${i + 1}`}
                  disabled={packages.length === 1}
                  onClick={() => onChange(packages.filter((_, j) => j !== i))}
                  className="grid size-8 place-items-center rounded-full text-muted hover:bg-ice hover:text-danger disabled:opacity-30"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-2.5 pl-9">
              <ChipInput
                label={`What ${p.label || `package ${i + 1}`} adds`}
                value={p.includes}
                onChange={(includes) => update(i, { includes })}
                placeholder="What this one adds (Enter to add)"
              />
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {packages.length < LIMITS.packages && (
          <button
            type="button"
            onClick={() =>
              onChange([
                ...packages,
                { id: slugId(`package-${packages.length + 1}`, packages.map((p) => p.id)), label: "", priceUsd: Math.max(...packages.map((p) => p.priceUsd)) + 10, includes: [] },
              ])
            }
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <Plus aria-hidden />
            Add a package
          </button>
        )}
        {packages.length === 1 && (
          <button type="button" onClick={() => onChange(classicLadder(draft))} className={buttonClasses({ variant: "soft", size: "sm" })}>
            <Wand2 aria-hidden />
            Use Sketch · Lineart · Full color
          </button>
        )}
      </div>
    </div>
  );
}

const PRICE_KINDS = [
  { value: "included", label: "Included" },
  { value: "fixed", label: "Extra $" },
  { value: "percent", label: "Extra %" },
  { value: "none", label: "Not offered" },
] as const;

function PriceKind({
  value,
  onChange,
  label,
  allowNone,
}: {
  value: AddonPrice | null;
  onChange: (price: AddonPrice | null) => void;
  label: string;
  allowNone: boolean;
}) {
  const kind = value?.kind ?? "none";
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`${label}: how it's priced`}
        value={kind}
        onChange={(e) => {
          const next = e.target.value;
          onChange(
            next === "none" ? null : next === "included" ? { kind: "included" } : next === "fixed" ? { kind: "fixed", usd: 10 } : { kind: "percent", percent: 50 },
          );
        }}
        className={`${inputClass} h-9 w-auto`}
      >
        {PRICE_KINDS.filter((k) => allowNone || k.value !== "none").map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      {value?.kind === "fixed" && (
        <MoneyInput label={`${label} price`} value={value.usd} onChange={(usd) => onChange({ kind: "fixed", usd })} className="w-24" />
      )}
      {value?.kind === "percent" && (
        <span className="relative">
          <input
            aria-label={`${label} share of the price`}
            type="number"
            min={1}
            max={500}
            value={value.percent}
            onChange={(e) => onChange({ kind: "percent", percent: Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 1))) })}
            className={`${inputClass} h-9 w-24 pr-7 tabular-nums`}
          />
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
            %
          </span>
        </span>
      )}
    </div>
  );
}

function Licenses({ value, onChange }: { value: ServiceDraft["usage"]; onChange: (usage: ServiceDraft["usage"]) => void }) {
  return (
    <ul className="grid gap-2">
      {LICENSES.map((license) => (
        <li key={license.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[14px] border border-border px-3.5 py-2.5">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{license.label}</span>
            <span className="block text-xs text-muted">{license.hint}</span>
          </span>
          <PriceKind
            label={license.label}
            allowNone
            value={(value[license.key] as AddonPrice | null) ?? null}
            onChange={(price) => onChange({ ...value, [license.key]: price })}
          />
        </li>
      ))}
    </ul>
  );
}

function Addons({ value, onChange }: { value: ServiceDraft["addons"]; onChange: (addons: ServiceDraft["addons"]) => void }) {
  const update = (i: number, patch: Partial<ServiceDraft["addons"][number]>) => onChange(value.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <div className="grid gap-3">
      {value.length > 0 && (
        <ul className="grid gap-2">
          {value.map((addon, i) => (
            <li key={addon.id} className="flex flex-wrap items-center gap-2 rounded-[14px] border border-border px-3 py-2.5">
              <input
                aria-label={`Add-on ${i + 1} name`}
                value={addon.label}
                maxLength={40}
                placeholder="Full shading, Extra character…"
                onChange={(e) => update(i, { label: e.target.value })}
                className={`${inputClass} h-9 min-w-40 flex-1`}
              />
              <PriceKind
                label={addon.label || `Add-on ${i + 1}`}
                allowNone={false}
                value={addon.price as AddonPrice}
                onChange={(price) => price && update(i, { price })}
              />
              <button
                type="button"
                aria-label={`Remove ${addon.label || `add-on ${i + 1}`}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="grid size-8 place-items-center rounded-full text-muted hover:bg-ice hover:text-danger"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < LIMITS.addons && (
        <button
          type="button"
          onClick={() => onChange([...value, { id: slugId(`extra-${value.length + 1}`, value.map((a) => a.id)), label: "", price: { kind: "fixed", usd: 10 } }])}
          className={buttonClasses({ variant: "secondary", size: "sm", className: "justify-self-start" })}
        >
          <Plus aria-hidden />
          Add an extra
        </button>
      )}
    </div>
  );
}

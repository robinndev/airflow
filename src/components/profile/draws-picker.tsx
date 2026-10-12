"use client";

import { Check } from "lucide-react";
import { SPECIALTIES, SUBJECTS, SUBJECT_TAGS, cleanDraws, isSubject, type DrawTag } from "@/lib/profile/draws";

/**
 * "What do you draw?": toggle chips, several (or all) at once. Sign-up asks
 * who you draw; "Edit profile" adds what you make. With `name`, the picks
 * also go out as form fields (one per tag).
 */
export function DrawsPicker({
  value,
  onChange,
  specialties = false,
  name,
  tone = "sheet",
  labelledBy,
}: {
  value: DrawTag[];
  onChange: (next: DrawTag[]) => void;
  /** Also show "What you make" (Edit profile). */
  specialties?: boolean;
  name?: string;
  /** `paper`: the Edit profile sketchbook (stays light in both themes). */
  tone?: "sheet" | "paper";
  labelledBy?: string;
}) {
  const allSubjects = SUBJECT_TAGS.every((tag) => value.includes(tag));
  const toggle = (tag: DrawTag) => onChange(cleanDraws(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]));
  const toggleAll = () =>
    onChange(cleanDraws(allSubjects ? value.filter((t) => !isSubject(t)) : [...value, ...SUBJECT_TAGS]));

  const chip =
    tone === "paper"
      ? "border-paper-muted/30 text-on-paper hover:border-ocean aria-pressed:border-ocean aria-pressed:bg-ocean aria-pressed:text-white"
      : "border-border bg-surface text-ink hover:border-sky/70 aria-pressed:border-ocean aria-pressed:bg-ocean aria-pressed:text-white";
  const hint = tone === "paper" ? "text-paper-muted" : "text-muted";
  const base = `group/chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${chip}`;

  return (
    <div role="group" aria-labelledby={labelledBy} className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((subject) => (
          <button
            key={subject.id}
            type="button"
            aria-pressed={value.includes(subject.id)}
            title={subject.hint}
            onClick={() => toggle(subject.id)}
            className={base}
          >
            <Check aria-hidden className="hidden size-3.5 group-aria-pressed/chip:block" />
            {subject.label}
          </button>
        ))}
        <button type="button" aria-pressed={allSubjects} onClick={toggleAll} className={`${base} border-dashed`}>
          <Check aria-hidden className="hidden size-3.5 group-aria-pressed/chip:block" />
          All of them
        </button>
      </div>

      {specialties && (
        <>
          <p className={`text-xs font-semibold ${hint}`}>And what you make</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((specialty) => (
              <button
                key={specialty.id}
                type="button"
                aria-pressed={value.includes(specialty.id)}
                onClick={() => toggle(specialty.id)}
                className={base}
              >
                <Check aria-hidden className="hidden size-3.5 group-aria-pressed/chip:block" />
                {specialty.label}
              </button>
            ))}
          </div>
        </>
      )}

      {name && value.map((tag) => <input key={tag} type="hidden" name={name} value={tag} />)}
    </div>
  );
}

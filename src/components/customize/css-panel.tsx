"use client";

import { Check, CircleAlert, Plus, Sparkles } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { artUrl } from "@/lib/art-storage";
import { checkCustomCss } from "@/lib/customization/css";
import { CSS_MAX, type Customization } from "@/lib/customization/model";
import { FlowBadge, Section } from "./controls";

/*
 * The CSS helper: recipes to start from, the parts of the page you can
 * target (hover to see them light up in the preview), your theme's color
 * variables, and the same safety check the server runs — live.
 */

type Recipe = { title: string; blurb: string; target: string; css: string };

const RECIPES: Recipe[] = [
  {
    title: "Sticker cards",
    blurb: "Dashed edges and a chunky offset shadow.",
    target: '[data-part="card"], [data-part="post"]',
    css: `[data-part="card"],
[data-part="post"] {
  border: 2px dashed var(--profile-accent);
  border-radius: 22px;
  box-shadow: 5px 5px 0 color-mix(in oklab, var(--profile-accent) 35%, transparent);
}`,
  },
  {
    title: "Glowing name",
    blurb: "A soft neon halo around your name.",
    target: '[data-part="name"]',
    css: `[data-part="name"] {
  text-shadow:
    0 0 12px color-mix(in oklab, var(--profile-accent) 80%, transparent),
    0 0 32px color-mix(in oklab, var(--profile-accent) 50%, transparent);
}`,
  },
  {
    title: "Handwritten titles",
    blurb: "Section titles in marker.",
    target: "h2",
    css: `h2 {
  font-family: var(--font-caveat), cursive;
  font-size: 1.7em;
  color: var(--profile-accent);
}`,
  },
  {
    title: "Pressable buttons",
    blurb: "Buttons that sink when clicked.",
    target: ".action-primary",
    css: `.action-primary {
  box-shadow: 0 4px 0 color-mix(in oklab, var(--profile-accent) 55%, black);
}
.action-primary:active {
  translate: 0 3px;
  box-shadow: 0 1px 0 color-mix(in oklab, var(--profile-accent) 55%, black);
}`,
  },
  {
    title: "Polaroid avatar",
    blurb: "Your picture as a tilted instant photo.",
    target: '[data-part="avatar"]',
    css: `[data-part="avatar"] img {
  border-radius: 4px;
  padding: 6px 6px 22px;
  background: white;
  rotate: -4deg;
}`,
  },
  {
    title: "Floating avatar",
    blurb: "Gently bobs up and down.",
    target: '[data-part="avatar"]',
    css: `[data-part="avatar"] {
  animation: float 4s ease-in-out infinite;
}
@keyframes float {
  50% { translate: 0 -8px; }
}`,
  },
  {
    title: "Wavy banner",
    blurb: "A wave cut along the bottom of your cover.",
    target: '[data-part="banner"]',
    css: `[data-part="banner"] {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27 preserveAspectRatio=%27none%27%3E%3Cpath d=%27M0 0H100V88Q75 100 50 88T0 88Z%27/%3E%3C/svg%3E");
  mask-size: 100% 100%;
}`,
  },
  {
    title: "Zine headline",
    blurb: "Small caps, wide spacing, accent color.",
    target: '[data-part="headline"]',
    css: `[data-part="headline"] {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.8em;
  color: var(--profile-accent);
}`,
  },
  {
    title: "Hide follower counts",
    blurb: "Keep the numbers to yourself.",
    target: '[data-part="stats"]',
    css: `[data-part="stats"] {
  display: none;
}`,
  },
  {
    title: "Page glow",
    blurb: "A wash of your accent from the top.",
    target: ":scope",
    css: `:scope {
  background-image: radial-gradient(
    ellipse at top,
    color-mix(in oklab, var(--profile-accent) 22%, transparent),
    transparent 60%
  );
}`,
  },
];

const PARTS: { label: string; selector: string }[] = [
  { label: "Your name", selector: '[data-part="name"]' },
  { label: "@handle", selector: '[data-part="handle"]' },
  { label: "Headline", selector: '[data-part="headline"]' },
  { label: "Bio", selector: '[data-part="bio"]' },
  { label: "What you draw", selector: '[data-part="draws"]' },
  { label: "Avatar", selector: '[data-part="avatar"]' },
  { label: "Cover", selector: '[data-part="banner"]' },
  { label: "Stats", selector: '[data-part="stats"]' },
  { label: "Buttons row", selector: '[data-part="actions"]' },
  { label: "Main buttons", selector: ".action-primary" },
  { label: "Sidebar cards", selector: '[data-part="card"]' },
  { label: "Posts", selector: '[data-part="post"]' },
  { label: "About board", selector: '[data-part="board"]' },
  { label: "Board titles", selector: '[data-part="block-title"]' },
  { label: "Whole page", selector: ":scope" },
];

const VARIABLES: { name: string; label: string }[] = [
  { name: "--profile-accent", label: "Accent" },
  { name: "--canvas", label: "Page" },
  { name: "--surface", label: "Cards" },
  { name: "--ink", label: "Text" },
  { name: "--muted", label: "Soft text" },
  { name: "--border", label: "Lines" },
];

const FONTS = [
  { value: "var(--font-caveat), cursive", label: "Handwritten" },
  { value: "var(--font-serif), serif", label: "Storybook" },
  { value: "var(--font-pixel), monospace", label: "Pixel" },
];

export function CssPanel({
  custom,
  isPaid,
  onChange,
  onHighlight,
}: {
  custom: Customization;
  isPaid: boolean;
  onChange: (next: Customization) => void;
  onHighlight: (selector: string | null) => void;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const css = custom.css ?? "";
  const check = checkCustomCss(css, artUrl("").replace(/\/$/, ""));

  const setCss = (next: string) => onChange({ ...custom, css: next || undefined });

  /** Inserts at the cursor (or the end) and keeps the caret after it. */
  function insert(text: string, caretOffset = text.length) {
    const el = editor.current;
    const at = el && document.activeElement === el ? el.selectionStart : css.length;
    const before = css.slice(0, at);
    const after = css.slice(el && document.activeElement === el ? el.selectionEnd : css.length);
    const glue = !before || before.endsWith("\n") || text.startsWith("var(") ? "" : "\n\n";
    setCss(before + glue + text + after);
    requestAnimationFrame(() => {
      el?.focus();
      const caret = before.length + glue.length + caretOffset;
      el?.setSelectionRange(caret, caret);
    });
  }

  function addRecipe(recipe: Recipe) {
    const block = `/* ${recipe.title} */\n${recipe.css}\n`;
    setCss(css.trim() ? `${css.trimEnd()}\n\n${block}` : block);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab" || event.shiftKey) return;
    event.preventDefault();
    insert("  ");
  }

  return (
    <>
      <Section
        title="Custom CSS"
        paid={!isPaid}
        hint="Restyle anything on your page. It stays inside your page — never the site header, menus or checkout."
      >
        <textarea
          ref={editor}
          value={css}
          onChange={(e) => setCss(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={"/* Start with a recipe below, or write your own: */\n[data-part=\"name\"] {\n  letter-spacing: 0.04em;\n}"}
          spellCheck={false}
          rows={14}
          maxLength={CSS_MAX}
          aria-label="Custom CSS"
          aria-describedby="css-status"
          className="w-full resize-y rounded-input border border-border bg-[#0f1424] p-3 font-mono text-xs leading-relaxed text-[#d7e3ff] outline-none placeholder:text-[#6f7a99] focus:border-ocean"
        />
        <div className="mt-2 flex items-start justify-between gap-3 text-xs">
          <p id="css-status" role="status" className={`flex min-w-0 items-start gap-1.5 ${check.ok ? "text-mint-ink" : "text-danger"}`}>
            {check.ok ? (
              <>
                <Check aria-hidden className="mt-px size-3.5 shrink-0" />
                {css.trim() ? "Looks good — it's live in the preview." : "Empty for now. Try a recipe!"}
              </>
            ) : (
              <>
                <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                {check.error}
              </>
            )}
          </p>
          <span className="shrink-0 text-muted tabular-nums">
            {css.length.toLocaleString("en-US")} / {CSS_MAX.toLocaleString("en-US")}
          </span>
        </div>
      </Section>

      <Section title="Recipes" hint="One click adds it. Hover to see what it touches.">
        <ul className="grid grid-cols-2 gap-2">
          {RECIPES.map((recipe) => (
            <li key={recipe.title}>
              <button
                type="button"
                onClick={() => addRecipe(recipe)}
                onPointerEnter={() => onHighlight(recipe.target)}
                onPointerLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(recipe.target)}
                onBlur={() => onHighlight(null)}
                className="group flex h-full w-full flex-col items-start rounded-card border border-border bg-surface p-2.5 text-left transition-[border-color,background-color] hover:border-ocean/60 hover:bg-ice/50"
              >
                <span className="flex w-full items-center justify-between gap-1 text-xs font-bold text-ink">
                  {recipe.title}
                  <Plus aria-hidden className="size-3.5 shrink-0 text-muted transition-colors group-hover:text-accent-strong" />
                </span>
                <span className="mt-0.5 text-[0.6875rem] leading-snug text-muted">{recipe.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Parts you can style" hint="Hover to find it on the page, click to start a rule.">
        <div className="flex flex-wrap gap-1.5">
          {PARTS.map((part) => (
            <button
              key={part.selector}
              type="button"
              title={part.selector}
              onClick={() => insert(`${part.selector} {\n  \n}\n`, part.selector.length + 5)}
              onPointerEnter={() => onHighlight(part.selector)}
              onPointerLeave={() => onHighlight(null)}
              onFocus={() => onHighlight(part.selector)}
              onBlur={() => onHighlight(null)}
              className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-[#ff2bd6] hover:text-[#c2189a]"
            >
              {part.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Your colors & fonts" hint="Click to drop it into your CSS — they follow your theme.">
        <div className="grid grid-cols-2 gap-1.5">
          {VARIABLES.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => insert(`var(${v.name})`)}
              className="flex items-center gap-2 rounded-input border border-border px-2 py-1.5 text-left transition-colors hover:bg-ice"
            >
              <span className="size-5 shrink-0 rounded-full border border-border shadow-soft" style={{ background: `var(${v.name})` }} />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink">{v.label}</span>
                <span className="block truncate font-mono text-[0.625rem] text-muted">{v.name}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FONTS.map((font) => (
            <button
              key={font.label}
              type="button"
              onClick={() => insert(font.value)}
              className="rounded-full border border-border px-3 py-1 text-sm text-ink transition-colors hover:bg-ice"
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Good to know">
        <ul className="grid gap-1.5 text-xs leading-relaxed text-muted">
          <li className="flex gap-2">
            <Sparkles aria-hidden className="mt-0.5 size-3 shrink-0 text-lilac-ink" />
            <span>
              <code className="font-mono text-ink">:scope</code> is your whole page; <code className="font-mono text-ink">@keyframes</code> animations work.
            </span>
          </li>
          <li className="flex gap-2">
            <Sparkles aria-hidden className="mt-0.5 size-3 shrink-0 text-lilac-ink" />
            <span>Images must be uploaded to Artiflow or written inline as data: — outside links are blocked.</span>
          </li>
          <li className="flex gap-2">
            <Sparkles aria-hidden className="mt-0.5 size-3 shrink-0 text-lilac-ink" />
            <span>
              Prefer <code className="font-mono text-ink">[data-part=&quot;…&quot;]</code> selectors: they stay put when we redesign things.
            </span>
          </li>
          {!isPaid && (
            <li className="flex items-center gap-2">
              <FlowBadge />
              <span>Preview freely; publishing custom CSS needs Flow+.</span>
            </li>
          )}
        </ul>
      </Section>
    </>
  );
}

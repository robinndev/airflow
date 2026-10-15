import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { BUTTON_SHAPES, FREE, NAME_EFFECTS, NAME_FONTS, PAID_ABOUT_BLOCKS, PATTERNS, THEME_PRESETS } from "@/lib/customization/model";
import { PLANS, formatPlanPrice } from "@/lib/plans";
import { FlowBadge } from "./controls";
import type { TabId } from "./tabs";

const more = (all: number, free: number, what: string) => `${all - free} more ${what}`;

/** What Flow+ adds on each tab, counted from the catalog, so a free account sees what's there before trying it on. */
const FLOW_PLUS_ADDS: Record<TabId, string[]> = {
  theme: [
    more(Object.keys(THEME_PRESETS).length, FREE.presets.length, "palettes"),
    "your own colors",
    more(PATTERNS.length, FREE.patterns.length, "patterns"),
    "a background image",
  ],
  name: [
    more(Object.keys(NAME_FONTS).length, FREE.nameFonts.length, "fonts"),
    "gradient names",
    more(NAME_EFFECTS.length, FREE.nameEffects.length, "effects"),
    "a bio box color",
  ],
  buttons: [
    more(BUTTON_SHAPES.length, FREE.buttonShapes.length, "shapes"),
    "soft and outline styles",
    "button colors",
    "the sidebar on the right",
  ],
  frame: ["one paid shop item a month, on the house"],
  about: [`${PAID_ABOUT_BLOCKS} blocks instead of ${FREE.aboutBlocks}`, "HTML blocks"],
  css: ["your own CSS on your page"],
};

/**
 * Free accounts only: says what's Flow+ on this tab and leads to the plan.
 * Once a Flow+ option is on, it names what's being previewed instead
 * (saving it needs the plan). The chip is a swatch of the Flow+ card's foil.
 */
export function FlowPlusBar({ tab, previewing }: { tab: TabId; previewing: string[] }) {
  return (
    <section
      aria-label="Flow+"
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-lilac/40 bg-lilac/10 px-4 py-3 text-sm text-ink"
    >
      <span aria-hidden className="foil grid size-10 shrink-0 place-items-center rounded-input shadow-soft">
        <Sparkles className="size-4 text-on-paper" />
      </span>
      <div className="min-w-0 flex-1 basis-64">
        {previewing.length > 0 ? (
          <p>
            You&apos;re previewing <strong>{previewing.slice(0, 3).join(", ")}</strong>
            {previewing.length > 3 ? ` and ${previewing.length - 3} more` : ""}, part of <FlowBadge className="align-middle" />.
            Keep playing; publishing {previewing.length === 1 ? "it" : "them"} needs Flow+.
          </p>
        ) : (
          <>
            <p>
              <strong>You&apos;re on Free.</strong> Everything tagged <FlowBadge className="align-middle" /> works here too: try
              it on and see it on your page.
            </p>
            <p className="mt-0.5 text-muted">In this tab, Flow+ adds {FLOW_PLUS_ADDS[tab].join(" · ")}.</p>
          </>
        )}
      </div>
      <Link href="/plans#flow-plus" className={buttonClasses({ size: "sm" })}>
        Get Flow+ · {formatPlanPrice(PLANS.flow_plus)}/mo
        <ArrowRight aria-hidden />
      </Link>
    </section>
  );
}

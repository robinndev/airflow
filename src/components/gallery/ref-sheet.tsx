import Image from "next/image";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HandNote, Tape } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import { buttonClasses } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import type { Character } from "@/lib/gallery/types";
import { CopyLinkButton, RefSwatches, SaveCharacterButton } from "./character-actions";

/*
 * The top of a character's page: their reference sheet, printed on paper.
 * Their colors run along the top like a printer's color bar; the cover is
 * taped on, never cropped; the facts sit in the corner box a ref sheet has
 * (species, pronouns, who designed them, who keeps them); personality is
 * circled in pen. If they're up for adoption, the price hangs off the sheet.
 */

const HANDLE = /^@?([a-z0-9_.]{2,30})$/i;

/** "@kai" links to their profile; a plain name stays text. */
function Credit({ who }: { who: string }) {
  const match = who.match(HANDLE);
  if (match && who.startsWith("@")) {
    return (
      <Link href={`/${match[1].toLowerCase()}`} className="font-semibold text-on-paper underline decoration-paper-muted/40 underline-offset-2 hover:decoration-ocean">
        @{match[1]}
      </Link>
    );
  }
  return <span className="font-semibold">{who}</span>;
}

// Pen circles, a little different each time.
const CIRCLES = ["rounded-[52%_48%_55%_45%/60%_52%_48%_40%]", "rounded-[45%_55%_48%_52%/50%_44%_56%_50%]", "rounded-[58%_42%_50%_50%/46%_58%_42%_54%]"];
const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

export function RefSheet({ character, ownerName }: { character: Character; ownerName: string }) {
  const { name, tagline, cover, palette, species, pronouns, designer, traits, tags, adoptable, ownerHandle } = character;
  const facts: [string, ReactNode][] = [
    ...(species ? [["Species", species] as [string, ReactNode]] : []),
    ...(pronouns ? [["Pronouns", pronouns] as [string, ReactNode]] : []),
    ["Designed by", designer ? <Credit who={designer} /> : <Credit who={`@${ownerHandle}`} />],
    ...(designer ? [["Kept by", <Credit key="owner" who={`@${ownerHandle}`} />] as [string, ReactNode]] : []),
    ["Pieces", String(character.art.length)],
  ];

  return (
    <article data-part="ref-sheet" className="grain relative rounded-panel bg-paper text-on-paper shadow-lift">
      {palette.length > 0 && (
        <div aria-hidden className="flex h-2.5 overflow-hidden rounded-t-panel">
          {palette.map((color) => (
            <span key={color} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
      )}
      <header className="flex items-center justify-between gap-4 px-5 pt-4 text-[0.625rem] font-bold tracking-[0.18em] text-paper-muted uppercase sm:px-7">
        <span>Character reference</span>
        <span className="truncate normal-case tracking-normal">
          {ownerName} · @{ownerHandle}
        </span>
      </header>

      <div className="grid gap-x-8 gap-y-6 px-5 pt-5 pb-7 sm:px-7 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <figure className="relative flex min-h-56 items-center justify-center">
          {cover ? (
            <span className="relative block -rotate-[0.8deg] bg-white p-2 shadow-lift">
              <Image
                src={cover.src}
                alt={cover.alt}
                width={cover.width}
                height={cover.height}
                preload
                sizes="(min-width: 1024px) 440px, (min-width: 768px) 50vw, 92vw"
                className="block h-auto max-h-[30rem] w-auto max-w-full"
                style={{ backgroundColor: cover.palette?.[0] }}
              />
              <Tape color={palette[0]} tone="lilac" className="-top-3 left-1/2 w-24 -translate-x-1/2 -rotate-2" />
            </span>
          ) : (
            <span className="grid size-48 place-items-center rounded-full border-2 border-dashed border-paper-muted/40 text-center font-hand text-2xl text-paper-muted">
              no art yet
            </span>
          )}
        </figure>

        <div className="min-w-0">
          <h1 data-part="character-name" className="font-display text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">
            {name}
          </h1>
          {tagline && (
            <HandNote tone="paper" className="mt-2 -rotate-1 text-[1.625rem] leading-tight">
              {tagline}
            </HandNote>
          )}

          <dl className="mt-5 divide-y divide-dashed divide-paper-muted/25 rounded-[12px] border-2 border-paper-muted/20 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 px-3.5 py-2">
                <dt className="text-[0.6875rem] font-bold tracking-[0.14em] text-paper-muted uppercase">{label}</dt>
                <dd className="min-w-0 truncate text-right">{value}</dd>
              </div>
            ))}
          </dl>

          {palette.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.14em] text-paper-muted uppercase">Colors</p>
              <RefSwatches colors={palette} />
            </div>
          )}

          {traits.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.14em] text-paper-muted uppercase">Personality</p>
              <ul className="flex flex-wrap gap-x-2.5 gap-y-2">
                {traits.map((trait, i) => (
                  <li
                    key={trait}
                    className={`border-2 border-lilac-ink/70 px-3 py-0.5 font-hand text-xl leading-snug text-lilac-ink dark:border-lilac/80 dark:text-lilac ${CIRCLES[i % CIRCLES.length]} ${TILTS[i % TILTS.length]}`}
                  >
                    {trait}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tags.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-paper-muted">
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <SaveCharacterButton id={character.id} name={name} />
            <CopyLinkButton />
          </div>
        </div>
      </div>

      {adoptable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-panel border-t-2 border-dashed border-paper-muted/25 px-5 py-4 sm:px-7">
          {adoptable.status === "sold" ? (
            <>
              <Stamp tone="like" onPaper className="rotate-[-3deg] text-sm">
                Adopted ♥
              </Stamp>
              <p className="text-sm text-paper-muted">{name} found a home.</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Stamp tone={adoptable.status === "reserved" ? "muted" : "mint"} onPaper className="rotate-[-3deg]">
                  {adoptable.status === "reserved" ? "On hold" : "Up for adoption"}
                </Stamp>
                <p className="font-display text-2xl font-extrabold">{formatUsd(adoptable.priceUsd)}</p>
              </div>
              <Link href={adoptable.href} className={buttonClasses()}>
                {adoptable.status === "reserved" ? "See the listing" : `Adopt ${name}`}
                <ArrowUpRight aria-hidden />
              </Link>
            </>
          )}
        </div>
      )}
    </article>
  );
}

# Artiflow

International marketplace for digital artists: portfolios, original characters (OCs), adoptables and commissions. Product language is English; prices in USD.

## Source of truth

The product/brand direction lives in `docs/brand/Aqua_Product_Brand_Blueprint.docx`. Treat it as the briefing. When something is ambiguous, read the blueprint before guessing — it marks what is a decision vs. a hypothesis.

Key decisions already made (per blueprint):

- Positioning: global marketplace, English-first, USD-first.
- Business model: 10% platform fee on transactions; optional US$5/mo subscription for advanced profile customization (does not remove the fee).
- Visual direction: **Aqua** (light, modern, art-first). Name "Artiflow" is a working candidate — not final.

Still undecided: final brand name & domain, legal entity, payments provider, moderation policy, premium customization scope.

## Aqua design tokens

Defined in `src/app/globals.css` (`@theme inline`) and consumable from Tailwind as `bg-ocean`, `text-ink`, `border-border`, etc.

| Token  | Hex       | Use                                    |
| ------ | --------- | -------------------------------------- |
| ocean  | `#0788F9` | Primary actions, active links, focus   |
| sky    | `#35BDF5` | Secondary actions, light states        |
| mint   | `#21D4E5` | Highlights, indicators                 |
| lilac  | `#8B83F6` | Special tags, categories               |
| ice    | `#EAF6FF` | Section backgrounds, soft surfaces     |
| ink    | `#173B5B` | Titles and body text                   |
| muted  | `#64839D` | Metadata, auxiliary text               |
| border | `#D5E7F5` | Dividers, field borders, card edges    |

Fonts: Inter (UI) and Plus Jakarta Sans (display) via `next/font`. Caveat is the "artist's hand" (`font-hand`) for short handwritten asides only — never essential info; it's loaded by the pages that use it (Explore), not the root layout.

## Themes: Aqua (light) & Ember (dark)

Two themes of one design system, not two brands ("Artiflow Aqua" / "Artiflow Ember"). Components use only semantic tokens (`bg-surface`, `bg-canvas`, `text-ink`, `text-on-ink`, `bg-scrim`, `text-lilac-ink`, `text-star`, `text-like`, `text-danger`…) — never `bg-white` for surfaces or raw hex. Raw values live per theme in `globals.css` under `:root, [data-theme="aqua"]` and `[data-theme="ember"]`; any element can re-scope with `data-theme` (the picker previews do).

Ember maps the same roles to its own palette: ocean → Ember Red `#FF3948`, sky → Flame Orange `#FF762E`, mint → Blaze Pink `#F04488`, lilac → Ember Violet `#9857F5`, muted → Ash `#A8B0C2`, canvas → Night `#0B101C`, surface → Charcoal `#171C2B`, ink → Cloud `#F4F5FA`; display font → Space Grotesk. Profile accents point at these tokens, so they follow the theme.

Physical "paper" objects (stickers, hang tags, paint chips, polaroids, seals) use `bg-paper` / `text-on-paper` / `text-paper-muted`, which stay light in both themes — like real paper on a dark table. The `grain` utility adds paper texture behind a surface (never over artwork).

The choice (`aqua` | `ember` | `system`, default `aqua`) is stored in localStorage and applied by an inline script before paint (`src/lib/theme.ts`) — no cookie, so pages stay static/PPR. Picker: `src/components/site/theme-menu.tsx` in the header. `dark:` variant = Ember.
Radii: input `10px`, button `12px`, card `16px`, panel `24px`.
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px.

## Stack

- Next.js 16 (App Router, TS, Tailwind v4, Turbopack, `src/` dir).
- Vercel AI SDK (`ai`, `@ai-sdk/react`) with Anthropic provider (`@ai-sdk/anthropic`).
- `lucide-react` for UI icons; brand glyphs (Instagram, TikTok…) are hand-drawn in `src/components/icons/social-icon.tsx` on the same 24px/2px grid.
- Build features against the blueprint's roadmap (MVP first: auth, profiles, portfolios, OCs, listings, checkout).

## Conventions

- Everything in the repo is English: code, comments, UI copy, docs.
- Cache Components + Partial Prefetching are on. Await `params` / read cookies **inside** `<Suspense>`; cache data with `"use cache"` + `cacheLife` + `cacheTag`, and invalidate with `updateTag` in Server Actions.
- Keep client components small leaf islands (buttons, composer); everything else is a Server Component.

## Artist profile (`/[handle]`) — first sketch

- Route: `src/app/(site)/[handle]/` — `layout.tsx` (banner, identity, sidebar shortcuts), `page.tsx` (post feed + composer), `gallery/` and `commissions/` stubs, `actions.ts` (Server Actions).
- Data: `src/lib/profile/` — `types.ts`, `queries.ts` (cached reads), `mock-db.ts` (in-memory store, resets on restart), `appearance.ts`.
- Header: `src/components/site/site-header.tsx` — each page renders its own. Profiles use `overlay` (transparent over the full-bleed banner, turns solid past the banner via an IntersectionObserver sentinel). Wordmark only for now (no logo mark). Explore = hover/click menu (`explore-menu.tsx`); account = native popover (`account-menu.tsx`).
- Auth is mocked in `src/lib/session.ts`: you're always signed in as `@mira`; the eye button toggles "visitor view" via a cookie.
- Customization tiers: free vs Pro fields are documented on `ProfileAppearance` (`types.ts`) and gated in one place, `resolveAppearance()`. Appearance is applied as CSS variables (`--profile-accent`, `--profile-radius-action`) → Tailwind `bg-accent`, `rounded-action`. Premium will grow to button shapes, block positions, themes, fonts and sandboxed CSS.
- Demo artwork is third-party (Danbooru, general-rated), listed with credits in `src/lib/profile/demo-images.ts`, downloaded by `npm run demo:art` (runs automatically before `npm run dev`) into git-ignored `public/demo-art/`. Never commit or deploy it publicly.

## Explore (`/explore`)

Concept: "made by hand" — the artist/fan world's physical artifacts translated into Aqua, deliberately unlike VGen's rails of uniform cards. Decorations live in the margins; art stays the hero.

- Page: `src/app/(site)/explore/page.tsx` (fully prerendered). Sections, top to bottom: hero (rotating "Your OC/fursona/… deserves to be drawn.", search, salon-style collage), categories as die-cut stickers, "Open studios" (commission sheets: 3 priced tiers, slot lights, rubber-stamp status, tabs Open now / Opening soon / Last slots), "Artist in residence" (weekly editorial feature), adoptables (hang-tag prices: flatsale / auction / offer, "Adopted ♥" stamp, character palette dots, drop card with countdown), "Browse by palette" wall (paint-chip mood filters, justified rows that never crop art), closing "made by humans" note.
- Components: `src/components/explore/` — server by default; client islands are `countdown.tsx` (one shared clock), `studio-board.tsx` (tabs), `salon-wall.tsx` (filters/sort over shipped data) and `explore-search.tsx`.
- Data: `src/lib/explore.ts` (cached `getExploreData()`; countdowns anchored to the hour inside `"use cache"`), palette moods in `src/lib/palette.ts` (`moodsOf()` scores `ImageAsset.palette` in CIELAB). `ImageAsset.palette` = dominant colors extracted on upload (demo values precomputed).

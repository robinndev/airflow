# Artiflow

International marketplace for digital artists: portfolios, original characters (OCs), adoptables and commissions. Product language is English; prices in USD.

## Source of truth

The product/brand direction lives in `docs/brand/Aqua_Product_Brand_Blueprint.docx`. Treat it as the briefing. When something is ambiguous, read the blueprint before guessing — it marks what is a decision vs. a hypothesis.

The executable plan lives in `docs/roadmap.md` (phases, item status, feature briefs, stakeholder requests log). Claude owns it: log every stakeholder request there, update statuses when work lands, and check it before starting a feature.

Key decisions already made (per blueprint):

- Positioning: global marketplace, English-first, USD-first.
- Business model: 10% platform fee on transactions; paid plans (do not remove the fee): **Flow+** (US$6.99/mo) for fully custom profiles (code still calls it `pro`) and a higher tier (US$9.99/mo, name TBD — working name "Flow+ Live") adding live streaming. Prices and perks live in `src/lib/plans.ts`; `/plans` shows them (no checkout yet).
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
- Data: `src/lib/profile/` — `types.ts`, `queries.ts` (cached reads), `mock-db.ts` (in-memory store; resets on restart, or bump `SEED_VERSION` to wipe dev posts without restarting), `appearance.ts`.
- Header: `src/components/site/site-header.tsx` — each page renders its own. Every header starts transparent with no bottom border and turns solid once the page scrolls (`header-shell.tsx`, IntersectionObserver sentinel); a page whose top has its own surface (Explore hero) pulls it under the header with `-mt-16 pt-16`. Profiles use `overlay` (white wordmark over the full-bleed banner, solid only past the banner). Wordmark only for now (no logo mark). Header menus open on click only, one at a time: Explore, theme and notifications use `header-menu.tsx` (any outside click closes them); account = native popover (`account-menu.tsx`). Signed-in artists get cart, messages, notifications and the account menu; visitors get **Sign in** / **Create account** instead. Actions that need an account (Follow, Message) send visitors to `/sign-in?next=` and back.
- Auth is real (Supabase, see "Accounts" below). `getViewer()` in `src/lib/session.ts` returns the signed-in handle; the eye button toggles "visitor view" via a cookie. The demo artists (`mira`, `kai`…) have no accounts.
- Customization: see "Profile customization" below. The older `ProfileAppearance` fields (accent, banner focus) still apply; `savedCustomization()` maps legacy buttonShape/sidebarPosition.
- Demo artwork is third-party (Danbooru, general-rated), listed with credits in `src/lib/profile/demo-images.ts`, downloaded by `npm run demo:art` (runs automatically before `npm run dev`) into git-ignored `public/demo-art/`. Never commit it. Deployments were protected for that reason (Vercel Authentication on every deployment), but since 2026-10-10 the Vercel project (`robinndevs-projects/artiflow`, production at `artiflow-red.vercel.app`) is **public with the demo art**, by the project lead's call, so reviewers can open it without a Vercel account. Re-enable protection with `echo '{"ssoProtection":{"deploymentType":"all"}}' | vercel api /v9/projects/artiflow -X PATCH --input -`. Replace demo art with uploads from consenting artists before launch. Deploy with `vercel build && vercel deploy --prebuilt` so the local demo art is included (Git-triggered builds won't have it).

## Profile customization (`/customize`, `/[handle]/about`, `/shop`)

- One JSON document per profile, `profiles.customization` (theme preset or own colors, background pattern/image, name font/color/gradient/effect, button shape/style, sidebar side, equipped frame, custom CSS), plus `profiles.about` (the About board). Schemas, presets and the free/Flow+ split: `src/lib/customization/model.ts` + `about.ts`. Rendering: `style.ts` turns it into CSS variables on the profile **canvas** (`[data-profile-canvas]` in `[handle]/layout.tsx`), so existing `bg-surface`/`text-ink`/`bg-accent` components pick up the artist's palette.
- Gating: `gateCustomization()` drops Flow+ fields at render time (kept in the DB, so a lapsed plan degrades and comes back). Editor previews everything ("try before you buy"); `saveCustomization` (`src/app/(site)/customize/actions.ts`) refuses paid fields for free accounts. No column grants on these columns: that action is the only writer (secret key, after session + plan + ownership checks).
- Custom CSS (Flow+): validated in `css.ts` (no @import/@font-face, escapes, markup or scriptable values; `url()` only our art storage or data: images), wrapped in `@scope` at render; the canvas has `contain: paint` + `isolation` so it can't cover site chrome. HTML blocks render in an empty-sandbox iframe with a CSP (no scripts, no outside images).
- CSS hooks: profile parts carry stable `data-part` attributes (name, handle, headline, bio, avatar, banner, stats, actions, meta, card, post, board, block) — the public API for custom CSS and the CSS helper's recipes (`src/components/customize/css-panel.tsx`). Keep them when restructuring the profile; add new ones rather than renaming.
- Edit profile (`edit-profile-dialog.tsx`): name, headline, bio, pronouns, location, links (`profiles.headline/pronouns/location/links`, written as the user under RLS via `updateProfileDetails`). Platforms are detected from the URL (`src/lib/profile/links.ts`).
- About board: free-form blocks (text, list, image, sticker, html) in 1000 board units, scaled with container units; stacks in reading order under 640px. Editor: `src/components/customize/board-editor.tsx` (drag/resize/rotate, snap, undo).
- Frames: catalog + placeholder prices in `src/lib/frames.ts`, SVG art in `src/components/frames/avatar-frame.tsx`, ownership in `public.owned_frames` (server writes only). Free frames are claimed from `/shop`; paid ones wait on checkout.
- Demo: `@pebblecat` in mock-db is a fully decorated Flow+ profile + About board.

## Explore (`/explore`)

Concept: "made by hand" — the artist/fan world's physical artifacts translated into Aqua, deliberately unlike VGen's rails of uniform cards. Decorations live in the margins; art stays the hero.

- Page: `src/app/(site)/explore/page.tsx` (fully prerendered). Sections, top to bottom: hero (rotating "Your OC/fursona/… deserves to be drawn.", search, salon-style collage), categories as die-cut stickers, "Open studios" (commission sheets: 3 priced tiers, slot lights, rubber-stamp status, tabs Open now / Opening soon / Last slots), "Artist in residence" (weekly editorial feature), adoptables (hang-tag prices: flatsale / auction / offer, "Adopted ♥" stamp, character palette dots, drop card with countdown), "Browse by palette" wall (paint-chip mood filters, justified rows that never crop art), closing "made by humans" note.
- Components: `src/components/explore/` — server by default; client islands are `countdown.tsx` (one shared clock), `studio-board.tsx` (tabs), `salon-wall.tsx` (filters/sort over shipped data) and `explore-search.tsx`.
- Data: `src/lib/explore.ts` (cached `getExploreData()`; countdowns anchored to the hour inside `"use cache"`), palette moods in `src/lib/palette.ts` (`moodsOf()` scores `ImageAsset.palette` in CIELAB). `ImageAsset.palette` = dominant colors extracted on upload (demo values precomputed).

## Home feed (`/`)

Concept: an exhibition where **the art sets the light** — deliberately not a social timeline (no X/Instagram three-column layout, avatar gutters or sidebars of widgets).

- Page: `src/app/(site)/page.tsx` — static masthead ("Fresh off the easel."), then the viewer-dependent feed streams in `<Suspense>`. Filters are URL params: `?feed=following` and `?stage=finished|wip|sketch|update`.
- Room light: a fixed `#feed-light` layer (`ambient-light` utility in `globals.css`) re-lights the artwork's most vivid swatches (`glowOf()` in `palette.ts`) as a pale wash (Aqua) or low glow (Ember) via registered `@property` colors; `feed-light.tsx` swaps them as posts cross the middle of the screen and renders the palette rail (color minimap, xl+). Hue comes from the art, lightness from the theme, so contrast never depends on the art.
- Pieces (`art-post.tsx`): plate + museum-style wall label, alternating sides on desktop; label splits around the art on phones. Plates (`art-plate.tsx`) are justified rows that never crop, framed by stage: finished → floating with `art-glow`, WIP → crop marks, sketch → spiral sketchbook. Labels show a sketch → WIP → finished track, copyable palette chips + mood, reactions (like splashes the art's colors; comments and reposts are real) and the newest comment as a handwritten margin note.
- Posting (`canvas-composer.tsx`; visitors get the same `canvas-card.tsx` as a sign-in invitation): a composer-looking "blank canvas" under the filters (stage chips preselect the post type), plus a floating **Post** button once it scrolls away, opening the same composer in a dialog. After posting, the dialog closes and the page scrolls back to the top of the feed. Up to four images per post.
- Comments and reposts (`src/components/social/`): one `<CommentsPanel>` and one `<RepostDialog>` per page (home and profile), opened from any button through window events (`events.ts`, `targets.ts`). Reposting a repost pins its original. Reads and writes go through `src/app/(site)/comment-actions.ts` and `repostPost` in `[handle]/actions.ts`; counts, the newest comment and reposted originals come from `hydratePosts` (queries.ts) + `conversation.ts`.
- Loading: placeholders mirror the real layout (the feed's fallback renders the real filters and canvas card) and use the `skeleton` utility, which stays invisible for ~350ms, then breathes slowly. The room light stays dark until the first artwork lights it (`data-lit`).
- Text-only posts are signed studio notes (`studio-note.tsx`) with a commission ticket, adoptable hang tag or pinned polaroid (`note-embeds.tsx`). Discovery comes as interludes between pieces (`interludes.tsx`): open studios, a studio visit, a tag marquee.

## Sign in & join (`/sign-in`, `/join`)

Concept: the artist's desk, seen from above. Deliberately not a split-screen SaaS login.

- Layout: `src/app/(auth)/layout.tsx` (persists across both routes, so switching tabs swaps only the sheet and the art). It's a self-healing cutting mat (`mat-grid`, `ruler-x/y` utilities; rulers track the pointer, `ruler-cursor.tsx`) lit by a fixed `#desk-light` `ambient-light` layer (`light.ts`, `lightDesk()`).
- Art side (`desk-art.tsx`, desktop): sign-in shows a stack of community prints signed in pencil (edition · title · artist). Every 6.5s the top print is pulled off and slipped under the rest, and the desk takes its colors (`print-stack.tsx`, pausable). Join shows *your* blank canvas with construction lines that draw themselves in. It signs itself with the handle you type, pins your inviter's polaroid and note, and gets stamped when the account is made (`blank-canvas.tsx`, shared state in `desk.ts`). Phones get a small fan of prints tucked behind the sheet.
- Sheet (`auth-sheet.tsx`): a binder page with index tabs (Sign in / Create account). Forms are client islands (`sign-in-form.tsx` with an in-place password reset, `sign-up-form.tsx`). Handle check is debounced against the server, with suggestions when taken (`handle-field.tsx`). Password strength is a paint stroke named after drawing stages, rough sketch → fully rendered (`lib/auth/password.ts`). The invite code is a sealed envelope (`invite-envelope.tsx`). `/join?invite=CODE` opens it already checked.
- Server Actions: `src/app/(auth)/actions.ts` (mock: nothing is stored). Rules shared with the client live in `src/lib/auth/` (handles, password, invites). Desk props (pen-tablet stylus, wax seal, construction sketch) are SVG in theme tokens: `desk-props.tsx`.

## Plans (`/plans`)

Concept: every artist gets an **artist trading card**; a plan is the card's finish. Free = matte card stock, Flow+ = foil, Flow+ Live = live holo (rainbow + glitter, LIVE badge, rising hearts). Deliberately not a SaaS pricing table.

- Page: `src/app/(site)/plans/page.tsx`. Hero ("Pick your finish."), then the viewer's own card (streams in, signed-in only), then the three catalog cards fanned on the table, then the fee as a hang tag. Static except the viewer parts; anchors `#free`, `#flow-plus`, `#live`.
- Components: `src/components/plans/`. `plan-card.tsx` (card anatomy: name + cost, art window, finish with rarity sparkles, perks as abilities, flavor text, illustrator credit). The finish sits on the **frame**, never over the art. `holo-tilt.tsx` is the only client island: it tilts the card toward the pointer and hands it the light. `your-card.tsx`: your banner and avatar printed in your plan's finish, the "Day N" seal (`plan-seal.tsx`), price / since / how long, and the next plan up. Its "Try it in …" switch runs the next finish over your card like a laminator, in CSS only (`group-has-checked`). `card-action.tsx`: per-card action by viewer. `card-art.ts`: demo art, credited.
- Foil CSS lives in `globals.css` (`foil`, `foil-live`, `foil-text`, `holo-tilt`, `card-glare`): the theme's own colors under a light at `--foil-x/--foil-y` (registered properties). Pastel iridescence in Aqua, fire in Ember. Idle cards drift; `data-active` hands the light to the pointer. Variants retune `foil` through inputs (`--foil-mix`, `--foil-b`, `--foil-d`), never by redefining its variables (utility order isn't guaranteed).
- No checkout yet: paid actions are "Checkout opens soon" tickets and a disabled "Upgrade to …". Never a button that pretends to charge.
- Data: plans, prices and finishes in `src/lib/plans.ts` (client-safe). The viewer's plan and start date come from `getViewerPlan()` in `src/lib/plan-status.ts` (server-only, uncached, deduped per request).

## Favorites (`/favorites`)

Concept: the artist's **moodboard**, the wall above the desk where you pin what stopped your scroll. Deliberately not a Pinterest grid of uniform cards.

- Page: `src/app/(site)/favorites/page.tsx`. Static masthead ("Your moodboard."); the rest is the viewer's and streams in: the **swatch card** ("Your colors", watercolor patches with bleeding edges, mixed from every saved palette by `blendPalettes()` in `palette.ts`; its mood names filter the wall), **the line** ("Saving up for": commission tickets and adoptables with hang tags, clipped to a sagging string with pegs dyed in each piece's color, scrolls sideways), and **the wall** (justified rows that never crop: art as prints held by tape dyed in the art's colors, posts as polaroids, text posts as sticky notes; filters by kind and color). Visitors and empty boards get a bare wall with ghost outlines and a pinned note.
- Components: `src/components/favorites/`. Server by default; client islands are `pinned.tsx` (unpin + filters), `line-scroller.tsx`, the toast and the stores. Unpin removes right away; Undo puts it back at its old `created_at`.
- Saving: `useFavorite({ kind, id, title? })` (`store.ts`) backs every save button (`SaveButton`, `ArtworkLikeButton`, the salon wall's heart, `PostReactions`, `PostActions`). Pages stay static: `<FavoritesSession>` in the header tells the store who's signed in and the keys load once per viewer; visitors are sent to `/sign-in?next=`. Every save raises a "Saved to favorites · View" toast (`<FavoritesToast>` in the `(site)` layout).
- Data: `favorites` table (kinds `post` | `art` | `service`; real posts by `post_id`, demo things by `demo_id`: `pst_3`, `art_4`, `pool-…`, `svc_…`; private to their owner; drop `demo_id` with the demo data). Reads in `src/lib/favorites/queries.ts` (`getViewerFavorites()`, per request, uncached); writes in `src/app/(site)/favorite-actions.ts`. Tests: `tests/e2e/favorites.spec.ts`.

## My commissions (`/commissions`)

Concept: the artist's **studio desk**. Each commission is a paper **work ticket** on a cutting mat; the same queue reads as a ruled **ledger**. Deliberately not VGen's grey table and colored column bars.

- Page: `src/app/(site)/commissions/page.tsx`. Static masthead ("On your easel."); the rest is the viewer's and streams in: a sample-orders note with Reset, the **planner** page (next 7 days with deadlines inked in each character's color, "Next up", the month's totals after the fee), then the **workspace**: binder index tabs (All, Needs you, Client's turn, Waitlist, Paused, Delivered, Archived), search, and Board / Ledger. Tab and view live in the URL (`?tab=`, `?view=ledger`), written with `history.replaceState(null, …)` so `useSearchParams` follows. Visitors get the empty mat and a sign-in note. Linked from the account menu.
- Board (`board.tsx`): five columns under masking-tape labels: New requests → Awaiting payment → Up next → On the easel → Delivered. Tickets (`ticket.tsx`) are dragged between them (HTML5 drag and drop; the drop is accepted by the dragged data type, not React state) or moved from the drawer. Free dragging is **prototype-only**: with real orders a ticket's column follows its order's state and moves only as the order is processed (decided 2026-10-11, see the commission flow brief in the roadmap). Clicking a paint stroke sets the step (sketch → lineart → flats → render, `step-track.tsx`). Ledger (`ledger.tsx`): a real `<table>`, red margin rule, sortable Requested / Due / Price, one next-step button per row. Drawer (`order-drawer.tsx`): accept / waitlist / decline, where it is, the buyer's request and references, money (price, fee, you get), dates, a private note.
- Rules: `src/lib/commissions/queue.ts` (pure, client-safe, tested in `queue.test.ts`): lanes, tabs, `moveTo()` (moving into Awaiting payment invoices; nothing ever marks an order paid), `nextAction()`, due-date labels, sorting, totals. Every change raises the site toast with Undo.
- Data: **sample orders** (`sample.ts`, dates relative to today) for every signed-in artist, through `getViewerQueue()` (`queries.ts`, per request). Changes are patches in localStorage per account (`queue/store.ts`, shared by the planner and the workspace). The commission flow replaces the sample with real requests and orders: keep `QueueOrder`'s shape or map to it. Tests: `tests/e2e/commissions.spec.ts`.

## My requests (`/requests`)

Concept: the buyer's side of commissions, kept like **the post**. Each request is a paper **postcard** on its way to you; deliberately not VGen's table row.

- Page: `src/app/(site)/requests/page.tsx`. Static masthead ("On its way."); the rest streams in: a sample note, the **shipping label** (`shipping-label.tsx`: ship to @you, next arrival, a barcode from your handle, in the works / quotes for you / spent this year), filter chips (`?show=yours|waiting|making|delivered|closed`, Links, server-filtered), and the postcards in two masonry columns.
- Postcard (`src/components/commissions/requests/postcard.tsx`): airmail edging in the theme's colors, the service art on a perforated **postage stamp** whose value is the price, a round **postmark** with the status and date (`postage.tsx`, reuses the stamp ink), your note, the **route** Sent → Quote → Paid → In the works → Delivered stamped with dates (`route-line.tsx`), and the next step: a quote shows "Pay $X · checkout opens soon" (never a button that pretends to charge), work in progress shows the paint track and the latest progress shot, a delivery prints the finished piece on the card, a declined request shows the artist's note.
- Data: `getViewerRequests()` (`src/lib/commissions/queries.ts`): requests the viewer really sent through a commission dialog (`db.requests`, in memory, shown on top as "Sent from Artiflow") plus the **sample** (`sample-requests.ts`). Rules: `requests.ts` (stops, filters, order, label numbers), tested in `requests.test.ts`. Tests: `tests/e2e/requests.spec.ts`.

## Licenses and add-ons on commissions

- Under a service's price (commission dialog) and in its request form: the licenses (Personal, Commercial: Content, Commercial: Merchandising) and the artist's add-ons, ticked like a commission sheet (a pen circle that gets a pink cross, `src/components/commissions/addon-picker.tsx`). Each is priced `AddonPrice`: `included` (comes ticked and locked), `fixed` (+$10) or `percent` of the "from" price (+200%); a license can also be `null` (not offered, struck out). Only some services have add-ons (`CommissionService.addons`).
- Rules in `src/lib/commissions/addons.ts` (tested): options, totals, and the request's usage (commercial when the buyer holds a commercial license). The server action re-checks the ticked ids and stores them priced in USD on the request; custom pieces still ask Personal / Commercial.

## Accounts (Supabase)

- Provisioned through the Vercel Marketplace (`artiflow-db`); `vercel env pull .env.local` fetches the keys. Clients in `src/lib/supabase/`: `server.ts` (session from cookies; also a cookie-less public client for `"use cache"` reads), `admin.ts` (secret key, server-only: handle → email at sign-in, invite lookups). `src/proxy.ts` refreshes sessions.
- Schema in `supabase/migrations/` (create with `npx supabase migration new <name>`, apply with `npx supabase db push --db-url "$POSTGRES_URL_NON_POOLING"`, then `npx supabase db advisors --db-url …`). New tables aren't exposed to the Data API by default: grant explicitly and enable RLS.
- `profiles` (handle, display name, bio, invited_by / invite_code) is created by the `handle_new_user` trigger from sign-up metadata (or `claim_profile` after a social sign-in), both through `private.create_profile`. Profiles are public.
- `invites` are random single-use codes (`K7QH-3MPA`) the team grants to specific artists: `npm run invites -- grant @handle [count] ["why"]` / `list @handle`. Joining with one redeems it (`redeemed_at` marks it used) and sets `invited_by`. Lookups go through the server (`lookupInvite`); artists can only read their own rows. Demo artists keep reusable demo codes.
- **Posts and images:** `posts` table (`images` jsonb: up to four `{path, width, height, palette}`, checked by a trigger; the old `image_*` columns stay filled with the first image until every deployment reads `images`; reposts in `quote_post_id`) and the public `art` Storage bucket, folders `art/<user id>/{posts,avatar,banner}/`. The browser prepares images (`src/lib/images/prepare.ts`: resize, WebP, palette via `extract-palette.ts`, shared with `npm run demo:palettes`) and uploads straight to storage; Server Actions in `src/app/(site)/[handle]/actions.ts` check the path and save the row (`createPost`, `deletePost`, `updateProfileImage`, which also removes the replaced file). `profiles.avatar` / `banner` are `{path, width, height, palette}`. Authors get the "…" delete menu (`post-owner-menu.tsx`) wherever their post shows: profile and home feed.
- **Comments:** `comments` table, one level of replies (`parent_id`, enforced by a trigger), public to read, written as yourself; authors can delete comments on their posts. Deleting a post takes its comments and reposts with it. Demo posts aren't rows, so comments and reposts point at them through `demo_post_id` / `quote_demo_post_id` (drop with the demo data). A demo post's made-up `topComment` shows as the first, read-only comment of its thread.
- **Plans:** `profiles.plan` is `free` or `flow_plus` (shown as `pro` in the app's types), set only by the team: `npm run plans -- set @handle flow_plus`. `profiles.plan_since` records when the current plan started (the `profiles_stamp_plan_change` trigger resets it on every change; read-only for users). `/plans` counts days from it. Flow+ can use animated GIFs for picture and cover; the `profiles_enforce_media` trigger enforces it in the database too. GIFs skip re-encoding (a canvas would freeze them).
- Real profiles merge into the demo data: `getProfile()` tries `mock-db.ts` first, then Supabase (`src/lib/profile/accounts.ts`). New accounts get generated art (`/defaults/{avatar|banner}/{handle}.svg`, `default-art.ts`) and empty states. Handles of demo artists and reserved routes can't be registered.
- `getViewer()` awaits `connection()` before touching the session (Supabase checks token expiry against the clock, which Partial Prefetching won't allow in a prerender).
- The Google/Discord/Twitch buttons always show; the ones switched on in Supabase (read from its public `/auth/v1/settings`, cached ~1 min: `enabled-providers.ts`) sign in; the rest show faded and disabled ("coming soon"). A first social sign-in has no handle: `/auth/confirm` and `signIn` send it to `/join/handle`, which creates the profile through `claim_profile` (secret key only; shared logic lives in `private.create_profile`).


## Made by humans: the AI check on uploads

- Rule (decided 2026-10-11): no generative AI anywhere in a posted image. Reporting, review and strikes are planned in `docs/roadmap.md` (brief "reporting, and keeping Artiflow human-made").
- Detector: `src/lib/ai-check/` is a standalone module, so reuse it for any new place that takes images. `signature.ts` is pure TS (browser, scripts, server): C2PA / IPTC / XMP, settings in PNG text and EXIF (A1111/Forge, ComfyUI, NovelAI, InvokeAI, Fooocus, Midjourney), and stealth settings in the alpha LSB. `browser.ts` has `assertMadeByHumans(file, bitmap?)`, which throws `AiImageError`.
- `prepareImage()` runs it before re-encoding, so every upload through it is covered. Callers catch `AiImageError` and render `<AiImageDialog>` (`src/components/uploads/`), which explains the refusal and files "I made this myself" requests (`ai_review_requests`, 10/day, no file kept, Server Action `requestAiReview`).
- Team: `npm run ai-check -- <files|folders>` checks files with the same detector; `npm run ai-check -- requests` lists open review requests (production, via `.env.local`).
- Tests: `npm run test:unit` (Node's test runner, `src/**/*.test.ts`) and `tests/e2e/ai-check.spec.ts`. When adding a generator, check it against a real file with `npm run ai-check` first, and add its layout to `signature.test.ts`.
- A clean result proves nothing (screenshots strip metadata). Never treat it as "verified human".

## Running locally: two modes

- `npm run dev:local` → http://localhost:3001 against the **local** Supabase (Docker). Starts Docker (macOS) and the stack if needed, applies new migrations, builds into `.next-local/`. Studio `127.0.0.1:44323`, emails in Mailpit `127.0.0.1:44324`. Throwaway data.
- `npm run dev:production` → http://localhost:3000 against the **production** Supabase from `.env.local` (Vercel uses the same project for Production/Preview/Development). Refuses to start if `.env.local` points at a local stack; prints a red "real data" banner.
- Both can run at once (separate ports and dist folders). Logic in `scripts/dev.ts` + `scripts/lib/local-supabase.ts` (shared with the e2e suite).
- The local stack is shared by every session on this machine: don't `supabase stop/start/db reset` while another session is using it.

## Tests (end-to-end)

- Playwright (`@playwright/test`, pinned) in `tests/e2e/`. Run `npm run test:e2e` (or `test:e2e:ui`).
- Needs Docker and the **local** Supabase stack: `npx supabase start` (API `127.0.0.1:44321`, Mailpit `:44324`, Studio `:44323` — ports moved off 543xx/556xx, which other local projects / macOS hold). The suite refuses to run against a non-local Supabase.
- Playwright builds the app into `.next-e2e/` (`NEXT_DIST_DIR`) and serves it on `localhost:3100` with the local stack's keys, so it never collides with `next dev` or `.env.local`.
- Local auth mirrors production: email confirmation is **on**. Tests read the real confirmation email from Mailpit (`tests/e2e/support/mailpit.ts`).
- Each test creates its own throwaway account (`e2e_<random>`) and deletes it afterwards. Wait for React hydration before typing into the controlled auth forms (see `open()` in `auth.spec.ts`).
- First suite: `auth.spec.ts` — sign up with email + password → blocked until confirmed → confirm via the email link → signed in on the new page → sign out → wrong password refused → sign in by email and by handle.

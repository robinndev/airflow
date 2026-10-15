# Artiflow roadmap

Living plan for what we build and in what order. The blueprint (`docs/brand/Aqua_Product_Brand_Blueprint.docx`, §9) sets the vision and the phases; this file turns them into concrete items, tracks their status, and records stakeholder requests.

- **Maintained by:** Claude (roadmap owner), with input from stakeholders via the project lead.
- **Last updated:** 2026-10-15

**Status legend**

| Status         | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| Prototype      | Built in the app on mock data (`mock-db.ts`, mocked session). No real backend yet. |
| Planned        | Agreed scope, not started.                                            |
| Needs decision | Blocked on an open question (see [Pending decisions](#pending-decisions)). |
| Proposed       | Suggested by the roadmap owner and not yet confirmed by the project lead. |
| Shipped        | Live on real infrastructure. (Nothing yet.)                           |

---

## Now and next (as of 2026-10-11)

The roadmap owner's order of work. The goal is the blueprint's closed beta (§13): invited artists publishing, then the first commissions.

**Decisions only the project lead can make. These unblock the most:**

1. **A sending domain for email.** Supabase's built-in mailer only reaches the team, so nobody outside it can confirm their email. That blocks the beta. Resend needs a verified domain. Pick a provisional one now and keep the final brand name as a separate decision.
2. **Payments provider and legal entity.** Researched 2026-10-11, see the [payments brief](#brief-payments-how-the-money-moves). Recommended: a US company, Stripe Connect first and PayPal second. The paperwork (company, bank, Stripe's review, terms, tax advice) takes weeks, so start it now.

**Build, before the beta opens (trust & safety minimum):**

1. [Content tags](#brief-content-rating-mature-art-hidden-until-you-click): artists will post adult art from day one.
2. [Reporting, block and mute](#brief-reporting-and-keeping-artiflow-human-made), with the minimal `/admin/reports` queue, and the [team roles](#brief-team-roles-and-permissions) that open it to moderators (the queue, not the money).
3. [Spam & sign-up protection](#what-else-confirmed-2026-10-11) (bot check, rate limits), plus the quick part of [keeping art out of AI training](#what-else-confirmed-2026-10-11) (robots.txt, `noai` tags).
4. [Guidelines, terms & privacy](#what-else-confirmed-2026-10-11), drafted for legal review, with the AI rule, content tags and strikes.

**Built 2026-10-14:** [original images, cheap and safe](#brief-original-images-cheap-and-safe), step 1: originals kept, thumbs and display copies straight from storage's CDN, server check, upload limits. ~$35–45/month at a year-one scale instead of ~$1,800. **Waiting on the project lead:** a Cloudflare account for the R2 backup bucket.

**Then, the commission loop (payment step stubbed until the provider is chosen):**

5. ~~[Per-service status in one click](#brief-per-service-status-set-in-one-click)~~ **Built 2026-10-12** with [listings and discovery](#brief-listings-and-discovery): services and adoptables are real, with packages, slots and their own status. Left from that brief: "Reopen on <date>" and the "Still taking…?" nudge.
6. [Commission flow](#brief-commission-flow-request--proposal--payment--delivery): **built 2026-10-13 up to payment.** Request → quote (price, due date, note, expiry) → paid → on the easel (sketch → render) → delivered, on real data, in the artist's queue and the buyer's requests, with notifications at each step. **Paying waits on the payments provider** (decided 2026-10-13: the order stops at "Awaiting payment"; the team marks test orders paid with `npm run orders`). Next: checkout, then email for the steps that need the buyer.
7. ["Notify me"](#brief-notify-me-when-a-service-reopens), on the in-app notifications (built 2026-10-12; a new `service_reopened` kind) plus email.
8. ~~Character (OC) pages, the blueprint's other pillar~~ **Built 2026-10-12** as part of the [gallery](#brief-the-gallery-characters-and-collections). Next for characters: art other artists made of your OC (delivered commissions, credited), then ownership transfer.

**Later in Phase 1:** [artist track record](#brief-artist-track-record) (needs real orders), account deletion & data export, the rest of the AI-training protection.

---

## Phase 1: Foundations & MVP

Goal (blueprint): launch the core discovery → transaction loop, validate that artists publish and sell, and don't wait for every future idea.

| Item | Scope | Status | Notes |
| ---- | ----- | ------ | ----- |
| Auth & accounts | Sign-up, sign-in, roles, permissions | **Built (Supabase)** | Real accounts since 2026-10-10: email + password sign-up with a handle, sign in with email **or** handle, sign out, password reset (`/new-password`), email confirmation (`/auth/confirm`). A database trigger creates each profile; invites are separate (see the [brief](#brief-artist-invite-codes)). Real profiles show at `/{handle}` beside the demo artists. **Before opening sign-ups:** Resend as Supabase's SMTP (the built-in mailer only reaches the project team) (redirect URLs are set). Social logins: **Google and Discord on** (2026-10-10); Twitch shows faded and disabled until 2FA is on for the owner's Twitch account and its app exists. A button turns on by itself once its provider is on in Supabase. Accounts without a handle (first social sign-in) go through `/join/handle` ("Connected to Twitch as @…", handle prefilled from their username). **Team roles and permissions** (user, moderator, admin) planned 2026-10-15: see the [brief](#brief-team-roles-and-permissions). |
| ↳ **Settings** | Account (email, password, ways to sign in, where you're signed in), notifications (mute per kind), privacy (like counts, local time, who sees what), appearance (theme, wall size) | **Built (real)** | Request, 2026-10-15 (VGen's three settings screens, "without the VGen parts, adapted to how our system works"). `/settings`, from the account menu. **Needs:** the `account_settings` migration applied to production, and "Manual linking" switched on in Supabase for connecting Google / Discord / Twitch to an existing account. Left out on purpose, each waiting on its own work: 2-step verification, delete account / download your data, content preferences + birthdate, blocked users. See the [brief](#brief-settings). |
| ↳ **Artist codes: who can sell** | Anyone joins, browses and commissions; selling (services, adoptables) takes a single-use artist code, used at sign-up or later; the Artist mark on profiles; the codes you hold, and who used each | **Built (real)** | Request, 2026-10-14 (VGen's model, Toyhouse's invitations page). `/codes`, the strip on a collector's own profile, the gift when codes arrive, the welcome + Artist Pass post. **Codes are earned (2026-10-14):** an artist code lets you sell, not invite; 10 followers and $100 in sales make you a **verified artist** with 2 codes; more come only with Flow+ (1 a week). Sabrina (@shinllz) and Ipphie hold 6 each. See the [brief](#brief-artist-invite-codes). |
| Artist profile | Banner, identity, links, post feed + composer, free vs Pro appearance | Prototype | `/[handle]`. Pro gating in `resolveAppearance()`. |
| ↳ **What you draw: artist categories** | Sign-up asks "What do you draw?" (Humans, Anthro / furry, Humanoids, Ferals, Ponies; several or all); Edit profile adds what you make (OC design, concept art, backgrounds, chibi, pixel art, emotes, ref sheets, animation). The profile shows them as labels ("Furry artist", "OC designer", "Draws it all"); Explore's open studios filter by them, and each label opens that filter | **Built** | Request (Sabrina), 2026-10-11. `profiles.draws` (enum `draw_tag`), list in `src/lib/profile/draws.ts`. Explore's studios are demo data, so the filter runs over them until real services exist. See the [brief](#brief-what-you-draw-artist-categories). |
| Portfolio & gallery | Upload, tags, credits, content warnings, visibility, ordering | **Built (real)**, partly | Request, 2026-10-12. `/{handle}/gallery` with characters, collections and every piece (Supabase `artworks`, `characters`, `collections`). Upload up to 12 at once (AI check), titles, personal / commission for @client, tags. **Every picture you post hangs in your gallery too** (2026-10-14), tied to its post. **Not yet:** content tags (their own [brief](#brief-content-rating-mature-art-hidden-until-you-click)), visibility, reordering. See the [brief](#brief-the-gallery-characters-and-collections). |
| Characters (OCs) | Character page: lore, refs, gallery, creator, credits | **Built (first pass)** | 2026-10-12. `/{handle}/characters/{slug}`: a reference sheet (cover, colors, species, pronouns, designed by / kept by, personality, tags), story, art in sections; saved on their own to favorites; linked to their adoption listing. **Not yet:** art by other artists on your OC, ownership transfer and history (needs the license decision), characters in Explore and search. See the [brief](#brief-the-gallery-characters-and-collections). |
| Adoptable listings | Create/edit listing; flatsale, auction, offer; available / reserved / adopted | **Built (real)**; checkout waits | Request, 2026-10-12. Artists list ready-made characters from `/studio` (pictures, name, species, fixed price, what comes with it) and set Available / On hold / Adopted in one click. Buyers see them on `/{handle}/adoptables` with a ready-made sheet ("pay and it's yours", no request) whose buy button says checkout opens soon. Fixed price only; auctions and offers stay in Phase 3. See the [brief](#brief-listings-and-discovery). |
| Commission services | Services with examples, price, turnaround, ToS; request form | **Built (real)**; payment waits | Request, 2026-10-12. Artists create and edit services from `/studio` with a live preview of the sheet buyers see: examples (up to 6, AI check), category, styles, description, **packages** (e.g. Sketch / Lineart / Full color, each with a price and what it adds), turnaround in days, **slots**, licenses and add-ons. Buyers pick a package in the request dialog; the request stores it. Per-artist terms of service for real accounts aren't editable yet. See the [brief](#brief-listings-and-discovery). |
| ↳ **Licenses and add-ons, ticked under the price** | Each service lists its licenses (Personal, Commercial: Content, Commercial: Merchandising) and optional add-ons right under the price. Each one is **included** (comes ticked and locked), sold on top for a fixed amount (+$10) or a share of the price (+200%), or, for licenses, not offered. Ticking updates the price; the ticks carry into the request | **Built** | Request, 2026-10-11 (sketch: "$50 · +10 shading · +10 animation"; "when it's included it comes ticked"). Only some services have add-ons. Rules in `src/lib/commissions/addons.ts`; the request stores what was ticked, priced in USD, as a snapshot. Percentages apply to the chosen package's price. **2026-10-12:** artists edit them in the service editor. |
| ↳ **Per-service status, set in one click** | Each commission type is Open, Waitlist or Closed on its own; one click changes it; closed ones leave discovery right away | **Built** (most of it) | Stakeholder request, 2026-10-10. **Built 2026-10-12:** a three-way control on each service in `/studio` with Undo, Pause all / Resume (restores each service exactly), closed services greyed at the end of the profile and out of default search, a slot taken by each request and given back on decline or cancel, the "when full" status (Waitlist or Closed) and reopening when a slot comes back. **Not yet:** "Reopen on <date>" and the 30-day nudge. See the [brief](#brief-per-service-status-set-in-one-click). |
| ↳ **"Notify me" when a service reopens** | One click on a closed service; everyone who asked is notified when it opens again | **Planned (P1)** | Stakeholder request, 2026-10-10. Pulls a minimal slice of notifications into Phase 1. See the [brief](#brief-notify-me-when-a-service-reopens). |
| ↳ **Commission flow: request → proposal → payment → delivery** | Slots, artist review (accept / decline / waitlist), proposal + payment link by email, order tracking, delivery, credit on both sides | **Built up to payment** | Stakeholder request, 2026-10-10, checked against VGen's docs. **2026-10-13:** real orders (`commission_requests`): the artist quotes (final price, delivery date, note, expiry of 1–14 days, default 3), waitlists or declines (with an optional word); the buyer declines a quote or takes a request back; expired quotes close themselves and give the slot back; the artist starts, sets the step and delivers up to four files with a note (the originals are kept, checked on the server, and the buyer downloads them from the postcard through signed links, since 2026-10-14); both sides get in-app notifications. **Payment:** no provider yet, so orders wait at "Awaiting payment" (decided 2026-10-13); the team marks test orders paid (`npm run orders -- paid <id>`). **Not yet:** checkout, email, revisions, ToS snapshots for real artists, credit on the buyer's profile / OC. See the [brief](#brief-commission-flow-request--proposal--payment--delivery). |
| ↳ **My commissions: the artist's queue** | Every order from request to delivery, as a board (tickets dragged between columns) or a ledger; filter tabs, search, next-step buttons, an order drawer (accept / waitlist / decline, steps, pause, archive, note to self) and a planner of the week's deadlines | **Built (real orders)** | Request, 2026-10-11. `/commissions`, linked from the account menu. **2026-10-13: real orders only** (the sample orders were removed): an artist with none yet gets an empty board and a "List a service" note pointing at `/studio`. Tickets can't be dragged; each moves as its order is processed, from the drawer: Send quote / Waitlist / Decline, Start sketching, the paint-stroke steps, Deliver (files + note). Pause, archive and the private note are saved on the server. **Decided 2026-10-11: tickets move only as the order is processed.** With real orders, a ticket's column is derived from its order's state; nobody drags a card into a column its order hasn't reached. The prototype's free drag-and-drop is gone. See the flow's acceptance criteria. |
| ↳ **My requests: the buyer's side** | Every commission you asked another artist for, as postcards on their way to you: the art on a postage stamp worth the price, a postmark for where it stands, the route (Sent → Quote → Paid → In the works → Delivered) stamped with dates, the next step (pay the quote, wait, see progress, the delivered piece); a shipping label with the next arrival; filters (All, Your move, Waiting on the artist, In the works, Delivered, Closed) | **Built (real orders)** | Request, 2026-10-11. `/requests`, linked from the account menu. **2026-10-13: real requests only** (the sample requests were removed): every request you send is stored in Supabase, including those to the demo artists (`demo_artist`; they never answer), and follows the whole order: sent (with the package and add-ons you ticked, "Take it back"), the quote (with the artist's note, "Decline the quote", and "Pay $X · checkout opens soon"), paid, each step, the delivered piece. No requests yet: an empty postbox pointing at search. Visitors are sent to sign in before they fill in a request. |
| ↳ **Artist track record** | Does this artist deliver? Delivered, on time, cancellations, disputes, reply time and reviews, shown as facts plus a "Reliable" badge; an internal trust score for moderation | **Planned** | Request, 2026-10-11. Recorded from the commission flow's first order; shown once an artist has enough orders. See the [brief](#brief-artist-track-record). |
| Discovery & search | Explore, search, filters, tags | **Built (first pass)** | Request, 2026-10-12. `/explore/search`: commissions, adoptables and artists by name, category, style, who they draw, price range, availability and turnaround; sorted by relevance, recent or popular; the URL is the state. `/explore/popular`: the week's most-liked pieces, featured artists, popular commissions, new studios, adoptables. Explore's open studios and adoptables include real listings; its categories, the header's Explore menu and the autocomplete lead to search. Simple rules over a cached list (no model). **Explore is the salon wall since 2026-10-14:** every piece (gallery, posts, characters, adoptables, commission examples) edge to edge at its own size, with tabs, palette, "open for commissions", search and four orders in the URL, a viewer with a wall label, infinite paging, GIFs that play only on screen; the old landing is `/explore/studios` (see the request log). **Later:** move matching into Postgres (full-text + trigram) past a few thousand listings; personalized ranking (Phase 2). See the [brief](#brief-listings-and-discovery). |
| Checkout & orders | Platform fee (about 5%, `PLATFORM_FEE_PERCENT`), order history, minimal refund/dispute flow | Needs decision | Payments provider. Commissions pay through the [commission flow](#brief-commission-flow-request--proposal--payment--delivery). |
| Media upload & delivery | Limits, validation, thumbnails, CDN, metadata stripping | **Built (first pass)** | Supabase Storage, public `art` bucket, one folder per account (policies: write/delete only your own). The browser resizes (posts 2400px, cover 2400px, picture 512px; never enlarges), re-encodes to WebP (strips EXIF) and **extracts the palette** before uploading straight to storage (no server hop, 10 MB cap). Next/Image serves them. **2026-10-11:** small images (≤ 640px) stay lossless PNG, and transparent ones stay PNG in browsers that can't encode WebP (Safari), instead of a JPEG that blackens transparency (messages excepted: their bucket takes no PNG). A new picture or cover is **framed first** (zoom + position, `<ImageCropDialog>`). Open: delete an account's files when the account is deleted; moderation/scanning; cropping animated GIFs (they go up whole for now). **2026-10-12:** the [original images plan](#brief-original-images-cheap-and-safe) is approved (originals + display copy + thumb, art straight from storage's CDN, server check, backups; then R2): ~$35–45/month at a year-one scale against ~$1,800 today. **Step 1 built 2026-10-14** (originals, thumbs, our own loader, metadata stripping, server check, upload limits); backup waits on R2. |
| Admin & moderation | Reports, takedowns, essential analytics | Needs decision | Moderation policy. Roles and what each can do: [team roles and permissions](#brief-team-roles-and-permissions) (planned 2026-10-15). |
| ↳ **Back office (`/admin`): the team's dashboard** | Accounts, daily active, sign-ups, commissions funnel, money through the platform, our revenue, Flow+, shop, activity | **Built** | Request, 2026-10-15 (project lead). Admins: robindev, shinllz, ipphie (`team_members`, `npm run team`). Daily active accounts recorded from 2026-10-15 (`daily_activity`, one mark per account per day), earlier days inferred from activity. **Money is estimated until checkout:** paid orders are the ones the team marks paid, adoptables the ones artists mark sold, Flow+ is given by the team. **Not yet:** visitors who aren't signed in (Vercel Web Analytics would cover them), plan cancellations (members are counted back from today's), the fee charged per payment (comes with checkout), CSV export. |
| ↳ **Reporting: posts, comments, profiles** | "…" → Report on anything people post; reasons; block/mute; team review queue; outcomes and appeals | **Planned (P1)** | Request, 2026-10-11. Needed before sign-ups open beyond invited artists: posting is real and the site is public. See the [brief](#brief-reporting-and-keeping-artiflow-human-made). |
| ↳ **Team roles and permissions: users, moderators, admins** | Granular permissions behind three roles; moderators review reports, hide and remove content, warn and suspend up to 30 days, with no access to money, settings or the team; admins add bans, reversals, the team, rules, money and the dashboard; a required rule on every action, an append-only audit log, appeals decided by someone else, private messages seen only through a report; an account standing page with appeals | **Planned (P1)** | Request, 2026-10-15 (project lead, a written proposal; planned only, not to be built yet). Lands with reporting: the queue is the moderator's first tool. `team_members` already takes `moderator`, but today only admins open anything. See the [brief](#brief-team-roles-and-permissions). |
| ↳ **Made by humans: no generative AI** | The rule; agreement at sign-up and on paid listings; AI-generator check on upload; AI reports reviewed evidence-first, with private process requests | **Planned (P1)**; **generator check Built** | Request, 2026-10-11 ("only real posts"). **Rule and strikes decided** 2026-10-11. **Built 2026-10-11:** every upload (posts, picture and cover, profile background, About board) is checked for AI generators' marks before it's re-encoded, with an "I made this myself" review request. See [Part 2](#part-2-ai-generated-art). |
| ↳ **Content tags: sensitive art hidden until you click** | Artists tag their work (artistic nudity, suggestive, sexual content, gore, violence, flashing, revealing clothes, other). 18+ tags are covered and only confirmed adults can reveal them | **Planned (P1)** | Confirmed 2026-10-11: adult art is welcome, tagged and hidden. Tags replace a single "Mature" switch (2026-10-11). See the [brief](#brief-content-rating-mature-art-hidden-until-you-click). |
| ↳ **Keep our art out of AI training** | Block AI crawlers, `noai` tags, scraping ban in the terms; check that our resize + WebP doesn't weaken Glaze/Nightshade | **Planned** | Confirmed 2026-10-11. See [What else](#what-else-confirmed-2026-10-11). |
| ↳ **Guidelines, terms & copyright takedowns** | Community guidelines (incl. the AI rule and strikes), terms, privacy; a takedown form that works **without an account** | **Planned (P1)** | Needed before sign-ups open widely, and the decided AI rule and strikes need to be published. See [What else](#what-else-confirmed-2026-10-11). |
| ↳ **Account deletion & data export** | Delete account + files; download your data | **Planned** | Confirmed 2026-10-11. International privacy laws (GDPR, LGPD, CCPA). See [What else](#what-else-confirmed-2026-10-11). |
| ↳ **Spam & sign-up protection** | Bot check at sign-up; rate limits on posts, comments and reports | **Planned (P1)** | Confirmed 2026-10-11 ("we must have this"). See [What else](#what-else-confirmed-2026-10-11). |

Built ahead of plan: the **Ember** dark theme (the blueprint deferred dark mode) and a chronological **home feed** (`/`).

## Phase 2: Monetization & interaction

| Item | Status | Notes |
| ---- | ------ | ----- |
| **Flow+** subscription (was "Pro"): fully custom profiles and small extras | Needs decision | Renamed by the project lead, 2026-10-10. **Price: US$6.99/mo** (decided 2026-10-10). Exact scope open. **Decided perk: animated GIF profile picture and cover** (free accounts: still images), enforced in the database. **Customization built (2026-10-11):** Flow+ unlocks every theme + own colors, background patterns/images, name fonts/gradients/effects, button styles, sidebar side, custom CSS, HTML blocks and a 60-block About board; free keeps 5 themes, name color, 2 fonts, glow, rounded/pill buttons, dots pattern, free frames and a 10-block board. The shop at `/shop` (since 2026-10-15 the "Artiflow Supply Co.": frames, profile effects, animated names and covers, sticker packs, pins; prices $0.99–$3.99 are placeholders until shop pricing is decided) sells to everyone; **decided perk (2026-10-15): Flow+ takes one paid shop item a month, free** (the monthly pick). `profiles.plan` (`free`/`flow_plus`) is set by the team with `npm run plans` until billing exists; `profiles.plan_since` records when it started. Code still calls it `pro`. **Plans page built** (`/plans`, artist trading cards: your plan, since when, upgrade path); upgrade and checkout wait on the payments provider. |
| Higher tier (name TBD, working name "Flow+ Live"): live streaming, everything in Flow+, future features | Needs decision | Requested 2026-10-10. **Price: US$9.99/mo** (decided 2026-10-10). Needs a streaming provider. |
| Real-time chat (buyer ↔ artist) | **Built** | Request, 2026-10-11. Direct messages between any two accounts, live (Supabase Realtime, private channels): inbox in the header with unread, search, archive; a chat window over any page with the other person's **studio card** beside it (rating, commission status and slots, prices, links, Request a commission); pictures (private storage, AI check on upload), "Seen", typing ("… is sketching"), "Here now". **Arrivals (2026-10-12):** an airmail letter drops onto the page, the studio chime rings (a tune per sender), "(n)" in the tab title, optional desktop alerts. **Connections (sized for ~5k online, most browsing):** WebSocket only while the chat is open; otherwise a tiny HTTP pulse to Supabase, one per browser (tabs share it), every 20s while the page is used, slower when idle or in the background: ≈150 requests/s at 5k online, ~1 ms each. The Pro plan's 500 Realtime connections go to people actually chatting. `NEXT_PUBLIC_MESSAGES_LIVE=visible` switches to sockets on every visible tab (instant letters everywhere, ≈$40/mo at 5k online, spend cap off) if the database ever feels the pulses. **Later:** Web Push for background tabs and phones (no polling at all; needs the person's permission), with the notifications work. Visual concept: **studio mail** (postage stamps, postmarks, wax seals, a postcard to open each conversation). Demo artists can be written to but say they won't answer. **Next:** report / block from a conversation (with the [reporting brief](#brief-reporting-and-keeping-artiflow-human-made)), email when a message waits unread, and the [commission flow](#brief-commission-flow-request--proposal--payment--delivery)'s requests, proposals and orders shown inside the conversation (VGen manages requests in chat). |
| Notifications | **In-app Built**; email Planned | **Built 2026-10-12**, as the artist's **guest book** (the book on an artist-alley table that visitors sign): the bell opens today's page, `/notifications` the whole book (a week of tally marks, the most liked piece as a polaroid, new faces; filters as sticky page flags). Real and in-app: follows, likes, comments, replies, @mentions (comments and posts), reposts, someone joining with your invite, a welcome note, and commission requests (new, cancelled; accepted / waitlisted / declined to the buyer). Written only by database triggers (`notifications`), so taking it back (unlike, unfollow, delete) takes the notice back, and follow / unfollow / follow can't ping twice. **Likes stay anonymous**: one notice per post with a tally of new likes, never a name. Opening the bell or the page marks everything read. No new connections: the badge rides the messages pulse (`message_pulse()` now also counts unread notices), and notices arrive live on the chat socket while it's open. **Not yet:** email (with Resend, after the domain), Web Push, "Notify me" and the rest of the [commission flow](#brief-commission-flow-request--proposal--payment--delivery)'s kinds (proposal, paid, delivered), pruning old notices (pg_cron). **Per-kind mute built 2026-10-15** in [Settings](#brief-settings) (commission notices stay always on). |
| Follow, likes, favorites, wishlist, reviews | **Follow, likes and favorites Built**; wishlist Prototype | **Favorites built 2026-10-11:** every save button is real (bookmark on posts and commissions, heart on gallery and Explore pieces), stored in `favorites` (private, per account). `/favorites` is the artist's moodboard: a swatch card mixed from the saved art's colors, the commissions and adoptables you're saving up for on a line, and the art and posts on a wall, filterable by kind and color, with unpin + Undo. **Follow and likes built 2026-10-12:** Follow on profiles, the feed's studio visit and the commission dialog (`follows`; demo artists by handle), follower and following counts on profiles, the home feed's Following tab from real follows; likes on posts (`post_likes`) on the feed and on profiles. Who follows whom is public; **who liked what is private** (only counts are public, `post_like_counts()`), so liking mature art never shows anywhere. Brakes: 5000 follows, 400 new a day. Each like or follow refreshes the feed and profile caches (like comments do): fine now, but move counts off the shared feed cache when likes get frequent. **Not yet:** followers / following lists, likes on gallery pieces (the heart there saves to favorites). Reviews shown on commissions. Collections (several named boards) wait for Phase 3. |
| Algorithmic discovery feed | Planned | Today's feed is chronological. |
| Character ownership transfer & structured licenses | Needs decision | Licensing and ownership rules. |
| Sales dashboard & stats for artists | Planned | |
| Commission extras | Planned | Instant orders (fixed price, pay first, no review), milestone payments/deposits, custom request-form questions per service. |

## Phase 3: Growth & advanced

| Item | Status |
| ---- | ------ |
| Auctions (characters and art): bidding, closing, payment, disputes | Planned |
| Collections, communities, richer discovery | Planned |
| Pro-artist tools and curation | Planned |
| Moderation, support and ops at scale | Planned |

## Phase 4: Mobile apps (last)

iOS and Android come only after the web product proves retention, volume and real mobile needs. Mobile web stays first-class throughout.

---

## Brief: per-service status, set in one click

- **Requested by:** stakeholders, 2026-10-10
- **Phase / priority:** Phase 1, P1 (part of "Commission services")
- **Status:** Planned

### Problem

Artists sell several kinds of commissions at once. One artist might list five: headshot, half-body, full-body, ref sheet and emotes. Each one is its own listing and shows up in Explore and search. When the artist wants to pause three and keep two, pausing has to take almost no effort.

Toyhouse lets you deactivate a listing, but the flow is tedious enough that most artists skip it. The listings go stale, buyers request things that aren't available, artists turn people down by hand, and buyers stop trusting what discovery shows them. VGen also has statuses per service, but you change them inside the service settings.

### Where the code is today

Status (`open | waitlist | closed`) and slots belong to the **artist** (`CommissionSummary` in `src/lib/profile/types.ts`), not to each `CommissionService`. Explore's "Open studios" shows one sheet per artist (`Studio` in `src/lib/explore.ts`). So today there's no way to change a single commission type.

### Proposal

1. **Each service has its own status.** It can be **Open**, **Waitlist** or **Closed**:
   - **Open:** take requests now.
   - **Waitlist:** take requests, but the buyer knows there's no start date yet (see the [commission flow](#brief-commission-flow-request--proposal--payment--delivery)).
   - **Closed:** no requests.

   The profile-level status is derived from the "most open" service (Open > Waitlist > Closed), so it can't drift. VGen derives it the same way.
2. **One click, in place.** On their own commissions page, the artist sees a three-way control (Open · Waitlist · Closed) on every service row. Any state is one click away. There's no settings screen, no form and no confirmation dialog. An "Undo" toast covers mistakes.
3. **Pause everything.** One switch at the top ("Pause all commissions") for breaks and holidays. Resuming brings back exactly the states each service had before.
4. **Instant effect.** A closed service drops out of Explore, search and the home "Open commissions" widget on the next page load (Server Action + `updateTag`). Waitlist services stay discoverable with a "Waitlist" label. Requests already sent aren't affected; changing the status only affects new ones.
5. **Status changes on autopilot.** This addresses "most people ignore it" from the other side, so the artist doesn't have to remember:
   - When the last slot is taken, the service switches to the "when full" status the artist chose (Waitlist or Closed). See the [commission flow](#brief-commission-flow-request--proposal--payment--delivery).
   - The artist can set "Reopen on <date>", which feeds Explore's existing "Opening soon" tab and countdown.
   - After a long quiet stretch with no requests, the artist gets a nudge ("Still taking ref sheets?") with **Keep open / Close** buttons right in the notification.
6. **Visitors** see a closed service greyed out with a "Closed" rubber stamp (Explore's stamp language). They can't request it, but they can tap ["Notify me"](#brief-notify-me-when-a-service-reopens).

### Acceptance criteria

- On the commissions page, changing a service's status takes 1 click: no page change, no modal.
- A closed service can't be requested. The button is disabled and the server action rejects it too.
- After closing, the service is gone from Explore, search and the home widget on the next load.
- Pause all → Resume restores the previous per-service states exactly.
- Status is shown as text + icon, not just color, and the control works by keyboard and screen reader (radio group).
- Owner-only. Visitor view (eye button) shows the visitor version.

### Out of scope for this item

Scheduled *closing* (it comes later with timers), bulk price edits, the "Unlisted" status (hidden from the profile but reachable by link, which VGen uses for supporter-only openings) — revisit in Phase 2.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| Should closed services stay on the profile or disappear? | **Settled by the "Notify me" request:** keep them, greyed out and moved to the end. The "Notify me" button lives on them. |
| Keep Waitlist as a third state per service? | **Yes**, now that we've checked: Waitlist is a real request queue artists use on VGen (see the [research](#how-vgen-does-it-checked-2026-10-10)). A three-way control still takes one click. |
| How long without requests before the nudge? | Start at 30 days and tune it with beta artists. |

### Implementation sketch

- Types: move `status` and slots into `CommissionService`; derive `CommissionSummary.status`.
- Server Action `setServiceStatus(serviceId, status)` + `pauseAllCommissions(paused)`, owner-checked, invalidating the services, profile and Explore tags.
- Client island `ServiceStatusControl` with `useOptimistic`, plus an undo toast.
- Explore: index *services*, not artists. A studio sheet shows only that artist's open/waitlist services, and artists with nothing available are left out.

---

## Brief: "Notify me" when a service reopens

- **Requested by:** stakeholders, 2026-10-10. They called it "Wait list" after VGen, but VGen's Waitlist is something else (see the [naming note](#naming-notify-me-is-not-the-waitlist)).
- **Phase / priority:** Phase 1, P1. Ships with (or right after) [per-service status](#brief-per-service-status-set-in-one-click).
- **Depends on:** per-service status, signed-in buyers (auth), and minimal notification delivery (in-app + email), which moves forward from Phase 2.

### Why it matters

- **Buyers:** a closed service stops being a dead end. One click, and they hear about it when it reopens.
- **Artists:** buyers are already waiting when a service reopens, so they don't have to rebuild demand on social media.
- **Platform:** this gives artists a reason to actually close services. If closing meant losing interested buyers, artists would leave stale listings open, which is the Toyhouse problem. When closing collects interested buyers instead, closing is the smart move. Each feature makes the other work.
- **Blueprint metrics:** it speeds up the time to first sale and raises listing conversion.

### Naming: "Notify me" is not the Waitlist

On VGen, **WAITLIST is a service status**. Buyers send a normal request, which waits in a separate tab with no start date until the artist sends a proposal. Our code already uses "waitlist" with that same meaning (`"Waitlist only"`). The button that only notifies is a different feature. VGen mentions "comm / waitlist opening notifications" for client accounts but doesn't document how they work.

So we keep **Waitlist** for the request queue, as artists already know it, and call this feature **Notify me**.

### Proposal

1. **One click to subscribe.** Every closed service shows **Notify me** (bell icon) on the profile and in Explore. The "Opening soon" sheets already have a "Notify me" button to reuse. There's no form. Clicking again unsubscribes. A signed-out visitor is sent to sign in and comes back already subscribed.
2. **The artist sees the demand.** Each closed service shows "23 want this" to its owner. The status control says "Open · 23 people will be notified", which is extra information, not an extra step.
3. **Reopening notifies everyone.** When a service goes from Closed to Open or to Waitlist, each subscriber gets an in-app notification and an email, e.g. "Mira reopened Ref sheets: 4 slots, from $45". The link opens that service with the request dialog ready.
4. **Scheduled reopen.** With "Reopen on <date>", subscribers get a heads-up 24 h before and the notice at opening time. Explore shows the countdown.
5. **Pause all → Resume.** Each service notifies its own subscribers. If someone follows several services from the same artist, they get one combined notification.
6. **No spam.** Notifications go out only after the Undo window ends, and a service sends at most one reopen notice per 24 h, so closing and reopening over and over doesn't flood anyone.
7. **One-time.** Once notified, a person is unsubscribed and can subscribe again later. This keeps each count a measure of current interest.

### Acceptance criteria

- Subscribing or unsubscribing takes 1 click on a closed service, both on the profile and in Explore.
- Open and Waitlist services never show "Notify me", since buyers can already request. Closed services always do.
- Leaving Closed notifies every subscriber of that service exactly once, in-app and by email, with a link that opens the service.
- Undo inside the toast window sends nothing. Reopening and closing several times within 24 h sends at most one notice.
- The artist sees the count per service before reopening. No one sees subscribers' names.
- Notified users are unsubscribed. Anyone can unsubscribe at any time, including through a one-click link in the email.
- Deleting a service clears its subscribers without notifying anyone.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| Show the count to visitors ("23 want this") as social proof? | Only the artist sees it at first. A public count helps popular artists, but it also puts "0" on small ones, and the blueprint wants small artists to be found. |
| Can the artist see *who* subscribed? | Only the count in the MVP, for privacy. Revisit after artist interviews. |
| Give subscribers a head start (e.g. 1 h before Explore lists the service) when slots are limited? | Phase 2+. First measure whether slots already sell out to subscribers. |
| "Notify me when *any* of this artist's commissions open"? | Handle it through Follow plus a "commissions opened" notification for followers, as part of Phase 2 notifications. |

### Implementation sketch

- `ReopenAlert { serviceId, userHandle, createdAt }`; Server Actions `subscribeReopen` / `unsubscribeReopen`; counts cached under a per-service tag.
- Leaving Closed schedules the notice as a delayed job that runs after the Undo window, with the 24 h throttle. The job runner depends on the backend stack, which is still undecided.
- New `NotificationKind`: `"service_reopened"`, with combined delivery per artist.
- UI: a `NotifyMeButton` client island (optimistic toggle). Reuse the "Notify me" from `studio-sheet.tsx` and the stamp language.

---

## Brief: commission flow, request → proposal → payment → delivery

- **Requested by:** stakeholders, 2026-10-10, describing how VGen works. We checked the description against VGen's help center before adopting it.
- **Phase / priority:** Phase 1, P1. This is the blueprint's core loop (discovery → transaction).
- **Status:** **Built up to payment (2026-10-13)** on real data: requests, quotes with expiry, waitlist, decline, start, steps, delivery, notifications, slot accounting. The payment step waits on the payments provider: orders stop at "Awaiting payment" (decided 2026-10-13), and the team marks test orders paid with `npm run orders`.
- **Depends on:** auth, [per-service status](#brief-per-service-status-set-in-one-click), email + in-app notifications, payments provider.

### How VGen does it (checked 2026-10-10)

| Step, as stakeholders described it | What VGen actually does |
| ---------------------------------- | ----------------------- |
| 1. The artist opens a service with an exact number of slots (e.g. 10). | **Yes, but slots are optional.** The artist also chooses what uses a slot: a request arriving, a proposal being sent, or the client paying. When slots run out, the service switches to the status the artist picked (Waitlist or Closed). Timers can open and close a service on a schedule. An option gives back 1 slot at each final delivery. |
| 2. Buyers fill in a form (character, references…) until the slots are full, and must accept the artist's ToS first. | **Yes.** Each service has its own request form and ToS. The ToS is required and is attached to every request as the contract for disputes. "Until full" only holds when a slot is used up by a request arriving. |
| 3. The artist reviews and picks. A declined request frees its slot; once full, the service closes. | **Mostly.** The artist accepts or declines in any order; slots don't force first-come-first-served. Closing when full: yes. **Not documented:** a decline giving the slot back (only the "give back on delivery" option is documented). |
| 4. When the artist accepts, the buyer gets a payment page, also by email. | **Yes, as a proposal.** Accepting means sending a **proposal + invoice**: scope, guaranteed delivery date and final price. The listed price is only a "from" price. Payment can be full upfront or split into milestones. The buyer pays to accept, declines, or asks for changes. Reminders are sent by hand (~every 24 h), and VGen doesn't document an expiry. |
| 5. After payment it's official and appears on both profiles. | **Partly.** After payment, the buyer gets a receipt email and the order joins the artist's queue. Both sides track it in their dashboards. Emails go out at "work in progress" and delivery, and both leave reviews. Publicly, the artist can add "Verified Media" to their portfolio after delivery; the client is notified and can report it. We found nothing about it appearing on the *client's* profile. |

VGen also has **Instant Orders**: fixed price, the buyer pays immediately with no review, first come first served. Our Phase 2 lists them under "Commission extras".

Sources: VGen help center, ["How does the VGen commission system work?"](https://help.vgen.co/hc/en-us/articles/12820045188119), ["Is it possible to limit the amount of slots…?"](https://help.vgen.co/hc/en-us/articles/12820276795415), ["How do VGen Waitlists work?"](https://help.vgen.co/hc/en-us/articles/12820092428951), ["Client POV: What happens after request is sent?"](https://help.vgen.co/hc/en-us/articles/14264298768535), ["2. Add a service"](https://help.vgen.co/hc/en-us/articles/12728317172119), ["How do reminders work?"](https://help.vgen.co/hc/en-us/articles/12820284350999), ["How do Verified Media work?"](https://help.vgen.co/hc/en-us/articles/14880392771991), ["How do I change my profile status?"](https://help.vgen.co/hc/en-us/articles/12818070687895).

### Our flow

1. **Slots, one simple rule.** Slots are set per service and are optional. A slot is taken when a request arrives. It comes back when the artist declines or moves it to the waitlist, the buyer cancels, or a proposal expires. When the last slot goes, the service switches to the "when full" status the artist chose (Waitlist or Closed); when one comes back, it reopens. This matches what stakeholders expect and needs no setup. VGen's three counting options can come later if artists ask.
2. **Request form + required ToS** (this part exists). We'll store a snapshot of the exact ToS the buyer accepted on each request, so a later edit can't change the deal.
3. **The artist's inbox, per service.** For each request: **Accept** (send a proposal), **Decline** (optional reason; the buyer is notified and the slot comes back) or **Move to waitlist**. Waitlist requests are unpaid and either side can drop them with no penalty.
4. **The proposal is the payment page.** It holds the final price (the listed price is "from"), scope and delivery date, paid in full upfront in the MVP. The buyer gets it in-app and **by email**, with a pay link, so nobody has to keep checking the site. It **expires** after a set time (artist-set, default 3 days). One automatic reminder goes out 24 h before. When it expires, the slot comes back without anyone doing anything. VGen leaves reminders to the artist; we automate them.
5. **Payment makes it official.** The buyer gets a receipt email. The order appears in the artist's queue ("My commissions") and the buyer's "My requests", and moves through the blueprint's states (§7): awaiting payment → accepted → in progress → revision → completed, or cancelled / disputed. Emails go out on the important changes (work started, delivered).
6. **Delivery, credited on both sides.** At delivery, the artist can post the piece to their gallery as a `commission` artwork crediting the buyer (`Artwork.client` already exists). The buyer is notified and can flag it if it misrepresents the work. The buyer can show it on their own profile **and on the OC it depicts**. VGen doesn't do this last part, and it ties in with our character pages. Both leave reviews.

### Acceptance criteria

- Accept, decline and move to waitlist each take 1 click from the inbox. Accepting opens the proposal form already filled with the service's price, the licenses and add-ons the buyer ticked, and the turnaround.
- Taking or freeing a slot updates the service status and Explore right away. A declined, cancelled or expired request always gives its slot back.
- **A buyer who cancels says why (built 2026-10-14).** Taking back a request or declining a quote asks for a reason from a short list, plus an optional note ("something else" needs one); the artist sees both, in the notification and on the closed order. No silent cancels.
- **A service closes only when its commissions are done (decided 2026-10-15).** The artist can't close or delete a service by hand while any order on it is open (request, waitlist, quote, paid, in progress); the attempt explains what's left. Filling up still closes it on its own.
- Every state change that needs the buyer's action (proposal sent, expiring soon, declined) reaches them in-app **and** by email.
- Each request stores the ToS snapshot the buyer accepted.
- Without a payment provider, the flow runs end to end on mock data, with the payment step stubbed.
- **The queue follows the order (decided 2026-10-11).** On "My commissions", a ticket's column comes from its order's state and moves only when the order is processed: a request arrives (New requests), the artist sends the proposal (Awaiting payment), the buyer pays (Up next), the artist starts (On the easel), the artist delivers the final file (Delivered). Expiry, cancellation and refunds move it on their own. The artist's steps are actions that process the order (buttons in the drawer and the ledger), never a drag that skips one: only a payment puts a ticket in Up next. The sketch → render progress within On the easel stays the artist's to set.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| When does a request use up a slot? | When it arrives, and it's given back on decline, cancel or expiry. That's one rule, it matches what stakeholders expect, and it caps how many requests land in the inbox. |
| How long until a proposal expires by default? | 3 days, adjustable per artist. |
| Can buyers ask for a private commission (not posted)? | Yes, as a checkbox on the request form. The artist sees it before accepting, since some artists charge more for private work. |
| Allow requests from guests without an account? | No. Notifications, payment and order history all need an account, and it helps prevent fraud. |
| Deposits and milestone payments? | Phase 2 ("Commission extras"). Full upfront in the MVP. |

### Still to build (noted 2026-10-13)

What's built runs request → quote → paid → in progress → delivered on real data (see the status line above). Still to come, in rough order:

1. **Checkout.** The buyer pays the quote on Artiflow (the [payments brief](#brief-payments-how-the-money-moves)); paying moves the order to Up next by itself. Until then orders stop at "Awaiting payment" and the team marks test orders paid (`npm run orders`).
2. **Email** for the steps that need the buyer or the artist: new request, quote sent, quote expiring in 24 h, declined, paid, delivered. Needs the sending domain.
3. **Revision rounds.** After a step (sketch, final), the buyer approves or asks for changes, counted against what the service includes ("2 revisions").
4. **Terms of service for real artists**, edited in `/studio`, accepted on each request and stored as a snapshot on it (demo artists have theirs in mock-db).
5. **When a delivery frees its slot (decided 2026-10-15):** the artist chooses as they deliver, with an optional "Add 1 slot back to “<service>”" checkbox (off by default), as VGen does. Ticked, the order's slot goes back and a service that filled up reopens; otherwise it stays taken and the artist can still free it with "−" in the studio.
6. Later: credit on the buyer's profile and on the OC it depicts, reviews from completed orders, deposits / milestones (Phase 2).

### Implementation sketch

- Split the data into `CommissionRequest` (pending / waitlisted / declined / cancelled, plus `termsSnapshot`), `Proposal` (sent / expired / accepted, price, scope, due date, `expiresAt`) and `Order` (the blueprint's states).
- Routes: the artist inbox is `/commissions` ("My commissions", built 2026-10-11 as a UI prototype on sample orders; its rules live in `src/lib/commissions/queue.ts`), `/proposals/[id]` (the pay link target) and the buyer's `/requests` ("My requests", built 2026-10-11 as a prototype: real requests on top, a sample for the rest; its rules live in `src/lib/commissions/requests.ts`).
- Slot accounting lives in one function, used by every request transition, so the status can't drift.
- New notification kinds: `proposal_sent`, `proposal_expiring`, `request_declined`, `order_paid`, `order_started`, `order_delivered`.

---

## Brief: artist invite codes

- **Requested by:** project lead, 2026-10-10 (codes at sign-up, random, granted to specific artists) and 2026-10-14 (artist codes decide who sells; the Artist mark; codes for new artists and Flow+; the gift and the welcome).
- **Phase / priority:** Phase 1, with Auth & accounts and Admin & moderation (it's our first line against bots, AI sellers and scammers).
- **Status:** **Built, real data, 2026-10-14.** In production: Sabrina (@shinllz) and Ipphie hold 6 codes each.

### How the others do it (checked 2026-10-14)

| | VGen ([Artist Code Policy](https://help.vgen.co/hc/en-us/articles/38855847115415-VGen-Artist-Code-Policy), [how to get a code](https://help.vgen.co/hc/en-us/articles/20572952850967-How-do-I-get-a-code-to-become-an-Artist-on-VGen)) | Toyhouse (forums and guides; its FAQ blocks automated reads) |
| --- | --- | --- |
| Who needs a code | Only artists: anyone joins to request and track commissions; the code gives "artist access". | Everyone: registration takes an invite code. |
| Where codes come from | Artists share theirs; codes are tied to whoever shared them, who is answerable for whom they invite. | Premium members get 2 when they buy, then 2 every week (they roll over). |
| Rules | Free; never sold or traded; never posted publicly (not even partly hidden); no unscreened giveaways; send them in DMs. | (Not documented in the sources found.) |
| Where you see them | — | Settings → Invitations. |
| A "Verified" mark | Separate from the code: a track record (followers, earnings, reviews, rating, on-time rate), reviewed by hand. | — |

We follow VGen's model (open to everyone, a code to sell), with Toyhouse's two good ideas: a page listing your codes, and paid members getting codes on a schedule.

### How it works

- **Collector or artist.** Every account is a collector (browse, collect, commission). An artist code gives **artist access** (`profiles.artist_since`), the right to list commission services and adoptables. The database enforces it: restrictive insert policies on `services` and `adoptables`, and custom requests to a collector are refused.
- **Single-use codes** (`K7QH-3MPA`: 8 characters, no look-alikes, from a strong random source), in `invites`. The team grants them (`npm run invites -- grant @handle [count] ["why"]`), which makes the holder a (founding) artist. `list @handle` shows who used each code. `artist @handle` / `collector @handle` give or take access by hand.
- **Using a code, before or after.**
  - At sign-up: the sealed envelope, "Got an artist code?". It's optional: without one you join as a collector. Invite links (`/join?invite=CODE`) arrive with the envelope open.
  - Later, from three places: a strip on your own profile ("Are you an artist?"), which keeps asking until you're in; `/studio`, whose desk is the code sheet until then; and `/codes`.
  - `redeem_artist_code()` allows ten wrong tries an hour, then pauses guessing.
- **Codes are earned** (decided 2026-10-14 by the project lead with Sabrina and the team):
  - An artist code lets you **sell, not invite**. Using one gives no codes.
  - Reach **10 followers and US$100 in sales** (commission orders the buyer paid for, at their quoted price) and you're a **verified artist** (`profiles.verified_at`), with **2 codes**, once. The database checks the goals when they move: a new follower, an order paid or moving on, becoming an artist (`private.check_verification`). Verification stays once earned; the team can give or take it by hand (`npm run invites -- verify|unverify @handle`).
  - More codes only with **Flow+**: 1 every Monday for verified Flow+ artists (pg_cron, `grant_weekly_codes()`), until they hold 5 unused.
  - Unused codes from the first rule (2 for using a code) were taken back from artists who aren't verified.
- **The verified mark** is our version of VGen's "Verified": the Artist pass in a foil frame, "Verified artist", with "10+ followers and $100+ in sales" in its note. The Artist Pass stamps "Verified artist". `/codes` shows the two goals filling up for artists who aren't verified yet.
- **Missions in the corner** (2026-10-14): until they're verified, artists see a small "Missions 0/2" pill in the bottom-right of every page, with a ring showing how far along they are. A click opens a paper checklist with each goal ("4 / 10" followers, "$0 / $100" sales), the reward (verified mark + 2 codes) and a link to `/codes`. On the home feed it steps up above the floating Post button. It leaves once they're verified.
- **The Artist mark.**
  - On artists' profiles: a little exhibitor pass ("Artist") beside the name. It opens to "since October 2026, let in with @…'s code" (or "a founding artist").
  - Collectors show "Collector" beside their handle, and their profile has no Commission button, commission card or services.
- **`/codes` ("Artists let artists in.").**
  - Your Artist Pass, with Share.
  - Your codes as admit-one tickets: "To give" with Copy code / Copy invite link, or stamped "Used" with who and when.
  - "6 codes · 4 to give · 2 used".
  - The rules (VGen's policy in our words).
  - Account menu: "Artist codes · N to give", or "Have an artist code?".
- **The gift.** When codes arrive (team grants, Flow+'s weekly one), the next page opens a modal: an envelope tied with a ribbon, the tickets fanning out of it, "You've got 6 artist codes!". It shows once: `profiles.codes_seen_at` remembers, so it comes back only for new codes.
- **The welcome and the Artist Pass.** The moment a code goes through:
  - **"Welcome to the artists, {name}!"**: confetti, and your **Artist Pass** swinging in on its lanyard. The pass sits in a foil frame and shows your picture, your artist number (artists are numbered in the order they got in), since when, and whose code.
  - What opened, and your 2 codes.
  - The pass ready to post in one click, with a caption you can change. The post (`posts.milestone`, written only by the server) shows the pass in the feed and on your profile.
- **Guest book.**
  - The holder gets "@x used your artist code".
  - The new artist gets "You're an Artiflow artist now ✦" with a tiny pass.
  - Codes arriving gets "6 artist codes arrived for you to hand on", or "Your weekly Flow+ artist code".
- **Data:** `*_artist_access.sql`, `*_artist_codes_pass_on.sql`, `*_artist_pass_and_weekly_codes.sql`. **Tests:** `tests/e2e/artist-codes.spec.ts`.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| Should team accounts sell? | No by default (robindev and robson_silva are collectors). The team can use `npm run invites -- artist @handle` to test, or a code. |
| Codes expire? | Not yet. If unused codes pile up, expire them after 90 days and say so on the ticket. |
| Revoke a bad inviter's unused codes? | Yes, with the [reporting brief](#brief-reporting-and-keeping-artiflow-human-made): the chain (`invited_by`) shows who brought in a bad actor. |
| The artist health mark (VGen's "Verified", our own way) | **First version built 2026-10-14:** verified = the two goals above. The richer health (on-time rate, cancellations, reply time, reviews) is the [track record brief](#brief-artist-track-record), once real orders pile up. |
| Should founding artists be verified? | Not automatically: Sabrina and Ipphie hold codes from the team, and get verified by the goals like everyone (or by hand). |
| Adoptable sales towards the $100? | Once checkout marks them sold for real (today an artist can mark one sold by hand, so they don't count). |
---

## Brief: reporting, and keeping Artiflow human-made

- **Requested by:** project lead, 2026-10-11: report on posts, with reasons, and a strong focus on reporting AI use. "The idea is that only real posts are here."
- **Phase / priority:** Phase 1, P1. It has to land before sign-ups open beyond invited artists, since posting is real and the site is public.
- **Status:** Planned. The exact wording of the AI rule is Needs decision (recommendation below).
- **Depends on:** accounts, posts and comments (built); the notifications slice; a team-only review page.

### Why it matters

- **The promise is the product.** Explore already closes with "made by humans". A single AI piece found in Explore breaks that promise for every artist on the site.
- **Money raises the stakes.** Once commissions and adoptables are paid, AI art stops being only a content issue. It's fraud: the buyer paid for hand-made work.
- **The blueprint asks for it** (§8): spam, harassment, scams, art theft, prohibited content and moderation are part of the design from day one.
- **The other side:** an AI accusation can end a human artist's career. VGen's help center says it outright: it acts only when it is "100% certain", because "falsely accusing a human artist and destroying their livelihood is never worth the same as correctly removing a generative AI enthusiast". So the process has to protect artists who are accused unfairly as carefully as it removes AI.

### Part 1: report anything, in two clicks

1. **Where.** Every post gets the "…" menu. Today only authors see it, and only for delete. For everyone else it holds **Report post**, **Block @handle** and **Mute @handle**. Comments and profiles get the same, and so do services, adoptables and messages (all real since 2026-10-12; what a moderator may read in a conversation is set in [team roles](#brief-team-roles-and-permissions)). Visitors who aren't signed in are asked to sign in.
2. **The dialog.** Pick a reason, add an optional note, Send. That's two clicks in the common case. A few reasons ask one more thing:

   | Reason (posts) | Extra question | While the case is open |
   | -------------- | -------------- | ---------------------- |
   | **Made with AI** | Optional: "What did you notice?" (hands or anatomy · rendering that changes within the piece · objects or light that make no sense · garbled text or symbols · posts too much, too fast · I know the source) and a link | Stays up. See [Part 2](#part-2-ai-generated-art). |
   | **Stolen, traced or reposted art** | Link to the original. "This is my art" sends the case to the copyright takedown process. | Stays up. Higher priority when the original owner reports. |
   | **Missing or wrong content tags** | — | Stays up. Covered once a reviewer fixes the tags (needs [content tags](#brief-content-rating-mature-art-hidden-until-you-click)). |
   | **Sexual content involving minors** (including drawn characters who look like minors, whatever their stated age) | — | **Hidden at once**, top of the queue, and handled under the law (in the US, report to NCMEC). Never stays up. |
   | **Harassment, hate or bullying** | "Is it aimed at you?" | Stays up, high priority. |
   | **Violence, gore or self-harm** | — | Self-harm: the reporter sees where to get help; high priority. |
   | **Scam or fraud** | Fake commission, asks you to pay outside Artiflow, pretends to be someone else | High priority. |
   | **Spam** | — | Hidden once several established accounts report it. |
   | **Something else** | Note required | Stays up. |

3. **After sending:** "Thanks, we'll take a look." The reporter is offered Block or Mute right there. Blocking means the other account can't see your posts, comment or message you; muting only hides them from your feed. **Reporters stay anonymous** to the person they reported, always.
4. **Closing the loop.** Reporters see their reports and the outcomes under "Your reports" in the account menu, and get a notification when a case closes ("We removed the post you reported" or "We reviewed it and it doesn't break our rules"). When we act, the reported person is told which rule they broke and what was removed, and gets **one appeal**, reviewed by someone else.
5. **One case per item.** Duplicate reports group into a single case. The queue sorts by severity, then by how many people reported and how reliable they've been.
6. **Report abuse** is handled too:
   - Each account can send a limited number of reports per day.
   - Accounts whose reports keep getting rejected count for less.
   - A burst of reports on one artist from new accounts is flagged as a possible pile-on, not treated as proof.

### Part 2: AI-generated art

**The rule** (decided 2026-10-11):

> Everything posted or sold on Artiflow is made by people. No generative AI in any part of a posted image: not the character, not the background, not textures or fills, and not as a base you paint over. Ordinary digital tools are fine: stabilizers, liquify, filters, 3D posing models, photo references.

No upscalers that invent detail and no generative fill, however small. Drawing *from* an AI image you don't post (without tracing it) stays open until we've talked to artists. VGen bans generative AI too, so artists coming from there will recognize this.

**Prevention, before anyone has to report:**

1. **Agreement at sign-up.** One line in the join flow: "Artiflow is made by humans. I won't post or sell generative-AI art." It's backed by the community guidelines.
2. **Declaration on paid listings.** Commission examples and adoptables carry a "Made by me, no generative AI" checkbox. Selling AI art is fraud, and this declaration is what a refund rests on.
3. **Generator check on upload — Built 2026-10-11.** Our browser pipeline re-encodes to WebP and strips metadata, so the check runs first, on the original file. It's a standalone module, `src/lib/ai-check/`, so anything else that takes images can reuse it (commission deliveries, adoptables, moderation tools):
   - `signature.ts`, the detector. Plain TypeScript, so it runs in the browser, in scripts and on a server. It reads:
     - C2PA Content Credentials: the IPTC "trained algorithmic media" label, or the generator's own signature. Bing Image Creator signs "AI Generated Image" without the IPTC term, so the label alone isn't enough.
     - XMP/IPTC labels.
     - Settings in PNG text, EXIF and XMP: Automatic1111/Forge, ComfyUI, NovelAI, InvokeAI, Fooocus, Midjourney job IDs.
     - Settings hidden in the alpha channel's lowest bit ("stealth" PNG info from NovelAI and an A1111 extension). These survive metadata stripping and some re-exports.
   - `browser.ts`: `assertMadeByHumans(file)` throws an `AiImageError`, and `<AiImageDialog>` (`src/components/uploads/`) explains it and offers **"I made this myself"**. The request lands in `ai_review_requests`, limited to 10 a day, with no file kept. The team lists open requests with `npm run ai-check -- requests`.
   - Wired into every upload today: posts, profile picture and cover, profile background, About board images.
   - **Tested against real files:**
     - 12 out of 12 caught from Stable Diffusion (A1111 PNG and JPEG, stealth), ComfyUI, NovelAI, InvokeAI and Fooocus.
     - Bing Image Creator and Adobe Firefly caught through Content Credentials.
     - 0 false positives on 126 human-made images, nor on 13 files carrying non-AI Content Credentials (cameras, Photoshop).
     - `npm run ai-check -- <files>` runs the same check from the terminal. `npm run test:unit` covers every format, and an e2e test runs the whole flow in a browser.
   - **Limits.** 13 AI images downloaded from Wikimedia Commons had already lost their metadata, and they pass. A screenshot or a re-export removes everything too. The check also runs in the browser, so someone technical can skip it. It's a free filter for people who post a generator's file as it came. The real barrier is reports reviewed by people.
4. **Process as proof, from features we already have.** Posts already have stages (sketch → WIP → finished), and the feed shows the track. A finished piece linked to its own sketch or WIP posts gets a "Process shown" mark. It makes good feed content and is the artist's best defense if anyone ever questions the piece. It's encouraged, never required.

**How AI reports are reviewed: evidence first.**

1. **One report never hides or labels a post.** Reports collect into a case.
2. **A team reviewer** checks the piece **and the artist's history** against a written checklist, much like VGen's published list of signs:
   - hands, eyes and anatomy
   - rendering quality that shifts within one piece
   - objects, light and shadows that make no sense
   - garbled text or symbols
   - a sudden jump in every skill at once across past posts
   - more finished, polished work than one person could make
3. **AI detectors** (Hive's API, for example) can be **one input** in the reviewer's view, never the decision and never shown publicly. Detectors miss things and misfire, and each check costs money. Phase 2, after testing one on our own set of human-made art.
4. **When unsure, ask the artist privately.** "We received reports about this piece. Can you share your process?" Sketches, layers, WIP stages, a timelapse or the working file all count. The artist has 7 days, and the post stays up meanwhile with no public label. The reporter doesn't know a request was sent. Layered files and early sketches weigh more than a timelapse, because VGen notes an edited timelapse can hide AI tracing.
5. **Outcomes:**
   - **Cleared.** The case closes, and new reports on the same piece close by themselves so the same pile-on can't start again. If the artist shared their process, they're offered "Process shown".
   - **Confirmed AI** (only when certain, the same bar as VGen):
     - First time: the post is removed, with a warning and a strike.
     - Second time: posting is suspended for 30 days.
     - Selling AI art (commissions or adoptables): the account is suspended right away and buyers get a refund through the commission flow's dispute path.
   - **No answer to the process request.** The reviewer decides on the evidence alone. Silence isn't proof by itself.
6. **No public "suspected AI" labels**, ever. A piece is either removed or fine. Calling someone out in the comments falls under harassment ("report it, don't call it out", which is also VGen's line).

### Who reviews

The team, at first, on a minimal team-only page (`/admin/reports`). It shows the queue by severity. Each case shows the item, the reports, the artist's history and past cases. The actions are dismiss, remove, ask for process, warn and suspend. Access goes by the team's permissions (`team_members`, since 2026-10-15), not a flag on the profile; anything sent to that page is checked against them on the server. What moderators and admins may each do is in [team roles and permissions](#brief-team-roles-and-permissions). Community moderators come later (Phase 3, "Moderation at scale").

### Acceptance criteria

- Any signed-in user can report a post, comment or profile from its "…" menu in 2 clicks (reason → Send).
- One report per person per item. The reported person never learns who reported them.
- "Sexual content involving minors" hides the item at once and alerts the team.
- An AI report alone never hides or labels anything. Only a reviewer's decision removes a post for AI.
- Reporters get an outcome notification. Artists we act against get the rule, what was removed and an appeal link.
- An upload whose metadata names an AI generator is refused, with a way to contest.
- Report rate limits are in place, and pile-ons from new accounts are flagged.
- Blocking takes effect at once: the blocked account can't see your posts, comment or message you.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| Where exactly is the AI line? AI upscalers, generative fill for small cleanups, drawing from an AI image you don't post. | **Decided 2026-10-11:** strict on the posted pixels, so no upscalers that invent detail and no generative fill. Drawing *from* an AI image without tracing: decide after artist interviews. |
| Strikes | **Decided 2026-10-11:** remove + warn → 30-day suspension; immediate suspension for selling AI art. Reset after 12 months without a new strike. |
| Who reviews at launch? | The team, with the checklist, on `/admin/reports`. Write down every decision, because it becomes the precedent the guidelines grow from. |
| Rewards for reporting? | None. Rewards push people to over-report. Reporters just get the outcome note. |
| Should "Process shown" become an Explore filter? | Later, once we see how many artists post their process. |

### Implementation sketch

- **Tables:**
  - `reports`: reporter, target type + id, reason, details, created_at; one per reporter and target
  - `report_cases`: target, status, severity, outcome, decided_by, decided_at
  - `blocks`, `mutes`, `strikes`, `process_requests`
- **Access rules (RLS):** users can insert their own reports and read only their own. Cases, strikes and process requests are team-only, written by Server Actions with the secret key after a moderator check.
- **Server Actions:** `reportContent`, `blockUser`, `muteUser`; team actions on `/admin/reports`. Hidden and removed content is filtered in the feed, profile and Explore queries.
- **UI:** `PostOwnerMenu` becomes a general `PostMenu` (owner: delete; everyone else: report, block, mute). One `<ReportDialog>` per page, opened through window events, like the comments panel.
- **Upload:** the provenance check goes in `src/lib/images/prepare.ts`, reading C2PA/XMP/PNG text from the original file before it's re-encoded.
- **Notifications:** `report_resolved`, `content_removed`, `process_requested`, `appeal_decided`.

Sources: VGen help center, ["AI Policy"](https://help.vgen.co/hc/en-us/articles/12882944163991) and ["How to tell if an image is created with Generative AI?"](https://help.vgen.co/hc/en-us/articles/31672648933399) (both read 2026-10-11); [Hive AI-generated content detection](https://docs.thehive.ai/docs/ai-generated-content-detection).

---

## Brief: team roles and permissions

- **Requested by:** project lead, 2026-10-15, as a written proposal: three roles (user, moderator, admin), what each one can do, the moderator's starting permissions, the moderation desk's tools and six ground rules. "Implement granular permissions from the start, even if there are only these three roles at first." Planned only: not to be built yet.
- **Phase / priority:** Phase 1, together with [reporting](#brief-reporting-and-keeping-artiflow-human-made) (P1). The report queue is the moderator's first tool, so the two land together. The money permissions are defined now and wired in when checkout exists.
- **Status:** Planned. A few limits are still open (recommendations below).
- **Depends on:** reporting (reports, cases, the queue), notifications (built), 2-step verification for team accounts (recommended, see [settings](#brief-settings)), and checkout for the money side.

### Where we are today

- `public.team_members` (`admin` | `moderator`, secret key only, `npm run team`) has existed since 2026-10-15, with three admins (robindev, shinllz, ipphie). Only admins can open anything: `requireAdmin()` guards `/admin`, the back office dashboard with the money in it. Today a moderator has no page and no powers.
- Two other things already decide what an account can do, and they stay separate from team roles:
  - **Plan** (free / Flow+): what you can do with your own page.
  - **Artist access** (collector / artist / verified): whether you can sell.
  - **Team role** (none / moderator / admin): what you can do to other people's things. That's this brief.

### The three roles

| Role | Who | In one line |
| ---- | --- | ----------- |
| **User** | Everyone with an account (collector or artist, any plan) | Their own things, plus reporting and appealing. |
| **Moderator** | Team members an admin picks | Keeps the community safe: reviews reports, hides and removes content, warns, suspends for a limited time. No money, no settings, no team. |
| **Admin** | The founders, at first | Everything a moderator does, plus permanent bans, reversing decisions, the team, the rules, money and the dashboard. |

A user can create and customize their profile according to their plan; post art, characters and services; buy, sell and message; report profiles, posts, comments, messages, services and adoptables; and **see every decision made about them and appeal it** (new, see [Account standing](#what-the-person-sees-account-standing)).

### Permissions, not just roles

A role is a named set of permissions. Every check in the app and in the database asks for a permission ("can remove content"), never for a role ("is a moderator"). That way, a later role, such as a community moderator (Phase 3) or a support person who only sees orders, is just a new set and needs no new code. An admin can also give one person a single extra permission (refunds, to one admin, say) or take one away.

| Permission | What it allows | User | Moderator | Admin |
| ---------- | -------------- | ---- | --------- | ----- |
| `reports.view` | The report queue, each case, its evidence and its reporters | — | Yes | Yes |
| `reports.assign` | Take a case, or hand it to someone else | — | Take one, give it back | Anyone's |
| `content.hide` | Hide something while it's reviewed | — | Yes | Yes |
| `content.remove` | Remove something for breaking a rule | — | Yes | Yes |
| `users.warn` | Send a warning, add a strike | — | Yes | Yes |
| `users.suspend` | Suspend posting, selling or the whole account for a while | — | Up to 30 days | Any length |
| `users.ban` | Ban permanently | — | No | Yes |
| `users.delete` | Delete an account and its files for good | — | No | Yes |
| `users.investigate` | The person page: history, past reports, actions, team notes | — | Yes | Yes |
| `messages.read_reported` | The reported message and the messages around it, inside an open case | — | Yes | Yes |
| `orders.view` | An order's facts (status, price, dates, files) | Their own | Inside a case | Yes |
| `decisions.reverse` | Undo a decision | — | Their own only (logged as a correction) | Anyone's |
| `appeals.decide` | Decide an appeal | — | Yes, except on their own decisions | Yes |
| `money.refund`, `money.hold` | Refund a buyer, hold a payout | — | No | Granted by name |
| `metrics.view` | The dashboard (today's `/admin`) | — | No | Yes |
| `audit.view` | The whole audit log | — | Their own actions + the cases they work on | Yes |
| `platform.manage` | The list of rules moderators pick from, categories, policies, system settings | — | No | Yes |
| `team.manage` | Add and remove team members, change roles and permissions | — | No | Yes |

**Nobody, whatever their role, can:**

- see passwords (Supabase only keeps a hash) or full bank details (those will live at the payments provider, never in our database);
- edit or delete the audit log, admins included;
- act on a case where they're the reporter or the reported person. A moderator also can't act on another team member: those cases go to an admin;
- read a conversation nobody reported.

Email addresses are admin-only, and every look is logged. Moderators see account age, plan, artist access and ways to sign in, not addresses.

### The moderation desk

Plain and data first, like the back office: it's a work tool. `/admin` becomes the team's front door and shows each person only the sections their permissions open: moderators get Reports and People, admins get everything, the dashboard included. In the account menu the link reads "Moderation" for moderators and "Back office" for admins.

1. **Report queue** (`/admin/reports`, from the reporting brief). One row per case: the reason, the content (thumbnail or quote), who reported it (a count; names only for the team), the reported account, the date, the status (new · in review · waiting on the artist · escalated · closed), the severity and the moderator on it. Filters: mine, unassigned, escalated, by reason, by severity. Sorted by severity, then number of reports, then age. Opening a case takes it ("in review by @x"), so two people don't work on the same one.
2. **Case page.** The item as it was when reported (a snapshot, so editing or deleting it doesn't wipe the evidence), every report with its note and links, a summary of the reported person (from the person page), and past cases on the same item. Actions: dismiss, hide, remove, ask for process (AI cases), warn, suspend, **escalate to an admin** (with a note; admins are notified).
3. **Person page** (`/admin/people/@handle`): account age, plan, artist access, track record (once it exists), active and expired strikes, warnings, suspensions, every case against them and how it ended, the reports they sent and how many held up, open orders, and **team notes** (private, dated, signed). This is what keeps decisions consistent: nobody acts on a person without seeing it first.
4. **Audit log** (`/admin/log`): every action by anyone on the team: who, when, what, on which content or account, which rule, the note, and what changed. Filters by team member, action and account. Moderators see their own entries and the history of the cases they work on; admins see everything.
5. **Team** (`/admin/team`, admins only): members, roles, extra permissions. Replaces `npm run team` (the script stays, for bootstrapping the first admin).

### Ground rules

1. **A rule is required.** Every action names the rule it enforces, picked from the community guidelines' list (the same list the guidelines publish), plus a note. Suspensions and bans can't go without the note. The person is told which rule, never just "you broke the rules".
2. **Proportional.** The person page suggests the next step from the person's history: a first minor offense gets a warning; repeats get a strike, then 7 days, then 30 days, then a ban (admin). The AI ladder is already decided (remove + warn → 30 days → immediate suspension for selling AI art). Going past the suggestion needs a note. Severe cases are acted on at once: sexual content involving minors (hidden automatically, per the reporting brief), scams where money is involved, threats.
3. **Right to appeal.** One appeal per decision, from the person's standing page. Someone else decides it: another moderator for warnings and removals, an admin for suspensions and bans, never the person who made the decision. The outcome arrives as a notification, with the reason.
4. **Guarded against abuse.** The audit log is append-only for everyone; a correction is a new entry ("reversed by @x because …"). Moderators can't act on themselves, on cases they reported, or on team members. Admins can see whether one moderator's decisions get reversed on appeal more often than others'.
5. **Money stays apart.** A moderator can investigate a fraud report on a sale (the order's facts, the reported messages) and suspend the seller. Refunds and payout holds are separate permissions, given to people by name. Until checkout exists there's no money to move, but the permissions are defined now so checkout plugs straight into them.
6. **Private by default.** Joining the team doesn't open anyone's private messages. A moderator sees a conversation only when someone in it reported a message, and then only that message and the messages around it (about 20 before and after), inside the open case. Every opening is logged. No browsing inboxes, no searching across conversations.

### What the person sees (account standing)

A **Standing** tab in [Settings](#brief-settings), with two sheets:

- **About you:** warnings, strikes (with when each one expires), suspensions (what's paused, until when) and removed content (what and why), each with **Appeal** while an appeal is still possible. "All good" when there's nothing there.
- **Your reports:** what you reported and what came of it (the reporting brief's "Your reports").

Notices are signed "the Artiflow team", never with a moderator's handle, so nobody becomes a target for doing the job. The audit log keeps the real name.

**What a suspension does:** you can still sign in, browse, see your standing and appeal, but you can't post, comment, message, request or sell. Your services stop taking new requests; orders already under way carry on, unless the case is about fraud, in which case an admin decides. A ban (admins only) stops you signing in and hides your profile.

### Acceptance criteria

- Every check asks for a permission, and the database refuses an action from anyone without it, whatever the page shows.
- A moderator can open Reports and People, never the dashboard, the team, the rules or the money; going to one of those URLs directly gives the site's 404.
- Every hide, removal, warning, suspension, ban, reversal and appeal decision writes its audit entry in the same transaction: no entry, no action. Nobody can edit or delete an entry.
- An action without a rule is refused. A suspension or ban without a note is refused.
- A moderator's suspension longer than 30 days is refused; a permanent ban takes an admin.
- An appeal is never decided by the person who made the decision.
- A moderator sees a private message only through a case about it, and every look is logged.
- Moderators never see email addresses, passwords or payment details.
- The person sees every decision about them, with the rule, and can appeal each one once.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| How long can a moderator suspend someone? | Up to 30 days. That covers the decided AI ladder without waiting for an admin. Anything longer, and permanent bans, is admin-only. |
| Selling AI art and scams call for an immediate suspension that may need to last longer than 30 days. | The moderator suspends for 30 days and escalates; an admin decides what happens next. |
| Who decides appeals? | Another moderator for warnings and removals; an admin for suspensions and bans. With three admins on the team, someone else is always available. |
| Should team accounts need 2-step verification? | Yes, before the moderation tools open: a team account is the one worth stealing. That moves 2-step verification (settings brief, ~2–3 days) ahead of checkout. |
| Do moderators see email or IP addresses (for fake accounts and ban evasion)? | No. Admins see the email, and every look is logged. Signals for linked accounts (same device, same burst of sign-ups) come later, computed, without showing the raw data. |
| How long do we keep removed content? | 90 days (the appeal window plus evidence), then the files go. Sexual content involving minors is preserved and reported as the law requires, never simply deleted; this needs the legal review. |
| Do moderators get a public badge? | No: notices are signed "the Artiflow team". Revisit if community moderators come (Phase 3). |
| The rules list and categories: in code, or editable by admins? | In code first (`src/lib/moderation/rules.ts`, mirroring the guidelines), then a table admins can edit once the guidelines settle. Listing categories stay in code. |

### Implementation sketch

- **Permissions:** `team_role_permissions` (role, permission), seeded from the table above, and `team_member_permissions` (user, permission, granted true/false) for per-person grants and revokes. `private.team_can(user, permission)` is used by every moderation function; `my_team_permissions()` serves the app. Keys and labels live in `src/lib/team/permissions.ts` (client-safe). `requireAdmin()` becomes `requirePermission(…)`; `getTeamRole()` becomes `getTeamAccess()` (role + permissions), still cached for the menu and still checked fresh on every page.
- **Every action is one database function** (`mod_hide`, `mod_remove`, `mod_warn`, `mod_suspend`, `admin_ban`, `mod_reverse`, `decide_appeal`…), called by Server Actions with the secret key after the session check. It checks the permission and the limits, makes the change and writes the audit row, all in one transaction.
- **Tables:**
  - `moderation_actions`, the audit log: actor, action, target type + id, target account, case, rule, note, before/after snapshot, the entry it reverses. A trigger refuses update and delete; no grants.
  - `restrictions`: account, kind (warning | strike | posting | selling | account | ban), from, until, rule, action, lifted at / by.
  - `appeals`: action, account, text, status, decided_by (never the actor), outcome.
  - `team_notes`, and `message_views` (case, viewer, conversation, when).
  - Plus the reporting brief's `reports`, `report_cases` and `process_requests`; its `strikes` fold into `restrictions`.
- **Hidden and removed content:** a `moderation` column (null | hidden | removed) on posts, comments, artworks, characters, services and adoptables. Public reads (RLS and the cached queries) skip it; the owner still sees it, with a notice. Each action refreshes the item's cache tags.
- **Suspensions in the database:** restrictive insert policies on posts, comments, messages, commission requests, services and adoptables refuse a restricted account (`private.is_restricted(user, kind)`). A ban also bans the auth user (`ban_duration`).
- **Notifications** (always on): `warning`, `content_removed`, `suspended`, `appeal_decided`, and the reporting brief's `report_resolved`.
- **Pages:** `/admin` (sections by permission), `/admin/reports`, `/admin/reports/[case]`, `/admin/people/[handle]`, `/admin/log`, `/admin/team`, and `/settings/standing`.

---

## Brief: artist track record

- **Requested by:** project lead, 2026-10-11: "a score on the artist, to know if they deliver well, if they don't deliver, and so on."
- **Phase / priority:** Phase 1. Recording starts with the [commission flow](#brief-commission-flow-request--proposal--payment--delivery)'s first order; it's shown once an artist has enough orders.
- **Status:** Planned.
- **Depends on:** the commission flow (orders, agreed delivery dates, cancellations, disputes) and reviews.

### Why it matters

Buyers pay upfront, and the biggest fear in commissions is an artist who takes the money and vanishes. A track record answers "will I get my art, on time, as agreed?" before anyone pays. It rewards artists who deliver, and it gives moderation the history it needs (for example, the artist's history in an [AI review](#part-2-ai-generated-art)).

### What buyers see

It appears on the profile's commissions card, in the commission dialog and on Explore's studio sheets:

| Fact | How it's counted (last 12 months) |
| ---- | --------------------------------- |
| **Delivered** | Completed commissions. |
| **On time** | Share delivered by the agreed date. A new date the buyer accepted counts as on time. The clock pauses while the order waits on the buyer. |
| **Cancelled by the artist** | Share of paid orders the artist cancelled. |
| **Delivered as agreed** | Disputes for "not what we agreed" that the artist lost. |
| **Replies in** | Typical time from request to accept or decline. |
| **Reviews** | Average and count, from completed orders only. The artist can reply once. |

- A **"Reliable"** badge goes to artists with at least 10 delivered, 90% or more on time and no lost disputes in 12 months. Buyers can see it at a glance, without reading the numbers.
- **New artists** (fewer than 3 delivered) show "New on Artiflow" and nothing else: no zeros, no penalty. Small artists have to be able to start.
- Every number explains how it's counted, it updates on its own when an order closes, and nobody can edit it by hand. Artists see their own numbers privately, including before they go public.

**Why facts and not one number:** a single score punishes new artists, hides the reason, and invites gaming. The facts answer what the buyer actually wants to know. A 0–100 score can be computed later from the same data if we still want one.

### The internal trust score (team only)

The team gets a second, private score. It combines the track record, the account's age, its moderation history (strikes, upheld or cleared reports, AI review outcomes) and how accurate the account's own reports have been. It decides how much an account's reports weigh, orders the review queue, adds context to AI reviews and flags fraud patterns, such as a new account with many cancelled orders. It's never shown publicly.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| A public single score, or facts? | Facts plus the badge (above). |
| How many orders before the facts show? | 3 for the facts, 10 for the badge. |
| Do buyers get a track record too (ignored proposals, chargebacks)? | Yes, visible only to artists. Phase 2. |

### Implementation sketch

- `order_events` is append-only (paid, started, delivered, date changed, cancelled, disputed).
- `artist_stats` is recomputed when an order closes and cached per artist.
- `trust_scores` is team-only, written with the secret key.

---

## Brief: content rating, mature art hidden until you click

- **Decided by:** project lead, 2026-10-11: "we'll have adult art, but it'll be rated and hidden; you have to click to see it."
- **Phase / priority:** Phase 1, P1. Adult art can't be posted properly without it, and the "missing or wrong content tags" report reason depends on it.
- **Status:** Planned.

### How it works

**Content tags, not one "Mature" switch** (decided 2026-10-11; the idea comes from VGen's sensitivity filters). When posting, the artist ticks every tag that applies, and no tags means General. More precise tags help viewers choose what they see. They also show a payment provider that our content is controlled.

| Tag | Group | What viewers get by default |
| --- | ----- | --------------------------- |
| **Artistic nudity** | 18+ | Covered. Only signed-in accounts confirmed 18+ can reveal it. |
| **Suggestive** | 18+ | Covered, same as above. |
| **Sexual content** | 18+ | Covered, same as above. |
| **Blood / gore** | Sensitive | Covered with the tag name. Anyone can reveal it. |
| **Violence** | Sensitive | Covered with the tag name. Anyone can reveal it. |
| **Flashing** | Motion | Animations don't autoplay: a still frame shows with the warning, and a click plays it. |
| **Revealing clothes** (non-sexual) | Label | Shown, with a small label. Viewers can choose to cover it. |
| **Other** (artist's own label) | Sensitive | Covered with the artist's label. Anyone can reveal it. |

1. **Hidden until you click.** A covered image shows a wash of the artwork's own palette (we already extract it on upload), with its tags and "click to view". One click reveals that piece. This applies everywhere: feed, profile, gallery, Explore. Until it's revealed, the real image isn't even loaded, only its colors.
2. **18+ is a hard line.** Signed-out visitors see "Sign in to view". Under-18 accounts never see 18+ tags and can't post them. Accounts confirm they're 18+ at sign-up, or once for existing accounts.
3. **Each viewer decides per group:** Show, Cover or Hide. The defaults are the table above. Showing the 18+ group uncovered is for confirmed 18+ accounts only.
4. **Commission services and adoptables** carry tags too: a service tagged 18+ keeps its examples covered, and the tags show on the listing.
5. **Never as a preview.** Art tagged 18+, Sensitive or Flashing never appears in link previews, the Explore hero, "Artist in residence", the sign-in desk prints or notification thumbnails. Profile pictures and covers can't carry those tags, because they show everywhere.
6. **Missing or wrong tags.** The report reason becomes "Missing or wrong content tags". A reviewer fixes the tags. Repeated mislabeling earns a warning, then a strike.

### Legal and payments (must be checked)

- **Sexual content involving minors is banned outright and reported.** **Decided 2026-10-11:** this includes drawn and OC art. No sexual depiction of characters who look like minors, whatever age they're said to be (the "she's actually 1,000 years old" defense doesn't count). Many countries treat it as a crime.
- **Payments. Decided 2026-10-11: mature commissions can be paid.** The constraint is the payment provider's rules, not ours. If a provider decides we're outside its rules, it can freeze the whole account and every artist's payouts; Steam and itch.io pulled adult content overnight under payment-processor pressure in July 2025. VGen sells drawn adult commissions on Stripe and PayPal with a written statement from Stripe: drawn adult art is fine; pornography, meaning photos or video of real people in sexual acts, isn't. Before launch: **get the same written OK from our provider**, which is a criterion for choosing it. Keep the tags strict, since they're how we show we're in control.
- **Sexual photos or videos of real people are banned** (decided 2026-10-11). Artiflow is for drawn art, and this is the line payment providers draw.
- **Age checks:** some countries require stronger age verification for explicit content, so this goes into the per-country legal review.

### Acceptance criteria

- The composer shows the tags as chips. None picked means General, and a post can carry several.
- Art tagged 18+ never shows uncovered to signed-out visitors or under-18 accounts, including in link previews.
- Flashing animations never autoplay unless the viewer chose Show for Motion.
- Revealing takes one click and works by keyboard. The piece stays revealed for that visit.
- Profile pictures and covers can't carry 18+, Sensitive or Flashing tags.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| ~~Separate "Explicit" level?~~ | **Settled by the tags:** Suggestive and Sexual content are separate. |
| How do we confirm 18+? | Birthdate at sign-up, plus stronger checks only where the law requires them. |
| Tagged art in Explore? | Covered tiles, following each viewer's choices, and never in the hero. |
| Extreme gore: 18+ as well? | Reviewers can move a piece into the 18+ group when the gore is extreme. Write examples into the guidelines. |
| Drawn characters who look underage in sexual content? | **Decided 2026-10-11:** banned, whatever their stated age. |

### Implementation sketch

- `content_tags text[]` on posts, services and adoptables, checked against the list above (General = empty). Profile pictures and covers are refused with 18+, Sensitive or Flashing tags, in the app and in the database.
- `profiles.adult_confirmed_at` and `profiles.content_preferences` (Show / Cover / Hide per group).
- A `<SensitiveCover>` client island that draws the palette wash with the tags and loads the image (or plays the animation) on click.
- Queries pass the viewer's preferences; link previews skip anything tagged.

---

## Brief: what you draw, artist categories

- **Requested by:** Sabrina, 2026-10-11. **Status:** built the same day.

### Why it matters

Artists specialize: some draw only humans, some only furries or ponies, some only backgrounds. A buyer browsing commissions wastes time opening profiles of artists who don't draw their character. Stating it once on the profile lets discovery filter by it.

### How it works

- **Two lists**, in `src/lib/profile/draws.ts` and the `draw_tag` enum. *Who you draw*: Humans, Anthro / furry, Humanoids, Ferals, Ponies (the stakeholder's list). *What you make*: OC design, Concept art, Backgrounds, Chibi, Pixel art, Emotes & badges, Ref sheets, Animation (from the stakeholder's examples, plus common commission types).
- **Sign-up** (email and the social `/join/handle` step) asks "What do you draw?" with the subjects only, to keep it quick. It's optional ("Only here to commission? Skip it."). "All of them" ticks every subject.
- **Edit profile** edits both lists; the live card shows the labels.
- **Profile** shows labels under the bio: "Human artist", "Furry artist", "OC designer"… Ticking every subject shows one "Draws it all". Each label links to Explore filtered by it. CSS hook: `data-part="draws"`.
- **Explore** → Open studios: "Who should they draw?" (Anyone + subjects + the specialties someone offers). Tab counts follow the filter; an empty tab points to the tabs that have matches. The filter is in the URL (`?draws=feral`).

### Open questions

| Question | Current answer |
| -------- | -------------- |
| Per artist or per service? | Per artist for now. Once services are editable, a service could narrow it (e.g. furry headshots, but backgrounds only in scenes), and discovery would filter services. |
| Remember the buyer's tastes? | Not yet. Sabrina described "selecting your tastes in Explore". Saving them on the account could personalize Explore and the feed later. |
| More subjects (creatures/monsters, mecha)? | Wait for artists to ask. Adding one is an enum value plus a line in `draws.ts`. |
| Where else to filter? | `/explore/commissions` (still a placeholder) and search, when they're built. |

---

## Brief: the gallery, characters and collections

- **Requested by:** stakeholder suggestion via the project lead, 2026-10-12 ("Para galery"). **Status:** built the same day, on real data.

### The idea

The gallery isn't a tab of loose images. It's the artist's creative center, with three kinds of thing in it:

- **Artwork:** one piece (an illustration, a sketch, a painting). It can stand alone: you don't need a character to post a piece.
- **Character:** an OC with a name, a description, references and many pieces (design, outfit variations, expressions and poses, alternate versions, related art).
- **Collection:** a themed group of pieces (fanart, landscapes, studies, a project).

Every character gets a page of their own: a cover, a description, their variations, species, personality, tags and credits. Visitors can save a character on their own, not just the artist. Later, a character can link to their adoption listing, with a button to buy them.

This matches the blueprint (§2 "OC sheets: name, lore, species, personality, references, gallery, creator, credits", §3 "character pages", "favorite works/characters", and the suggested Gallery and Characters tabs). We put characters inside the gallery, as the stakeholder suggested, with their own addresses.

### How it works

- **Gallery** (`/{handle}/gallery`): three shelves.
  - **Characters:** each one is a **file folder**. Their name is on the index tab, the folder is dyed in their colors, the cover is clipped to the front (never cropped) and more sheets stick out of the top. An adoptable shows an "Adopt me · $45" tag; a sold one, an "Adopted ♥" stamp.
  - **Collections:** a **stack of prints** taped together, the cover on top.
  - **Every piece:** justified rows (no piece is cropped), All / Personal / Commissions / Adoptables, a lightbox, and a heart that saves to favorites.
- **Character page** (`/{handle}/characters/{slug}`), inside the artist's profile (so it wears their customization):
  - Their **reference sheet**, printed on paper. Their colors run along the top like a printer's color bar, with the cover taped on and their name plus a line in the artist's hand. A facts box holds species, pronouns, designed by, kept by (when someone else designed them) and the number of pieces.
  - Their **colors** as swatches with the hex printed under each (click to copy), personality words **circled in pen**, and tags.
  - **Save {name}** and Copy link.
  - When they're up for adoption, the price and **Adopt {name}**, which opens the listing (`/{handle}/adoptables#id`). Once sold, "Adopted ♥".
  - Their **story**, then their art in five sections: **Design**, **Outfits**, **Expressions & poses**, **Alternate versions**, **Art**.
- **Collection page** (`/{handle}/collections/{slug}`): title, note, pieces.
- **The artist's tools** (owner only, on the same pages):
  - **Add art:** up to 12 pictures at once. Each goes through the AI check, then you title it. Mark it personal or a commission for @someone, add tags, and choose **where it shows**: on characters (in a section) and in collections.
  - **New character:** a live reference card redraws as you type. You set the name, a one-liner, species, pronouns, the cover (picked from your art), personality, story, colors (taken from the cover until you change one), designed by, which adoption listing sells them, and tags.
  - **New collection.**
  - Each piece's **"…" menu:** edit details and where it shows, make it the cover, move it to another section, take it off, delete.
  - Deleting a character or a collection keeps its art in the gallery.
- **Favorites:** a saved character hangs on the moodboard as a **convention badge** in their colors. Gallery hearts on real pieces now save too.
- **Data** (`supabase/migrations/*_gallery.sql`):
  - Tables: `artworks`, `characters` (with `adoptable_id` → `adoptables`), `character_art` (with a section), `collections` and `collection_art`. All public to read; owners write under row level security.
  - Triggers check that art, covers and adoptables are your own. They also cap a gallery at 2,000 pieces, 100 characters, 100 collections and 300 pieces per character.
  - `favorites` gains `artwork_id` and `character_id`.
  - Images go to `art/<user id>/gallery/`.
- **Demo:** Pebble's fox OC **Kinako** (13 pieces across every section), Kai's adoptables **Pip** and **Marsh** as characters linked to their listings, and Mira's collections "Quiet Worlds" and "After dark".
- Tests: `tests/e2e/gallery.spec.ts` (visitor; artist builds a character page; other accounts can't write) and `src/lib/gallery/assemble.test.ts`.

### Pictures from posts (2026-10-14)

The project lead: the gallery is the showcase, so every image you post must be in the gallery too, tied to its post.

- When an image post goes up, a database trigger hangs **one piece per picture**, titled from the caption ("Night market (1/2)"). Older image posts were hung by the same migration (`*_post_pictures_in_gallery.sql`).
- The piece **shares the post's files** and keeps its date and stage. A WIP or sketch gets a pencilled "WIP" / "sketch" tag, and every such piece links back with "From a post". It's a full piece: it can go on characters and in collections, and become a cover.
- **Deleting the post** removes its pieces. **Taking a piece out of the gallery** keeps the post and its files.
- **Every stage** goes in, as asked ("every image post"): finished, WIP, sketch, update. **Reposts** stay out: they're someone else's art.
- Saving one of these pieces saves **the post**, so a picture has one heart whether you meet it in the feed or in the gallery.
- On Explore's wall a post stays **one tile**. Older posts that the feed no longer lists now reach the wall through their pieces.
- Real accounts' **profile count and gallery preview** now come from their gallery, these pieces included.
- Demo artists' posts hang in their galleries at read time (`postPieces()`).
- A full gallery (2,000 pieces) never blocks a post: its pictures just stay off the gallery.

### Decisions taken while building (open to change)

| Question | What we did |
| -------- | ----------- |
| Fixed sections, or the artist's own? | Fixed five, in the stakeholder's order, so every character page reads the same. Custom sections later if artists ask. |
| Can a piece be on several characters and collections? | Yes. A piece with two OCs shows on both pages. |
| Who designed vs. who keeps a character | Separate fields ("Designed by", "Kept by"), as the blueprint asks: buying a character doesn't transfer copyright. |
| Renaming a character | Their address follows the new name (`/kinako` → `/kina`). Old links break; keeping them working would need a redirect table. |

### Not yet

- **Art by other artists on your character:** a delivered commission shown on the buyer's OC, credited to the artist. This comes with the [commission flow](#brief-commission-flow-request--proposal--payment--delivery) (its step 6 already plans it).
- **Ownership transfer and history:** when an adoptable sells, the character moves to the buyer. Blocked on the license, ownership and transfer decision.
- **Arranging:** drag to reorder pieces and characters.
- **Content tags on pieces:** see the content rating brief.
- **Discovery:** characters in Explore and search.
- **Notifications:** "someone saved your character" (the notifications session offered to add the kind).
- **Opting a post out:** a "Keep this one off my gallery" switch in the composer, if artists ask (today you take it out afterwards).
- **Needs:** the `post_pictures_in_gallery` migration applied to production (the `gallery` one is there).

---

## Brief: payments, how the money moves

- **Requested by:** project lead, 2026-10-11: "someone pays the commission, we take our fee and split the rest to the artist. How does it work, and how complex is it?" Focus markets: **the US and the rest of the world; Brazil is not a priority.**
- **Status:** researched 2026-10-11. **Recommendation below; the decision is the project lead's.**
- **Sources:** Stripe and PayPal docs and policies, VGen's help center (the closest working example), read 2026-10-11. Listed at the end.

### How VGen does it (the closest working example)

- **Two rails.** "VGen Payments" runs on **Stripe Connect Express** (artists never open a Stripe account; a VGen subsidiary, Nello Labs, exists only to run it). **PayPal** is the second rail, paid straight into the artist's PayPal account. Between them they pay artists in **149 countries**, and buyers pay in 82 currencies.
- **Fees.** VGen takes **5%**, and the artist also pays processing: Stripe's 2.9% + $0.30, plus 1.5–2.5% for non-US payouts. PayPal's fees depend on the artist's PayPal account. All fees come out of the artist's side, and the proposal shows the exact breakdown.
- **Money is held until delivery** on the Stripe rail. The artist gets the funds after the milestone or commission is done. Buyer protection: a refund if the guaranteed delivery date passes, within 75 days on Stripe (their hold limit) and 150 days on PayPal. Anything longer needs the buyer's explicit consent.
- **Disputes.** On Stripe, VGen handles chargebacks. On PayPal, the artist does.
- **Adult art.** Stripe gave VGen a written statement: drawn adult art is fine; pornography (photos or video of real people) isn't.

### What the providers allow (checked 2026-10-11)

| | **Stripe Connect** | **PayPal (multiparty)** |
| --- | --- | --- |
| Split with a platform fee | Yes: destination charges, or separate charges and transfers. | Yes: "partner fees" per transaction. Needs PayPal's approval as a platform. |
| Hold funds until delivery | Yes. Connected accounts' payouts can be held up to **2 years (US)** or **90 days (most other countries)**. Stripe stresses this isn't legal "escrow". | **28 days**, then funds release automatically. That's shorter than many commissions. |
| Pay artists abroad | Self-serve only between the **US, UK, EEA, Canada and Switzerland**. Anywhere else (Japan, Australia, Korea, SEA, LatAm…) needs a deal with Stripe's sales team, or "Global Payouts", which leaves money-transmitter compliance with us. | Sellers in most countries already have PayPal. That's how VGen reaches the rest of the world. |
| Who pays chargebacks | **The platform**, in the marketplace setups. We can reverse the transfer to recover it from the artist. | The artist's PayPal account, when paid directly (VGen's setup). |
| Adult art | Prohibited: "pornography and other mature audience content (including literature, imagery…) designed for the purpose of sexual gratification". VGen still got a written OK for drawn adult art, so ask for ours. | "Mature audience content delivered digitally" **needs PayPal's pre-approval**. So does **live streaming**, which matters for Flow+ Live. |
| Where the platform must be | Cross-border payouts need a platform company in the US, UK, EEA, CA or CH. | Approval case by case. |

### Recommendation

1. **A US company** (for example a Delaware entity), given the US focus. Stripe gives US platforms the most: the widest self-serve payouts and the longest holds.
2. **Rail 1: Stripe Connect, Express accounts, "separate charges and transfers"**:
   - When the buyer accepts a proposal, **we charge them in full**. The money stays in Artiflow's Stripe balance.
   - **On delivery, we transfer the artist's share** to their connected account, and Stripe pays it out to their bank. Our fee stays with us.
   - A refund before delivery comes straight from our balance, with nothing to claw back.
   - Commissions with long delivery dates: past 75 days, ask for the buyer's consent (as VGen does) or use milestones (Phase 2).
   - Provision Stripe through the Vercel Marketplace (it's the payments provider listed there) when we build.
3. **At launch, artists in the US, UK, EEA, Canada and Switzerland** get paid through Stripe. **Talk to Stripe's sales team early** about the other countries, since most artists in our niche live outside those regions.
4. **Rail 2: PayPal**, next, for artists Stripe doesn't reach. It needs PayPal's platform approval, plus its pre-approval for mature content.
5. **Adult art:**
   - Commissions tagged artistic nudity, suggestive, gore or violence can be paid from the start.
   - Commissions tagged **"Sexual content"** stay unpayable until Stripe confirms in writing, as it did for VGen.
   - If Stripe says no, the fallback is a processor that specializes in adult content (CCBill, Segpay). It costs more and adds a third integration, so it's a later phase.
6. **Taxes, with an accountant before launch:**
   - Stripe Tax for tax on our fee.
   - Connect files US tax forms (1099) for US artists.
   - The EU's DAC7 makes platforms report the income of EU sellers every year.
   - The EU "deemed supplier" VAT rule needs a tax opinion for digital commissions.

### An example: a US buyer pays a US artist $100

| | Artist pays the fees (VGen's model) | Artiflow absorbs processing |
| --- | --- | --- |
| Buyer pays | $100.00 | $100.00 |
| Stripe processing (2.9% + $0.30)¹ | −$3.20 (artist) | −$3.20 (Artiflow) |
| Artiflow's 5% | $5.00 | $5.00 |
| **Artist receives** | **$91.80** | **$95.00** |
| Artiflow keeps, before Connect's $2 per active artist per month and 0.25% + $0.25 per payout | ~$4.50 | ~$1.30 |

¹ +1.5% for an international card, +1% if currencies differ. Disputes cost $15 each (refunded if we win). US figures come from trackers that cite Stripe's US price list: Stripe's own page redirected to Brazilian prices from here. Confirm in the Stripe dashboard.

**Business risk to weigh:** VGen takes 5%, and since 2026-10-15 so do we (about 5%, was 10%; the project lead's call). If artists also pay processing, they keep about 92% on both. At 5% absorbing processing leaves almost nothing (~$1.30 on $100), so the artist paying processing (VGen's model) is the realistic choice; plans and the shop carry the rest of the revenue.

### Complexity

**Overall: high, but it splits into parts, and only the first part is needed for the beta's first paid commissions.** These are rough sizes for one developer focused on it:

| Part | Complexity | Rough size |
| ---- | ---------- | ---------- |
| Artist payout onboarding (Stripe-hosted Express onboarding, status on the profile) | Low | 2–3 days |
| Paying a proposal (Stripe Checkout or Payment Element, charge on the platform) | Low–medium | 2–3 days |
| Webhooks + the order state machine + a fee ledger (every cent accounted for, idempotent, reconciled) | **Medium–high: where bugs cost money** | 1–1.5 weeks |
| Hold until delivery, transfer on delivery, refunds before delivery, reversals after a dispute | Medium–high | 1 week |
| Chargebacks (evidence, recovery from the artist, banning abusers) | Medium, plus ongoing ops | 3–4 days |
| Fee breakdown in proposals, receipts and invoices | Low–medium | 2–3 days |
| **Stripe rail total** | | **~4–6 weeks** |
| PayPal as a second rail | High (another API, approval, different dispute model) | 2–3 weeks + approval |
| Countries beyond Stripe's self-serve regions | Business deal with Stripe, not code (or Global Payouts + our own compliance: high) | — |
| Adult-specialized processor | High (third rail, higher fees) | Only if Stripe says no |

**The long poles aren't code.** These run in parallel with development and take weeks:
- the company, its bank account and EIN;
- Stripe's review of a marketplace with adult art;
- the seller agreement, refund policy and terms;
- tax advice.

Start these first.

### Decisions this needs

| Decision | Recommendation |
| -------- | -------------- |
| Legal entity | A US company. |
| Provider | Stripe Connect first, PayPal second. |
| Who pays processing | Show the exact split in every proposal, whichever we choose. Weigh it against VGen's 5% (above). |
| Paying "Sexual content" commissions | Only after Stripe's written OK. Otherwise use a specialized processor later. |
| Long delivery dates | Buyer consent past 75 days, or milestones (Phase 2). |

Sources:
- Stripe: [Connect charge types](https://docs.stripe.com/connect/charges), [cross-border payouts](https://docs.stripe.com/connect/cross-border-payouts), [service agreement types](https://docs.stripe.com/connect/service-agreement-types), [manual payouts](https://docs.stripe.com/connect/manual-payouts), [Global Payouts](https://docs.stripe.com/global-payouts), [restricted businesses](https://stripe.com/legal/restricted-businesses)
- PayPal: [multiparty](https://developer.paypal.com/docs/multiparty/), [delayed disbursement](https://developer.paypal.com/platforms/checkout/delayed-disbursement), [acceptable use policy](https://www.paypal.com/us/legalhub/paypal/acceptableuse-full)
- VGen help center: [fees](https://help.vgen.co/hc/en-us/articles/12820094917655), [payouts](https://help.vgen.co/hc/en-us/articles/12758889287703), [countries](https://help.vgen.co/hc/en-us/articles/40469294324503), [refund protection](https://help.vgen.co/hc/en-us/articles/24137084086295), [chargebacks](https://help.vgen.co/hc/en-us/articles/12821345326743), [NSFW policy](https://help.vgen.co/hc/en-us/articles/12733211123351)
- Fee trackers: [FlexPrice](https://flexprice.io/blog/stripe-pricing-breakdown-2026), [PaymentCloud](https://paymentcloudinc.com/blog/stripe-fees/)
- DAC7: [Quaderno](https://quaderno.io/blog/digital-tax/dac7-reporting/)

---

## Brief: listings and discovery

- **Requested by:** stakeholders, 2026-10-12 (two blocks: "listings of commissions and characters for sale" and "discovery and search").
- **Phase / priority:** Phase 1, the MVP's discovery → transaction loop.
- **Status:** **Built 2026-10-12** on real data (Supabase), except paying: checkout waits on the [payments provider](#brief-payments-how-the-money-moves).

### What was asked, and where it landed

| Ask | Built |
| --- | ----- |
| Artists create services with price, description, turnaround and examples | `/studio` ("Open your doors."): a service editor with a live preview of the sheet buyers see. Examples (up to 6, AI-checked), category, up to 4 styles, description, turnaround in days ("5–7 days", "1–2 weeks"), what every package includes. |
| Package options: sketch, lineart, final art | Up to 4 packages per service, each with its own price and what it adds. One click fills the classic ladder (Sketch · Lineart · Full color). Buyers circle one in the request dialog; add-on percentages apply to it; the request keeps it. |
| Slot limits for open commissions | Optional slots per service. A request takes one when it arrives (counted in the database, so two buyers can't take the last one); declining or cancelling gives it back. When the last goes, the service switches to the artist's choice (Waitlist or Closed) and reopens when a slot comes back. One open request per buyer per service, 20 requests a day. |
| Characters / adoptables, fixed price, available or sold | Adoptables listed from `/studio`: pictures, name, species, price, what comes with it; Available / On hold / Adopted in one click. |
| **Custom commission ≠ ready-made art: different purchase flows** | Said everywhere a buyer decides. **Made to order** (commissions): request → the artist quotes → pay → it's drawn; the button is "Request". **Ready-made** (adoptables): pay → it's yours, no request, no quote; its own sheet explains the handover and credit. The studio shows both flows side by side; search's tabs say it too. |
| Home feed of works and artists | Already built (`/`, the exhibition feed). Trending and search add the artist side. |
| Search by name, category, style and price range | `/explore/search`: one box (with autocomplete) over commissions, adoptables and artists; filters for category, style, who they draw, price range (tags or a typed range). |
| Availability and turnaround filters | Commissions: Open now (default), Open or waitlist, Everything. Adoptables: Available (default) or adopted too. Turnaround: within a week, 2 weeks, a month. |
| Trending page or featured artists | `/explore/popular`, "The ribbon board": the week's most-liked pieces with prize rosettes, featured artists, popular commissions, new studios ("be their first client"), adoptables. |
| Sort by relevance, recent, popular; no sophisticated algorithm | Relevance: every word must match; the listing's name counts most, then the artist, tags, description; with no words, what you can buy now comes first. Recent: newest listing. Popular: followers and reviews (pieces: likes, newest weighed up). Rules in `src/lib/search/query.ts`, unit-tested. |

### How it fits together

- **Data:** `services`, `adoptables`, `commission_requests` (migration `*_listings.sql`). Artists write their own listings under row level security; the triggers check prices, images (their own folder) and limits (20 services, 100 adoptables). Requests are written only by the Server Action, with the secret key, after it checks the session.
- **Profile:** a real account's commission card is derived from its services (most open status, slots, cheapest price, quickest turnaround), so it can't drift. Each service shows its own status stamp and slot lights; closed ones stay, greyed, at the end. `/{handle}/adoptables` is new, with a sidebar card.
- **Requests:** the artist's queue shows real requests first (answered from the drawer, not dragged); the buyer's `/requests` shows them, with "Take it back" while they wait. Notifications for new requests and answers come from the notifications work.
- **Discovery:** Explore's open studios and adoptables include real listings; its categories, the header's Explore menu and the autocomplete lead to search; `/explore/commissions`, `/explore/adoptables` and `/explore/recent` are search presets.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| Ready-made art that isn't a character (premade icons, emote packs, YCH bases)? | Same flow as adoptables (pay → yours). Add a "kind" when an artist asks; nothing else changes. |
| Terms of service for real accounts | Per artist, edited in `/studio`, snapshotted on each request (the commission flow brief). Today real requests accept Artiflow's rules. |
| When does search need Postgres? | Past a few thousand listings: move text matching and filters into Postgres (full-text + trigram) and keep `query.ts` as the rules. |
| Should "popular" use real request and save counts? | Yes once there's volume; today followers and reviews (demo) stand in. |
| Auctions and offers on adoptables | Phase 3, with auctions. |

---

## Brief: original images, cheap and safe

- **Requested by:** stakeholders, 2026-10-12. Sabrina asked for commission covers in PNG (transparent, with the card's color behind) and GIF, "at the original size so they don't blur". Robin and Amanda asked for Explore as a loose wall of many pieces, each at its own size, with GIFs playing. Then the project lead asked: "could we keep everyone's images, very cheaply and safely?"
- **Status:** **Approved** by the project lead, 2026-10-12 ("let's do it"). **Step 1 built 2026-10-14** (see Plan); the backup waits on a Cloudflare account. Prices checked 2026-10-12 (sources at the end).

### The answer: keep the originals, serve copies

Storing every original is cheap. What costs money, and makes pages slow, is **sending** originals to everyone who scrolls past. So each upload is kept three ways, all made in the browser at upload time, as `prepareImage()` already does (no server compute):

| Copy | What it is | Typical size | Where it shows |
| ---- | ---------- | ------------ | -------------- |
| Original | The file as uploaded (PNG, JPEG, WebP, GIF), metadata stripped, pixels untouched | 2–20 MB | Opening the piece ("full size"), commission deliveries |
| Display | Long side 2400px; lossless PNG when small (pixel art), otherwise WebP q90 | 300–800 KB | Piece page, lightbox, covers |
| Thumb | Long side ~800px, WebP | 50–150 KB | Walls, cards, Explore, search |

Why keep originals at all, if the display copy already looks sharp: commission deliveries must be the exact file; Glaze/Nightshade survive (see [What else](#what-else-confirmed-2026-10-11)); and new formats or sizes can be made later without asking artists to upload again.

**Art should come straight from storage's CDN, not through Vercel's image optimizer.** Today every piece goes through `/_next/image`, which re-encodes it a second time (AVIF at quality 75, on top of the browser's WebP). That's likely part of the blur Sabrina saw. It is also Vercel's most expensive bandwidth, and Vercel's Flat Rate CDN excludes sites whose bandwidth is mostly media.

### What it costs

**The bottom line** (year-one scale, approved 2026-10-12):

| | Per month |
| - | --------- |
| The way it is today (Supabase → Vercel's optimizer) | **~$1,800, and no backup** |
| **With the plan** (Cloudflare R2 + its CDN, plus a locked backup at another company) | **~$35–45** |

Today's traffic still fits in the plans we already pay for, so the extra cost right now is about zero. The details:

Today's traffic fits in what the plans already include (Supabase Pro: 100 GB stored, 250 GB + 250 GB egress; Vercel Pro: 1 TB). Illustrative year-one scenario: 300k pieces (originals averaging 4 MB → ~1.4 TB with copies), 3M wall pages a month showing 40 thumbs each (~12–13 TB a month delivered).

| Path | Storage | Delivery | About / month |
| ---- | ------- | -------- | ------------- |
| Today: Supabase → Vercel's optimizer | ~$28 | $0.15/GB on demand → ~$1,750, plus $0.05 per 1,000 transformations | ~$1,800 |
| Supabase Storage straight from its CDN | ~$28 | $0.03/GB cached → ~$375 | ~$400 |
| **Cloudflare R2 + Cloudflare's CDN** | ~$21 | **egress free**; ~$4 in reads on cache misses | **~$25** |
| Originals in the wall instead of thumbs | | ~480 TB a month; 160 MB per page | not viable |

Supabase's spend cap is on: past the included egress, storage is **blocked** until the next cycle rather than billed. A busy Explore could switch off every image on the site. Watch egress on the usage page, or move art to R2 before that happens.

### Safe

1. **Strip metadata without re-encoding** (GPS location, camera, names): drop the metadata chunks of PNG, JPEG, WebP and GIF, keeping the color profile. Reuse the parsers in `src/lib/ai-check/signature.ts`. The AI check keeps running first, on the untouched file.
2. **Raster only:** PNG, JPEG, WebP, GIF (the bucket's `allowed_mime_types`). Never SVG or HTML.
3. **A server check after each upload**, because a hostile client can skip the browser's checks. Read the file's first bytes (a ranged read) and refuse it if the format doesn't match its type, if it's too big (e.g. over 10,000px a side or 50 megapixels: "decompression bombs" that crash viewers' tabs), or if it's a GIF with too many frames.
4. **Serve from a separate domain** (`*.supabase.co` today; a dedicated user-content domain with R2) with `X-Content-Type-Options: nosniff`. A disguised file can never run as a page on our site.
5. **Against free hosting:** storage per account (free vs Flow+), uploads per day, hotlink protection on Cloudflare, spend alerts.
6. A deleted piece or account takes its originals and copies with it (the account deletion item).

### Not losing them (backups)

Asked by the project lead, 2026-10-12. **Today no image has a backup.** Supabase's daily backups cover the database only: Storage files are left out, and restoring a backup doesn't bring back a deleted file ([Supabase backups](https://supabase.com/docs/guides/platform/backups)). Disks failing isn't the risk (both Supabase and R2 keep several copies of every file). The risks are a bug or a leaked secret key deleting files, and the account itself (unpaid bill, project paused or suspended, account taken over).

Rule: **two copies, at two companies, and the backup locked.**

- **Main copy:** where the site reads from (Supabase now, R2 later).
- **Backup copy:** a bucket at a *different* company with different keys: R2 while art lives on Supabase, Backblaze B2 (~$7/TB a month) once it lives on R2. A daily job copies new originals (a Vercel Cron with the S3 APIs, or `rclone`). Only originals: display copies and thumbs can be made again from them by a script.
- **Locked:** a retention rule ([R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), B2 object lock) so that nothing can delete or overwrite a file for 30 days, not even us with the key. After 30 days, deletions reach the backup, so a deleted account is gone from it too (say so in the privacy policy).
- **Database too:** the `storage.objects` rows and our tables say whose file is which. Keep Supabase's daily backups, plus a weekly `pg_dump` to the same backup bucket.
- **Test the restore** once a quarter: bring back a handful of files and check they open.

Cost at the year-one scale (~1.2 TB of originals): ~$10–18 a month. At today's size, cents.

### GIFs

GIF is the heaviest format (5 MB for a few seconds). Keep the original. In walls, show its first frame as a still thumb and play the GIF when the tile is on screen (or hovered on desktop), a few at a time (**done on Explore's wall, 2026-10-14**: up to 6 at once; GIFs uploaded before thumbs existed play as they load). Later, convert in the browser to animated WebP or a short video (5–10× smaller), once browser support has been tested.

### Commission covers (Sabrina's ask): done 2026-10-12

She meant the `/studio` editor and its "How buyers see it" preview: transparent art sat on black, cropped and zoomed.

- **The black was a bug:** palette extraction counted see-through pixels (stored as black), so a transparent PNG's "dominant color" was black, and the box was painted with it. Palettes now skip see-through pixels (`extract-palette.ts`, tested). Listing boxes no longer paint the palette behind the art, so pictures uploaded before the fix look right too.
- **Whole and at its own size:** `ListingArt` (`src/components/listings/listing-art.tsx`) shows the picture whole (no crop), never enlarged past its real size, on the box's own color. Used by the service sheet, the studio editor and the commission carousel. Small images (≤ 640px) and GIFs skip the optimizer.
- **GIF:** service examples and adoptable pictures take GIFs (up to 9 MB), on every plan for now (see Decisions).
- **PNG:** transparency already survived the upload. Small images stay PNG; larger ones become WebP q90, which keeps transparency too. Keeping the exact original file is step 1 of the plan below.
- **Not changed:** Explore's studio tiles still crop (Explore is being redesigned), but no longer paint the palette behind the art. Adoptable cards elsewhere still use their own layout.

### Plan

1. **Now, on Supabase. Built 2026-10-14** (details in CLAUDE.md, "Images"):
   - ✅ Art straight from Supabase's CDN through our own `next/image` loader (thumb or display copy by width); Vercel's optimizer is off. Live in production.
   - ✅ Originals kept (private `originals` bucket) and thumbs made, in the browser, for posts, gallery, listings and deliveries; covers and profile pictures get thumbs. The 7 older uploads in production got thumbs (`npm run images -- thumbs`); their originals were never kept.
   - ✅ Metadata stripped without re-encoding (pixels identical, tested); server check on every save (format, size, decompression-bomb caps; a disguised file is refused and removed, tested end to end).
   - ✅ Upload limits: 600 files a day, 5 GB (50 GB Flow+).
   - ✅ Covers: PNG, GIF, transparency (2026-10-12).
   - ⏳ Backups: the hourly copy and the 30-day sweep are built and tested against an S3 endpoint (`/api/cron/backup-art`); **waiting on** the R2 bucket and its keys (project lead's Cloudflare account). Not yet: the weekly `pg_dump`, a quarterly restore drill.
   - Found 2026-10-14: production was deploying from Git without the demo art (only alt text showed on sign-in, Explore, demo profiles). Builds now fetch it (`prebuild`), tested on a preview build.
   - Supabase's storage doesn't send `X-Content-Type-Options: nosniff`. Low risk (files are served from `supabase.co`, not our site, and the server check refuses non-images); the R2 domain in step 2 adds it.
2. **When traffic grows (~2–3 days, plus copying files):**
   - Move the `art` bucket to R2 on a user-content domain, with signed uploads from a Server Action.
   - Paths stay the same; only `artUrl()` changes.
   - Needs a domain on Cloudflare. It doesn't have to wait for the brand name: a neutral user-content domain (~$10/yr) is also the safer setup.

### Decisions this needs

| Decision | Recommendation |
| -------- | -------------- |
| Are full-size originals public? | Public pages show up to 2400px (sharp on any screen). Each piece has an artist toggle for "show full size". Full size is easier to scrape for AI training. |
| GIF covers on commissions: everyone, or Flow+? | Everyone. Covers sell commissions, and we earn our fee on those. Cost stays controlled with "still until on screen". **Built that way 2026-10-12**; making it Flow+ only is a one-line change in `listing-images.tsx` (`allowGif`). |
| Size limits | Originals up to 25 MB (the bucket allows 10 MB today); GIFs up to 15 MB. |
| Storage per account | Generous at first (e.g. 5 GB free, 50 GB Flow+). Revisit with real data. |

Sources: [Vercel image optimization pricing](https://vercel.com/docs/image-optimization/limits-and-pricing), [Vercel iad1 rates](https://vercel.com/docs/pricing/regional-pricing/iad1), [Flat Rate CDN scope](https://vercel.com/docs/pricing/flat-rate-cdn), [Supabase egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [Supabase storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size), [Supabase spend cap](https://supabase.com/docs/guides/platform/spend-cap), [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

---

## Brief: settings

- **Requested by:** project lead, 2026-10-15, with VGen's three settings screens (account, notifications, other) as reference: "without the VGen parts, adapted to how our system works".
- **Status:** built the same day, on real data. `/settings`, linked from the account menu. Concept: the sketchbook's binder (the inside cover says whose it is; index tabs; punched sheets).

### VGen's screens, and where each line landed

| VGen | Artiflow |
| ---- | -------- |
| Email (masked), Update | **Built.** Masked until you click the eye (artists stream). Changing it sends a link to both addresses. |
| Password, Update | **Built.** Asks for the current one; accounts made with Google / Discord / Twitch can set a first one. "Forgot it?" sends a reset link. |
| Twitter / Twitch / Apple: connect, disconnect | **Built** for our providers (Google, Discord, Twitch; X and Apple were left out on 2026-10-10). Never the last way in. **Needs "Manual linking" on in Supabase.** |
| 2-step verification (authenticator app) | **Not yet.** Supabase has it (TOTP), but it only protects anything if the database refuses a half-signed-in session too (a restrictive rule on every table, plus a code step at sign-in). Recommended before checkout opens, when accounts hold money. |
| (not on VGen) | **Built:** where you're signed in (browser, last active), sign one out or all the others. |
| Birthdate | **Waits on [content tags](#brief-content-rating-mature-art-hidden-until-you-click):** it's only there to confirm 18+, and nothing is 18+-tagged yet. |
| Timezone + "show local time" | **Built** as one switch: "Show your local time on your profile" (only stored while shown). Visitors see "3:42 pm for Mira · 2h ahead of you" on the profile and the chat's studio card. |
| See Like count / See View count | **Like counts built** (hides the numbers everywhere you look, on every device). We don't count views. |
| Mature content / Sensitivities filters | **Waits on content tags:** the brief's Show / Cover / Hide per group lands here once art can be tagged. |
| Notifications: email / on VGen, per kind | **On Artiflow built:** a switch per guest book kind (likes, comments, reposts, replies, mentions, new followers, artists you let in), enforced in the database. Commissions and notes about your account stay on. **Email** waits on the sending domain. Plus the message chime and desktop alerts per device. VGen's shop, curator, fanwork and "someone I follow opens commissions" lines have no Artiflow feature behind them yet ("Notify me" is its own brief). |
| Showcase character tags from…, guest requests by email | No such features here. |
| Blocked users | **Waits on** [reporting, block and mute](#brief-reporting-and-keeping-artiflow-human-made). |
| Deactivate account | **Not yet:** see below. |
| (not on VGen) | **Built:** "Who sees what", the public / private split as the database enforces it. Appearance: theme and Explore's tile size. |

### Not yet, and what each needs

| Item | Needs |
| ---- | ----- |
| 2-step verification | Enroll (QR code), a code step after sign-in (password and social), and a restrictive rule per table so a session without the second step can't read or write. ~2–3 days with tests. |
| Delete account / download your data | A decision on what the other side keeps. Today deleting an account deletes everything tied to it, including the other person's side of conversations and orders, and a delivered commission's files live in the artist's folder. **Recommendation:** refuse while an order is in flight; keep finished orders and deliveries for the other side under "Deleted account"; erase the rest (posts, gallery, files, messages you sent show as "Deleted account"). Export: a JSON of your profile, posts, comments, favorites, follows, messages and orders, plus your original files. |
| Content preferences + birthdate | The [content tags](#brief-content-rating-mature-art-hidden-until-you-click) brief. |
| Blocked users, who can message you | The [reporting](#brief-reporting-and-keeping-artiflow-human-made) brief. |

---

## What else (confirmed 2026-10-11)

Trust and safety gaps the roadmap owner raised on 2026-10-11. The project lead confirmed all five the same day. In rough priority order:

1. **Guidelines, terms and copyright takedowns.** Community guidelines (with the AI rule, what's allowed and the strikes), terms of service, privacy policy. The takedown form has to work **without an account**, because the artist whose work was stolen often isn't a member. All of this comes before sign-ups open widely, and the blueprint asks for a legal review in each launch country.
2. **Content rating.** Adult art is welcome, rated and hidden until you click. It now has its own [brief](#brief-content-rating-mature-art-hidden-until-you-click).
3. **Keep our art out of AI training.** This is the other half of "made by humans", and artists will expect it:
   - Block known AI crawlers (robots.txt, plus Vercel bot rules).
   - Add `noai` / `noimageai` meta tags.
   - Ban scraping for training in the terms.
   - Check whether our resize + WebP step weakens Glaze or Nightshade protection, and if it does, offer "keep my file as uploaded".
4. **Account deletion and data export.** Deleting an account removes its files (already an open point under Media), and people can download their data. We're international, so GDPR, LGPD and CCPA apply.
5. **Spam and sign-up protection.** A bot check at sign-up (e.g. Vercel BotID) and rate limits on posts, comments and reports. Real accounts are already open.

---

## Stakeholder requests log

| Date | Request | Where it landed |
| ---- | ------- | --------------- |
| 2026-10-15 | Robin, after a free test account (@elyhria) customized her page: keep showing every item in the editor, but marked as Flow+ with a way to subscribe; "we need to show what there is". | **Done:** free accounts get a Flow+ bar on `/customize` that names what Flow+ adds on the open tab ("4 more palettes · your own colors · …", counted from the catalog) or what's being previewed, with **Get Flow+ · $6.99/mo** → `/plans#flow-plus` (checkout still opens soon there). Every paid option carries a FLOW+ tag instead of a small padlock; on the palette cards it's a corner tag (it was cut off). Nothing was hidden before: she only saved free options. |
| 2026-10-15 | `/codes` rules: say what a "bad actor" is, or people will think any small thing the artist they invited does will land on them. Suggested: "Bad actors may be, but aren't limited to, scammers, AI artists, and art thiefs." | **Done:** under "You're responsible for users that you invite…" in the rules card, as suggested ("thiefs" → "thieves"); `BAD_ACTORS` in `src/lib/artists/codes.ts`. |
| 2026-10-15 | Sabrina: clicking a gallery piece blows it up to the screen; add a "View original size" button, bottom-right of the viewer. | **Done** in the shared image viewer (gallery, profile posts, home feed): a **View original size** button bottom-right with the picture's size (240 × 160) shows it one image pixel per CSS pixel, centered; bigger than the screen it scrolls and drags. **Fit to screen** goes back; closing resets it. Open question: should the fitted view stop enlarging past the picture's pixels by default, like Explore's viewer? |
| 2026-10-15 | About board: mirror images and stickers (a sticker facing > can face <). | **Done:** a Mirror button in the block's floating toolbar and in the panel (images and stickers; `mirror` on the block). A framed image flips inside its frame. |
| 2026-10-15 | An easier way to reuse a color: today a second box with the same color means guessing on the color wheel. Show the hex code under the wheel as it moves, to copy and paste into another box. | **Done:** every color field in the customizer shows its **hex code** live (follows the wheel), with **Copy**, and takes a typed or pasted code (`#`, spaces, 3 digits on leaving the field). On the About board, every color field also offers **"On your board"**: the colors already used there, one click to match. |
| 2026-10-15 | VGen's final delivery asks (optionally) whether to add the slot back to the service: add that. | **Built:** delivering from the order drawer offers "Add 1 slot back to “<service>”" (optional, off by default) when the order holds a slot on a service with a limit, showing how many are taken and that a full service reopens. Ticked, the delivery releases the slot (`deliverOrder` `slotBack`, trigger in `*_slot_back_on_delivery.sql`, **not yet applied to production**). Settles the pending decision on delivery slots. |
| 2026-10-15 | Home feed, "Studios taking commissions": show the art at its real size, always; the first one is a small GIF and it was blown up and covered by the name. | **Fixed:** each studio's art now hangs whole on a mat in its own color, never cropped and never enlarged past its pixels (`ListingArt`, the Explore rule), so a 128px pixel GIF stays 128px. The artist, the status stamp, slots and price sit under the art, not on it. Desktop: one justified row of mats; phones: a sideways row. |
| 2026-10-15 | About board: an undo button (like Ctrl+Z), instead of having to select a block added by accident and delete it by hand. | Undo/redo already existed (since 2026-10-10) but was easy to miss. **Done:** a labelled **Undo · Redo** pill that floats down a long board with you (new blocks land at the bottom, where the old arrows were out of sight); shortcuts named per computer (⌘Z on Apple, Ctrl+Z elsewhere) plus Ctrl+Y; Ctrl+Z now also works with a slider in focus, and undoes that slider's change first instead of dropping it. Still only on the About board: the other customizer tabs have Discard. |
| 2026-10-15 | About board: style everything in a text/list block on its own: the title's font and size apart from the text/items, the items' size, the space between title and content. Maybe use TipTap? | **Done:** text and list blocks have a **Title** group (font, size, bold/italic, alignment, color, space below; text blocks can now have a title too) and a **Text / Items** group (font, size, bold/italic, alignment, line spacing, color; lists also bullet color). Older boards look the same (an unset title follows the text). New CSS hook `data-part="block-title"`. **TipTap: not now.** It's for formatting *inside* the text (one bold word, a link), which wasn't asked; it would bring a large editor library, a new stored format and a sanitizing renderer. Revisit if artists ask for mixed formatting in a paragraph. |
| 2026-10-15 | About board: a new list block comes in at Tilt -1°, which looks crooked by mistake; everything should come in straight (0°) and be tilted in the editor. | **Done:** every new block (text, lists and their Likes / DNI / Fun facts templates, image, sticker, HTML) comes in at 0°; tilt with the rotate handle or the Tilt slider. Boards already saved keep their angles. |
| 2026-10-15 | Rule for commissions: an artist can only CLOSE or DELETE a commission once all its slots are finished; otherwise it stays open, and trying shows a message. | **Built:** a service can be closed or deleted by hand only once every commission on it is done (delivered, or declined / cancelled / expired). Waitlisted requests, quotes, paid and in-progress orders all keep it open. Trying (the status switch, the editor, Delete, Pause all) is refused with a note on the sheet ("“Sticker pack” stays open until its commissions are done: 1 request to answer…", link to My commissions); Pause all pauses the rest and says which stayed open. Closing by itself when the slots fill up still happens. Rules in `src/lib/listings/closing.ts`; database backstop `*_close_only_when_done.sql` (**not yet applied to production**). Deleting an account still takes its services. |
| 2026-10-15 | Status stamps ("LAST SLOT!", "OPEN") look washed out in dark mode. | **Fixed:** the stamp's ink texture used to punch through its own paper background too, so Ember's dark page showed through. Now only the ink (border, ring, letters) is speckled and the paper stays whole, on every stamp. |
| 2026-10-10 | Artists run several commission types and must be able to close some and keep others, very simply ("just click a close button"). Toyhouse's deactivate flow is so tedious that most people ignore it. | Phase 1 → Commission services → [brief](#brief-per-service-status-set-in-one-click) |
| 2026-10-10 | "Wait list" as on VGen: on a closed commission type, buyers click "notify me when this reopens", and everyone interested is notified when the artist reopens it. | Phase 1 → [brief](#brief-notify-me-when-a-service-reopens), named **Notify me**: research showed VGen's Waitlist is a request queue, which we keep as a status. Minimal notifications pulled forward from Phase 2. |
| 2026-10-10 | Sign-in and sign-up screens that feel artistic, not generic. Sign-up asks "do you have an invite code from another artist?" | Phase 1 → Auth & accounts, Prototype at `/sign-in` and `/join`. Invites → [brief](#brief-artist-invite-codes). |
| 2026-10-10 | Invites aren't per-account codes: they're random, specific artists receive them, and later the others get them another way. | Phase 1 → [brief](#brief-artist-invite-codes), **Built**: single-use random codes granted with `npm run invites`. Later distribution is an open question. |
| 2026-10-10 | Real posting: extract the post's colors when posting (for the feed's light); add/change profile picture and cover. Paid plans can use GIFs on the profile; free accounts only images. | Done: posts in Supabase (`posts`) with images in Storage and the palette extracted in the browser; delete your own posts; picture and cover uploads; GIFs gated to Flow+ (app + database). |
| 2026-10-10 | Signed out, the header shouldn't show everything (cart, messages, notifications). Or keep them and ask to sign in on click? | Done: visitors see **Sign in / Create account** in the header; asking to sign in happens on actions instead (Follow, Message → sign-in and back). Likes and saves on posts still to do. |
| 2026-10-10 | Show the Google/Discord/Twitch buttons again (for a design review). | Done: always shown; one not set up yet is faded and disabled (Twitch, for now). |
| 2026-10-10 | Real accounts now: email/handle + password and a user profile, on Supabase; keep the demo data. Deploy to Vercel to review. | Phase 1 → Auth & accounts, **Built**. Supabase provisioned through the Vercel Marketplace (`artiflow-db`); schema in `supabase/migrations/`. |
| 2026-10-10 | Paid plans: **Flow+** (fully custom profiles and small extras) and a higher tier, name TBD, with live streaming plus everything in Flow+ and future features. | Phase 2 → Flow+ and the higher tier (replacing "Pro subscription"). |
| 2026-10-10 | Amanda: on the sign-in desk, swap the pencil for a pen-tablet stylus, since most of our artists draw digitally. | Done: `Stylus` in `src/components/auth/desk-props.tsx`. |
| 2026-10-10 | Sign in with Twitch, X, Google and Apple (reference: VGen's sign-up after connecting Twitch, with the username prefilled). | Phase 1 → Auth & accounts. **Decided: email + Google, Discord and Twitch.** All three are free and built into Supabase. Apple (US$99/yr, secret rotation) and X (paid API since Feb 2026) are out for now. Buttons are on `/sign-in` and `/join`. |
| 2026-10-10 | VGen's commission flow as stakeholders understand it: slots → form + required ToS → artist reviews (a decline frees the slot) → accepting sends a payment page, also by email → once paid it's official and shows on both profiles. | Phase 1 → [brief](#brief-commission-flow-request--proposal--payment--delivery), after checking each step against VGen's help center. |
| 2026-10-10 | Header starts transparent with no bottom border on every page and takes its glass once you scroll. | Done: `header-shell.tsx`; the Explore hero now runs under the header. |
| 2026-10-10 | Open the deployment to everyone (the designer hit Vercel's login and access-request screen). | Done: Vercel Authentication turned off; the site is public **with the third-party demo art**, by the project lead's call after the risk was flagged. Swap in art from consenting artists before launch. |
| 2026-10-10 | Header menus (notifications etc.) open on hover, which clashes with the account menu; open on click instead, so only one is open and opening another closes the rest. | Done: `header-menu.tsx` (was `hover-menu.tsx`) is click-only. |
| 2026-10-10 | Redo the plans page "100% artist", magical. If I already have a plan, show which one is active and for how long, and offer an upgrade. | Done: `/plans` as **artist trading cards** (matte / foil / live holo finishes that tilt and shine). Signed-in artists see their own card with a Day N seal, start date, time on the plan and the next plan up, with a laminator preview of the next finish on their card. New `profiles.plan_since` (trigger-kept). Upgrade is shown but closed until checkout exists. Account menu links to Plans. |
| 2026-10-11 | Reporting on posts, with reasons, and a strong focus on reporting AI use: "only real posts". Also: what else is missing? | Phase 1 → [brief](#brief-reporting-and-keeping-artiflow-human-made): report on posts, comments and profiles; block/mute; the "made by humans" rule; a generator check on upload; AI reports reviewed evidence-first (private process request, never acted on from reports alone), after reading VGen's AI policy. Trust & safety gaps listed as **Proposed** in [What else](#what-else-confirmed-2026-10-11). |
| 2026-10-11 | Build the upload's AI check now (C2PA, Stable Diffusion/NovelAI metadata), with the "I think this is a mistake" link, and test it with real files from each generator. Keep the detector separate, to reuse elsewhere. | **Built:** `src/lib/ai-check/` (standalone detector + browser helper), `<AiImageDialog>`, `ai_review_requests`, `npm run ai-check`, unit + e2e tests. Results with real files are in [Part 2](#part-2-ai-generated-art). |
| 2026-10-11 | A score on the artist: do they deliver well, do they deliver at all. | Phase 1 → [brief](#brief-artist-track-record): public facts + "Reliable" badge, and a private trust score for moderation. |
| 2026-10-11 | Adult art is allowed, but rated and hidden: you click to see it. | Phase 1, P1 → [brief](#brief-content-rating-mature-art-hidden-until-you-click). |
| 2026-10-11 | Confirmed: keep our art out of AI training ("BOA"), account deletion & data export, spam and bot protection ("we must have this"); agreed with the AI line and the strikes. | All five trust & safety items moved from Proposed to Planned ([What else](#what-else-confirmed-2026-10-11)); AI rule and strikes marked decided. |
| 2026-10-11 | Drawn characters who look like minors in sexual content: banned, whatever their stated age. | **Decided.** Content rating [brief](#brief-content-rating-mature-art-hidden-until-you-click), the reporting reasons and Pending decisions updated. Goes into the community guidelines. |
| 2026-10-11 | Mature commissions should be payable ("I think it should be allowed"). | **Decided.** The provider's rules are the constraint: get its written OK for drawn adult art before launch (VGen has one from Stripe). Sexual photos or video of real people banned. Content rating [brief](#brief-content-rating-mature-art-hidden-until-you-click) and Pending decisions updated. |
| 2026-10-11 | Use detailed content tags like VGen's instead of a single "Mature" rating. | **Decided.** Content [brief](#brief-content-rating-mature-art-hidden-until-you-click): eight tags in four groups (18+, Sensitive, Motion, Label), each viewer chooses Show / Cover / Hide per group; the report reason becomes "Missing or wrong content tags". |
| 2026-10-11 | A Favorites screen with everything I saved, "very artistic", like the rest of the project. | **Built:** `/favorites` as the artist's **moodboard** (swatch card of your colors, a line of commissions and adoptables you're saving up for, a wall of pinned prints, polaroids and sticky notes). Save buttons across the site now persist (`favorites` table) and confirm with a "Saved to favorites · View" toast. Account menu links to it. |
| 2026-10-11 | A "My commissions" screen, reachable from the profile menu, like VGen's (status tabs, a table) but also as a kanban; "very artistic", in the current style. | **Built (UI prototype):** `/commissions`, "On your easel." Orders are **work tickets** on a cutting mat (reference photo taped on in the character's colors, payment stamp, paint-stroke progress sketch → lineart → flats → render, deadline and price on the stub), in five columns headed by masking tape (New requests → Awaiting payment → Up next → On the easel → Delivered), or lines in a ruled **ledger** with sortable columns and next-step buttons. Binder index tabs filter (All, Needs you, Client's turn, Waitlist, Paused, Delivered, Archived); a planner page shows the week's deadlines and the month's totals after the 10% fee. Account menu links to it. Sample orders until the [commission flow](#brief-commission-flow-request--proposal--payment--delivery) lands. |
| 2026-10-11 | A "My requests" screen for what I buy from other artists, reachable from the menu: like VGen's (tabs, a table with status, payment, dates, invoice), but different, "beautiful and artistic", in our style. | **Built (prototype):** `/requests`, "On its way." Every request is a **postcard**: airmail edging, the art on a perforated postage stamp whose value is the price, a round postmark (Sent, Quoted, Paid, Lineart…, Arrived, Returned), your note, the route stamped with dates, and the next step; delivered pieces are printed on the card. A **shipping label** on top shows the next arrival, quotes waiting on you and what you spent this year. Filters in the URL. Requests you send for real appear on top. Account menu links to it. |
| 2026-10-11 | When buying a commission: the price, then checkboxes for optional extras ("+10 shading, +10 animation"); only some services have them. Then, from VGen's license list: some are already included, and those come ticked. | **Built (prototype):** licenses and add-ons under the price, each included (ticked and locked), +$ or +%, or not offered. The old "Usage rights" list and the request form's Personal / Commercial question (kept for custom pieces) became this list. The artist's queue shows the extras in each order's money breakdown. |
| 2026-10-11 | The queue's tickets should move only as the order is processed. | **Decided.** With real orders, a ticket's column follows its order's state (request → proposal sent → paid → started → delivered), changed by the events that process it: the artist's actions, the buyer's payment, expiry or cancellation. No dragging ahead; the prototype's free drag-and-drop goes when the [commission flow](#brief-commission-flow-request--proposal--payment--delivery) lands. Added to the flow's acceptance criteria and the "My commissions" row. |
| 2026-10-11 | Chat: clicking "Message" opens a chat where you can also see the artist's profile and info (like VGen's message window with its artist panel), but in our artistic style, not VGen's. | **Built:** direct messages, live, as **studio mail**: a chat window over the page (minimizes to a corner dock), the artist's studio card beside the conversation, an inbox in the header (all / unread / archived, search), pictures, "Seen" and "sketching". Real data (Supabase: `conversations`, `conversation_members`, `messages`, private `messages` bucket). |
| 2026-10-11 | Sabrina: artist categories for commissions and Explore, since not everyone draws the same things (only humans, only furry, only MLP, or everything). Sign-up asks "What type of art do you draw?" (human, anthro (furry), humanoid, feral, pony; several or all); the profile shows labels like "Furry Artist, Concept Artist, OC Designer, Human Artist"; picking your tastes in Explore brings up those artists, so buyers stop landing on someone who only draws backgrounds. | **Built:** [What you draw](#brief-what-you-draw-artist-categories). Subjects at sign-up (email and social), subjects + specialties in Edit profile, labels on the profile linking to Explore, "Who should they draw?" filter on Explore's open studios. |
| 2026-10-11 | About board: a 50×50 image came out much bigger and blurry; place images at their real size. | **Done:** images go on the board at their real size on a desktop profile (only shrunk to fit, never enlarged), with "Back to real size" in the block's settings. Small images skip the lossy re-encode and the image optimizer. |
| 2026-10-11 | About board: transparent PNGs and GIFs came out on a white background. | **Done:** every new image was dropped in a polaroid (white paper). New images go on with no frame and are never cropped; transparency survives in every browser (see Media upload). |
| 2026-10-11 | Choose the zoom of the profile picture like Discord, and resize the cover too. | **Done:** picking a picture or cover opens a framing step (drag to move; zoom with a slider, wheel, pinch or keys; small previews of the picture; the cover marks what phones show). Animated GIFs (Flow+) go up whole, since cropping would freeze them. |
| 2026-10-12 | Make the real-time chat 100% working, integrated with Supabase, with a nice, artistic sound when a message arrives and the chat isn't open. Don't keep WebSockets open when leaving the chat; pick what performs, we have ~500 simultaneous connections. | **Built:** studio chime (synthesized, a tune per sender), airmail letter on the page, tab title count, desktop alerts (opt-in), "Here now". WebSocket only while the chat window is open (closes 30s after); otherwise an HTTP pulse (`message_pulse()`, ~1 ms), one per browser, adaptive (20s in use → 5 min dormant), ≈150 req/s at 5k online; a one-line switch to sockets on visible tabs when the plan allows. Message buttons added to the commission dialog and `/requests` postcards. **Needs:** the three direct-messages migrations applied to production. |
| 2026-10-11 | Research payments: buyer pays, we take our fee and split to the artist. How it works and how complex it is. Focus: the US and other countries; Brazil is a small fish. | [Payments brief](#brief-payments-how-the-money-moves): US company, Stripe Connect (separate charges and transfers, held until delivery) for US/UK/EEA/CA/CH artists at launch, PayPal as the second rail, Stripe sales for the other countries. Complexity: high overall, ~4–6 weeks for the Stripe rail; the paperwork is the long pole. |
| 2026-10-12 | Make following and likes work: like posts, follow other artists. The stats card (Followers / Following / Artworks) looks bigger than the sidebar cards. | **Built:** real follows and likes (Supabase `follows`, `post_likes`), counts move right away and stay after a reload; the Following feed uses real follows. Likes are private (counts only). The stats card is now exactly the sidebar's width (it was 10px wider). **Needs:** the `follows_and_likes` migration applied to production. |
| 2026-10-12 | Notifications: make them real, with likes, comments, requests and so on showing up there. "Very artistic!" | **Built:** the guest book (bell + `/notifications`), from database triggers: follows, likes (anonymous counts, per the likes-are-private default), comments, replies, mentions, reposts, invites, a welcome note, commission requests and the artist's answer. Badge on the existing pulse, no extra connections. Email and Web Push later. |
| 2026-10-12 | Gallery as the artist's creative center, not a tab of loose images: three kinds of content (Artwork, Character, Collection); each character has a page (cover, description, variations, species, personality, tags, credits) and can be saved on its own; later, link a character to its adoption listing with a buy button. | **Built (real data):** [gallery brief](#brief-the-gallery-characters-and-collections). Characters as file folders and a reference-sheet page with five art sections; collections as stacks of prints; every piece in justified rows; Add art (up to 12, AI check, "show it on"), character and collection editors, per-piece menus; saved characters as badges on the moodboard; characters link to their adoptable. **Needs:** the `gallery` migration applied to production. |
| 2026-10-12 | Listings: artists create services with price, description, turnaround and examples; packages (sketch, lineart, final art); slot limits; characters/adoptables with a fixed price, available or sold. "Tell custom commissions apart from ready-made art: the purchase flows differ." | **Built:** [listings and discovery](#brief-listings-and-discovery). `/studio` with service and adoptable editors (live preview), packages, slots that fill and free themselves, per-service status in one click, Pause all; real requests stored and answered from the queue. Made to order ("Request": quote first) and ready-made ("pay and it's yours", its own sheet) are told apart wherever buyers decide. **Needs:** the `listings` migration applied to production. |
| 2026-10-12 | Discovery & search: home feed of works and artists; search by name, category, style and price range; availability and turnaround filters; a trending or featured-artists page; relevance, recent and popular sorting, no sophisticated algorithm. | **Built:** `/explore/search` (commissions, adoptables, artists; filters in the URL; three sorts) and `/explore/popular` ("The ribbon board": rosettes for the week's most-liked pieces, featured and new artists, popular commissions). Explore, the header menu and autocomplete lead to search. Rules are plain and tested (`src/lib/search/query.ts`). |
| 2026-10-12 | Artist search: show the profile frame around each artist's picture, "a visual edge for people who pay". Project lead: only for paying accounts? | **Proposed.** Easy: `<AvatarFrame>` already wraps pictures on the profile and the chat's studio card; search's `artist-card.tsx` doesn't use it yet. Recommendation: show whatever frame the artist equipped, free or bought (paid frames are already the paid edge). Gating the display behind Flow+ would charge twice for a bought frame. **Decision:** the project lead's. |
| 2026-10-12 | A tester has no Flow+ and "needed it to test opening commissions". Project lead agreed to give it. | Opening commissions doesn't need Flow+: `/studio` only asks for an account with a handle. To try Flow+ anyway: `npm run plans -- set @handle flow_plus` (needs the tester's handle). |
| 2026-10-12 | Sabrina: commission covers in PNG too, with transparency (the card's color shows behind), and GIF ("people love GIF covers"), at the original size so they don't blur. (Screenshot: the `/studio` editor, transparent art on black, cropped.) | **Done:** the black was a bug (palettes counted see-through pixels as black; fixed and tested). Listing pictures now show whole, never enlarged, on the box's color (`ListingArt`), and examples and adoptables take GIFs. Details in the [original images brief](#brief-original-images-cheap-and-safe) (covers section). Keeping the exact original file is still step 1 of that brief. |
| 2026-10-12 | Robin and Amanda: Explore should be many images side by side ("loose", each at its own size, GIFs playing) for variety; the home feed (people you follow) stays as it is. | **Built 2026-10-14** with the project lead's request below: the salon wall at `/explore`. Thumbs come from the [original images brief](#brief-original-images-cheap-and-safe); GIFs play only on screen. |
| 2026-10-12 | Project lead: "could we keep everyone's images (original PNG, GIF, full size)? Very cheaply and safely?" | **Answered:** [original images brief](#brief-original-images-cheap-and-safe). Yes, if we keep originals and serve copies. On Cloudflare R2 it's ~$25/month at a year-one scale, against ~$400 straight from Supabase and ~$1,800 through Vercel's optimizer (today's path). Includes the safety measures and a plan in two steps. |
| 2026-10-12 | Project lead, follow-up: "can we keep everyone's images or not? The safest and cheapest way so we don't lose them, and still not pay a fortune." | **Answered:** yes. Added [Not losing them](#not-losing-them-backups): today no image has a backup (Supabase's backups skip Storage files). Two copies at two companies, the backup locked for 30 days; ~$10–18/month at a year-one scale. Added to step 1 of the plan. Clarified that the spend cap *blocks* images until the next cycle, it doesn't delete them. |
| 2026-10-12 | Project lead: "save it in the roadmap properly, let's do it": today ~$1,800/month with no backup vs ~$35–45 with the plan (R2 + locked backup). | **Approved.** Bottom line at the top of [What it costs](#what-it-costs); brief marked approved; step 1 started (see Media upload & delivery). |
| 2026-10-14 | A buyer cancelling a commission: the artist only saw "cancelled" and the order vanished ("how humiliating"). Ask for a reason, "Why are you cancelling this commission request?", so people don't just bait. | **Built:** taking back a request or declining a quote now asks why (changed my mind · price · timing · another artist · a mistake in the request · something else, which needs a note) plus an optional note to the artist. The artist's notification says it ("declined your quote" when it was a quote) with the reason and note, and opens that order in the archive (`/commissions?tab=archived&order=…`), where the ticket is stamped Cancelled and the drawer shows the reason. Stored in `commission_requests.cancel_reason` / `cancel_note` (*_commission_cancel_reasons.sql, **not yet applied to production**). Next: count cancels in a buyer's record against bait. |
| 2026-10-14 | Project lead (with a reference screenshot of a dense art grid): "an Explore that, unlike the feed (following and for you), shows everything, all kinds of content, searchable and filterable. Show as many images as possible: Explore is for looking at the art, the feed is where you see the whole process. Reachable from the header's Explore button." | **Built:** `/explore` is now the **salon wall**: everything on Artiflow hung edge to edge in justified rows, each piece at its own shape on a mat tinted with its colors (never cropped, never enlarged), one tile per artwork. Tabs Everything / Art / Characters / Adoptables, "Open for commissions", palette dabs, search, Mix / Trending / Newest / Shuffle, all in the URL; tile size S/M/L (small fits ~40 pieces on a laptop screen); a viewer with the art large, its set, a wall label and the way to its page (← → walk the wall); the next page loads as you scroll; GIFs play only on screen, 6 at a time. The header's Explore menu opens with "Explore the wall". The old landing (hero, open studios board, adoptables, artist in residence) moved to `/explore/studios` ("Open studios" in the menu; profile labels link there). **Not yet:** per-piece content tags (the filters lean on titles, alt text and artist tags), personalized "for you", paging in Postgres past a few thousand pieces, likes on gallery pieces (the heart saves to favorites). |
| 2026-10-14 | Project lead: "in production the old images stopped showing on sign-in and elsewhere, only the alt text. Fix it." | **Fixed.** Production had been deployed from a Git push, and Git builds never had the demo art (it isn't in the repo). Redeployed with it, then made every build fetch it (`prebuild`, checked on a preview build): 0 broken images on sign-in, Explore, a real profile and the feed. Artists' own uploads were fine (served straight from Supabase). |
| 2026-10-13 | Is the commission working, does a request reach the artist's board? Integrate the board for real ("make it work properly"); allow choosing add-ons when creating a service; the ticks show a stray dot and feel slow. | **Built:** the whole order on real data, from the artist's board and the buyer's postcards: request → quote (price, date, note, expiry) → paid → sketch → lineart → flats → render → delivered (files + note), plus waitlist, decline, cancel, expiry; notifications at each step. The board shows only real orders once there are any. **Decided:** with no payments provider, orders stop at "Awaiting payment"; the team marks test orders paid (`npm run orders`). Add-ons were already editable in the service editor (Add-ons block). Fixed the ticks: no more dot (a round line cap showing under the hidden cross), and the cross draws in 150ms instead of ~450ms. **Needs:** the `listings` and `commission_orders` migrations applied to production. |
| 2026-10-13 | Make My requests real; remove the mocked requests and the mocked commissions from the boards. Note what's still missing: checkout, email, revision rounds, editable terms for real artists, and the open decision on whether a delivery frees its slot. | **Done:** `/requests` and `/commissions` show real data only (the sample requests and sample orders were removed, with empty states pointing at search and at the studio). Requests to the demo artists are stored too, so everything a buyer sends is real; visitors are sent to sign in before filling in a request. Unpriced custom pieces show "Quote" instead of $0. **Noted** in the commission flow brief ("Still to build") and in Pending decisions (the slot on delivery). **Needs:** the `requests_to_demo_artists` migration applied to production. |
| 2026-10-14 | Project lead: the gallery is the showcase; every image post I make must also hang in the gallery, tied to the post. | **Built:** [pictures from posts](#pictures-from-posts-2026-10-14). A trigger hangs one piece per picture (old posts included), titled from the caption and linked "From a post", with a WIP / sketch tag. Deleting the post removes them; taking one out of the gallery keeps the post. The profile's gallery count and preview are real now. **Needs:** the `post_pictures_in_gallery` migration applied to production. |
| 2026-10-14 | Project lead: anyone can create an account and browse, but selling (commissions, adoptables) takes an artist code, used at sign-up or later from the profile (a place that keeps asking); profiles show who is an official artist; codes are single-use; Sabrina (shinz) and Ipphie get 6 each and see them, and who used them; "follow VGen and Toyhouse", "make it round". Then: a very cute modal when codes arrive (once, then only for new ones); everyone who uses a code gets 2 to invite 2 more; Flow+ artists get +1 code a week; a cute notification when adding a code, and a beautiful "became an official Artiflow artist" post. | **Built:** [artist codes](#brief-artist-invite-codes), after checking VGen's help center and Toyhouse's forums. Collector / artist access enforced in the database; the Artist mark and Collector label; `/codes` with tickets and who used them; the profile strip and the studio's code sheet; the gift modal (once per batch); 2 codes per new artist; +1 a week for Flow+ (cap 5 unused); the welcome with the foil **Artist Pass** and a one-click pass post; guest book notes. In production: migrations applied, 6 codes each to @shinllz and @ipphie. |
| 2026-10-14 | Project lead (screenshot of the artist cards in search): say "starting at $X" instead of "from $X", and always show the lowest price available in the artist's shop. | **Built:** artist-level prices read "starting at" (search and trending artist cards, the profile's commission card and phone shortcut, the wall viewer's "Taking commissions"); per-service prices keep "from". The price is the cheapest open or waitlist service; demo artists quoted a hand-typed number above their own price list (Mira $45, Kai $30), now derived from their services ($25, $15) like real accounts'. Adoptables don't count (the price sits next to the commission status). |
| 2026-10-14 | Project lead with Sabrina and the team (chat): a code lets you sell but not invite; reaching the goals (US$100 in sales and 10 followers) earns the verified artist mark and 2 codes to invite others; more codes only with premium. | **Built:** [codes are earned](#brief-artist-invite-codes). `profiles.verified_at` set by the database when both goals are met (followers, paid orders at their quoted price), with 2 codes and a guest book note; the foil "Verified artist" mark; the goals on `/codes`; Flow+ weekly codes for verified artists only; `npm run invites -- verify`. The 2 codes the first rule gave (robindev's) were taken back. |
| 2026-10-14 | Show the missions to complete in the bottom-right corner: always visible and small; a click opens it and shows how far along each one is. | **Built:** [missions in the corner](#brief-artist-invite-codes) for artists not verified yet: a pill with a progress ring ("Missions 0/2"), opening into the two goals with progress bars, the reward and a link to `/codes`; it steps up above the home feed's Post button and leaves once verified. |
| 2026-10-14 | Profile: move the Followers / Following / Artworks box up, level with the middle of the bio and tags. | **Done:** the stats card sits centered beside the headline, bio, tags and meta (also in the Customize preview). |
| 2026-10-14 | Sabrina: should commission notifications be separate from the rest, so they don't get lost among likes and comments when an artist is popular? Robin: "a notification is a notification, but I think I had an idea." | **Built 2026-10-15, option (b)** (picked by the project lead over (a) two pages in the bell and (c) pinning them on top). Commission notices left the bell and the guest book for their own header button, the **order clipboard**: a clipboard icon with its own lilac count; it opens an order pad clipped to a board with the newest commission notices (new requests, answers, cancels with the reason, payments for the artist; quotes, steps, deliveries for the buyer) and leads to My commissions (artists) and My requests. Opening it reads only commission notices; the bell and `/notifications` now hold likes, comments, follows and reposts only (the Requests flag and tally are gone). The pulse counts the two apart (`*_commission_notices_apart.sql`: `orders_unread` / `orders_latest`). On phones under 440px the header's theme button moves into the account menu to make room. Tested in `tests/e2e/order-notices.spec.ts`. **Needs:** that migration applied to production (until then the clipboard has no count, and the bell's count still includes commission notices). |
| 2026-10-14 | Make the links a client sends in a request clickable (today they have to be copied into another tab). | **Done:** links in the request's references and in its text open in a new tab from the order drawer (the same linkifier as Messages, now shared: `src/components/ui/linkified.tsx`). |
| 2026-10-14 | The commission window's examples are stretched, not at their real size (a 128px pixel-art GIF filled the whole column). | **Fixed:** examples in the service window hang at no more than their own pixels, centered on a mat in their own color (small ones get room around them). The mat now follows an artist's custom palette too (`matOf()` used the site's colors). |
| 2026-10-14 | Opening someone's profile, the screen sometimes blinks. | **Fixed (most of it).** Measured on production: Explore → a blank page for ~⅓ s (the profile's loading skeleton) → the profile with a dark green slab where the banner goes (its most common color, the leaves) → the light tulip photo. Now: pointing at, touching or tabbing to any link into a profile fetches that profile before the click, so it opens straight onto the profile (`ProfilePrefetch`, tested on a production build: no skeleton); the banner waits in its overall color instead of its most common one; the header stays mounted while the profile streams in instead of remounting with it. Also fixed while there: a missing character or collection page showed a second header inside the profile. **Not yet:** without the hover (a cold server, or a link clicked instantly), the skeleton can still flash; the header's account buttons still blink on every page change (they're per-request; the fix is caching them per session, a change to how the session is read). |
| 2026-10-15 | Project lead (VGen's account, notifications and "other" settings screens): a settings page, "without the VGen parts, adapted to how our system works". | **Built:** [settings](#brief-settings) at `/settings` (account menu → Settings), the sketchbook's binder: change email (a link to each address), change or set a password, connect / disconnect Google, Discord and Twitch, where you're signed in (sign out one or all the others), mute guest book entries per kind (enforced in the database; commissions always on), message chime and desktop alerts, hide like counts, show your local time on your profile, who sees what, theme and wall size. Tested end to end. **Needs:** the `account_settings` migration in production and "Manual linking" on in Supabase. **Not yet**, each with its reason in the brief: 2-step verification, delete account / export, birthdate + mature filters (with content tags), blocked users (with reporting). |
| 2026-10-15 | A native English speaker proofread the rules on `/codes` ("Before you hand out a code"). | **Done:** the heading, the five rules and the "you're responsible" note use her wording (`CODE_RULES` / `ANSWERABLE` in `src/lib/artists/codes.ts`; one typo fixed, "cehcking"). |
| 2026-10-15 | Project lead: the frame shop changes; it should sell frames, animations and so on. Picked from options: profile effects, animated names, animated covers, sticker packs and pins; sold one by one to everyone, with a monthly gift for Flow+; the look of an art-supply store. | **Built:** `/shop` as **Artiflow Supply Co.**: six aisles (frames on a pegboard, profile effects in jars, animated names as inks, animated covers as canvases, sticker packs as sheets, pins on felt), a fitting mirror that shows your profile wearing whatever you try, free items in every aisle (worn in one click), paid ones "checkout opens soon". **Flow+ perk decided:** one paid item a month, free (the monthly pick). What you wear shows on your profile (effect over the top, cover animation, animated name, pin beside it); sticker packs add stickers to the About board. Ownership in `owned_items` (frames moved over). Tested end to end. **Needs:** the `shop_items` migration in production. **Open:** real prices (all placeholders), whether Flow+ also gets a discount once checkout exists. |
| 2026-10-15 | Project lead: a view for us admins (three to start: Robin, Sabrina "shinllz" and Ipphie): how many people joined, how many there are, average use per day, charts; commissions and items sold or bought; money passing through the platform; our revenue at about 5% of transactions (configurable, so we can change it), subscribers, revenue from item sales; "a complete dashboard". | **Built:** the [back office](#phase-1-foundations--mvp) at `/admin`, for admins only (others get a 404, visitors sign in), linked from the account menu ("Back office"). A till receipt of what we kept (commission and adoptable fees, shop, Flow+) with "what if the fee were 4/6/8/10%"; new and active accounts, money through Artiflow and our share by source, the commission funnel (requested → quoted → paid → started → delivered), top artists, orders right now, the shop by aisle, everyday activity (posts, comments, likes, follows, saves, messages, uploads). Periods 7 days to all time, compared with the period before; "Count the team" leaves our own accounts out. **Fee now 5%** site-wide (`/plans`, the artist's queue, Explore). **Needs:** the `admin_dashboard` migration applied to production. |
| 2026-10-15 | Settings: no colored lines down the side of the tabs. | **Done:** the tabs lose their colored edge; each icon sits on a small tinted chip, and the open tab is a white page with a soft shadow. On phones the open tab scrolls into view. |
| 2026-10-15 | Profile (screenshot of @ipphie): put the headline and bio in a box like the Followers / Following / Artworks card, for contrast, since on some background colors the text disappears. Robin: it should be a choice, box or no box, and if a box, with a color of its own ("I liked it better without"). | **Built:** Customize → Name & bio → **Bio box**: "No box" (the default, as before) or "On a card", the same card as the stats beside it. Free accounts get the box (it's for readability); its own color is Flow+, and the headline and bio re-ink themselves to read on whatever color is picked (`bioBoxStyle()`, `readableOn()`). New CSS hook `data-part="intro"`. Tested in `tests/e2e/bio-box-and-buttons.spec.ts` and `customization.test.ts`. |
| 2026-10-15 | When changing button colors in Customize, only the first button's color can be chosen; the second should have its own. | **Built:** Customize → Buttons & layout → **Button colors** (Flow+): Follow & Request (the accent, as before), Message & Edit profile, Commission & Customize, each in its own color, with text that picks itself to read on it. Every button of that kind on the page follows (`action-secondary` / `action-soft` markers, `data-button-second` / `data-button-soft` on the canvas). The demo @pebblecat shows both. |
| 2026-10-15 | About board (screenshot of a text block): gradients and effects on the board's text, like the profile name; and choosing the effects' colors on both (name and board), with HEX or RGB. | **Built:** the board's title and text (or list items) each take a gradient and an effect (glow, sticker, outline, shimmer), apart from each other, with the same rules as the name (`letteringStyle()`, `text-fx.ts`). Every effect has its own color, the name's too: the glow, the sticker's edge, the outline, the shimmer's light (`--fx-color`; unset, each keeps its old default). Every color field types and copies HEX or RGB (a switch remembered per browser; a pasted "rgb(…)" works in either box). Gradients and effects past the glow are Flow+ on the board as on the name; colors are for everyone. Tested in `customization.test.ts` and `tests/e2e/lettering.spec.ts`. |
| 2026-10-15 | Project lead (a written proposal): roles for users, moderators and admins. Moderators keep the community safe without full access: review reports, hide and remove content, warn, suspend for a limited time, investigate scams, plagiarism, harassment and fake profiles, escalate serious cases; no permanent bans, account deletion, roles, payments, refunds or secrets. Admins manage users, moderators and permissions, ban, reverse decisions, set rules, handle money and see metrics and audit logs. A report queue, an investigation page and an action log; a required reason, proportionality, appeals, an audit log nobody can erase, money kept apart, no free access to private messages. "Granular permissions from the start." Roadmap only, not to be built yet. | **Planned:** [team roles and permissions](#brief-team-roles-and-permissions), next to the reporting brief and landing with it (P1). Adapted to what exists: `team_members` already takes `moderator`, but only admins open anything today; plan and artist access stay separate from team roles. Every check asks for a permission (19 of them, in a table per role) and every action is one database function that writes its audit entry in the same transaction. Adds an account **Standing** tab in Settings (decisions about you, appeals, your reports) and notices signed "the Artiflow team". **Open, with recommendations:** a moderator can suspend for up to 30 days (the AI ladder fits), appeals go to someone else (an admin for suspensions), 2-step verification for team accounts first, removed content kept 90 days. |

## Pending decisions

From blueprint §16, with the items they block.

| Decision | Blocks |
| -------- | ------ |
| Final brand name & .com domain | Launch, logo, landing page |
| ~~Auth provider~~ **Decided 2026-10-10: Supabase** (auth, Postgres, storage, Realtime) via the Vercel Marketplace. Email: **Resend** as Supabase's SMTP; it needs a verified sending domain, so it follows the domain decision. | — |
| Legal entity & seller countries at launch. **Recommended 2026-10-11: a US company; at launch, artists in the US, UK, EEA, Canada and Switzerland via Stripe, others via PayPal or a Stripe deal** ([brief](#brief-payments-how-the-money-moves)) | Checkout, payouts |
| Payments provider (marketplace split, KYC, international payouts). **Recommended 2026-10-11: Stripe Connect first, PayPal second** ([brief](#brief-payments-how-the-money-moves)) | Checkout & orders, the commission flow's payment step, 10% fee, auctions |
| ~~Should delivering a commission give its slot back?~~ **Decided 2026-10-15 (project lead):** asked at each delivery, "Add 1 slot back to this service" (optional, off by default), like VGen; not a per-service setting. | Slot accounting, the studio's slot controls |
| ~~What moves an order past "Awaiting payment" before checkout exists?~~ **Decided 2026-10-13: nothing in the app.** Real orders wait there until the payments provider; the team can mark test orders paid (`npm run orders -- paid <id>`). | — |
| ~~Platform fee~~ **Decided 2026-10-15 (project lead): about 5%** (was the blueprint's 10%), adjustable: one constant, `PLATFORM_FEE_PERCENT` in `src/lib/plans.ts`. The back office tries other fees on its receipt. With checkout, store the fee charged on each payment so a change never rewrites the past. | — |
| Refund, dispute & payout policy | Checkout & orders, commission cancellations |
| Content limits & moderation process. **Roles and permissions planned 2026-10-15** ([brief](#brief-team-roles-and-permissions)); still open there: the moderator's suspension limit (30 days recommended), who decides appeals, 2-step verification for the team, how long removed content is kept | Admin & moderation, media upload |
| ~~Exact AI rule and strikes~~ **Decided 2026-10-11:** strict on the posted pixels (no upscalers that invent detail, no generative fill); strikes remove + warn → 30 days → immediate suspension for selling AI art. Still open: drawing *from* an AI image you don't post, after artist interviews. | — |
| ~~Drawn characters who look underage in sexual content~~ **Decided 2026-10-11: banned**, whatever the character's stated age. | — |
| ~~Can mature commissions be paid?~~ **Decided 2026-10-11: yes.** Still to do: the chosen provider's written OK for drawn adult art (like VGen's from Stripe). | Payments provider choice, paid mature commissions |
| License, ownership & transfer rules for OCs/adoptables | Character transfer, adoptable checkout |
| Flow+ scope and price; name, scope and price of the higher tier | Flow+, higher tier |
| MVP entry/exit criteria per phase | Phase gates in this file |
| Should artists see who liked their posts? **Default 2026-10-12: no**, likes are private (only counts), so nobody's taste in mature art is exposed. Opening them up later is easy; closing them isn't. Like notifications follow it: "4 new likes on …", no names. | Named like notifications, "liked by" lists |

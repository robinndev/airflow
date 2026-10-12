# Artiflow roadmap

Living plan for what we build and in what order. The blueprint (`docs/brand/Aqua_Product_Brand_Blueprint.docx`, §9) sets the vision and the phases; this file turns them into concrete items, tracks their status, and records stakeholder requests.

- **Maintained by:** Claude (roadmap owner), with input from stakeholders via the project lead.
- **Last updated:** 2026-10-11

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
2. [Reporting, block and mute](#brief-reporting-and-keeping-artiflow-human-made), with the minimal `/admin/reports` queue.
3. [Spam & sign-up protection](#what-else-confirmed-2026-10-11) (bot check, rate limits), plus the quick part of [keeping art out of AI training](#what-else-confirmed-2026-10-11) (robots.txt, `noai` tags).
4. [Guidelines, terms & privacy](#what-else-confirmed-2026-10-11), drafted for legal review, with the AI rule, content tags and strikes.

**Then, the commission loop (payment step stubbed until the provider is chosen):**

5. [Per-service status in one click](#brief-per-service-status-set-in-one-click), the data model the rest builds on.
6. [Commission flow](#brief-commission-flow-request--proposal--payment--delivery): inbox (accept / decline / waitlist), proposals, orders, delivery.
7. ["Notify me"](#brief-notify-me-when-a-service-reopens), with the in-app + email notifications slice.
8. Character (OC) pages, the blueprint's other pillar, which nothing blocks.

**Later in Phase 1:** [artist track record](#brief-artist-track-record) (needs real orders), account deletion & data export, the rest of the AI-training protection.

---

## Phase 1: Foundations & MVP

Goal (blueprint): launch the core discovery → transaction loop, validate that artists publish and sell, and don't wait for every future idea.

| Item | Scope | Status | Notes |
| ---- | ----- | ------ | ----- |
| Auth & accounts | Sign-up, sign-in, roles, permissions | **Built (Supabase)** | Real accounts since 2026-10-10: email + password sign-up with a handle, sign in with email **or** handle, sign out, password reset (`/new-password`), email confirmation (`/auth/confirm`). A database trigger creates each profile; invites are separate (see the [brief](#brief-artist-invite-codes)). Real profiles show at `/{handle}` beside the demo artists. **Before opening sign-ups:** Resend as Supabase's SMTP (the built-in mailer only reaches the project team) (redirect URLs are set). Social logins: **Google and Discord on** (2026-10-10); Twitch shows faded and disabled until 2FA is on for the owner's Twitch account and its app exists. A button turns on by itself once its provider is on in Supabase. Accounts without a handle (first social sign-in) go through `/join/handle` ("Connected to Twitch as @…", handle prefilled from their username). Roles and permissions not started. |
| ↳ **Artist invite codes** | "Got an invite from another artist?" at sign-up; invite links; who brought whom | **Prototype (UI)** | Request, 2026-10-10. Code entry, invite links and the inviter reveal are built on mock codes. Where codes come from and what they unlock are open. See the [brief](#brief-artist-invite-codes). |
| Artist profile | Banner, identity, links, post feed + composer, free vs Pro appearance | Prototype | `/[handle]`. Pro gating in `resolveAppearance()`. |
| ↳ **What you draw: artist categories** | Sign-up asks "What do you draw?" (Humans, Anthro / furry, Humanoids, Ferals, Ponies; several or all); Edit profile adds what you make (OC design, concept art, backgrounds, chibi, pixel art, emotes, ref sheets, animation). The profile shows them as labels ("Furry artist", "OC designer", "Draws it all"); Explore's open studios filter by them, and each label opens that filter | **Built** | Request (Sabrina), 2026-10-11. `profiles.draws` (enum `draw_tag`), list in `src/lib/profile/draws.ts`. Explore's studios are demo data, so the filter runs over them until real services exist. See the [brief](#brief-what-you-draw-artist-categories). |
| Portfolio & gallery | Upload, tags, credits, content warnings, visibility, ordering | Prototype | Gallery + filter exist; real upload pipeline is under "Media". |
| Characters (OCs) | Character page: lore, refs, gallery, creator, credits | Planned | Only Explore placeholders so far. |
| Adoptable listings | Create/edit listing; flatsale, auction, offer; available / reserved / adopted | Prototype | Display only (Explore hang tags). No creation flow. |
| Commission services | Services with examples, price, turnaround, ToS; request form | Prototype | `/[handle]/commissions`, request dialog. ToS acceptance is already required. |
| ↳ **Licenses and add-ons, ticked under the price** | Each service lists its licenses (Personal, Commercial: Content, Commercial: Merchandising) and optional add-ons right under the price. Each one is **included** (comes ticked and locked), sold on top for a fixed amount (+$10) or a share of the price (+200%), or, for licenses, not offered. Ticking updates the price; the ticks carry into the request | **Prototype** | Request, 2026-10-11 (sketch: "$50 · +10 shading · +10 animation"; "when it's included it comes ticked"). Only some services have add-ons. Rules in `src/lib/commissions/addons.ts`; the request stores what was ticked, priced in USD, as a snapshot. Percentages apply to the "from" price. Editing them waits on service editing. |
| ↳ **Per-service status, set in one click** | Each commission type is Open, Waitlist or Closed on its own; one click changes it; closed ones leave discovery right away | **Planned (P1)** | Stakeholder request, 2026-10-10. See the [brief](#brief-per-service-status-set-in-one-click). |
| ↳ **"Notify me" when a service reopens** | One click on a closed service; everyone who asked is notified when it opens again | **Planned (P1)** | Stakeholder request, 2026-10-10. Pulls a minimal slice of notifications into Phase 1. See the [brief](#brief-notify-me-when-a-service-reopens). |
| ↳ **Commission flow: request → proposal → payment → delivery** | Slots, artist review (accept / decline / waitlist), proposal + payment link by email, order tracking, delivery, credit on both sides | **Planned (P1)** | Stakeholder request, 2026-10-10, checked against VGen's docs. The payment step depends on the payments provider. See the [brief](#brief-commission-flow-request--proposal--payment--delivery). |
| ↳ **My commissions: the artist's queue** | Every order from request to delivery, as a board (tickets dragged between columns) or a ledger; filter tabs, search, next-step buttons, an order drawer (accept / waitlist / decline, steps, pause, archive, note to self) and a planner of the week's deadlines | **Prototype (UI)** | Request, 2026-10-11. `/commissions`, linked from the account menu. Runs on **sample orders** (`src/lib/commissions/sample.ts`); changes stay in the browser (localStorage) until the commission flow brings real requests, orders and payments. It's the flow's artist inbox: wire it to the real tables when they land. **Decided 2026-10-11: tickets move only as the order is processed.** With real orders, a ticket's column is derived from its order's state; nobody drags a card into a column its order hasn't reached. The free drag-and-drop is prototype-only. See the flow's acceptance criteria. |
| ↳ **My requests: the buyer's side** | Every commission you asked another artist for, as postcards on their way to you: the art on a postage stamp worth the price, a postmark for where it stands, the route (Sent → Quote → Paid → In the works → Delivered) stamped with dates, the next step (pay the quote, wait, see progress, the delivered piece); a shipping label with the next arrival; filters (All, Your move, Waiting on the artist, In the works, Delivered, Closed) | **Prototype** | Request, 2026-10-11. `/requests`, linked from the account menu. Requests you really send from a commission dialog show on top ("Sent from Artiflow", with the add-ons you ticked); the rest is a sample (`src/lib/commissions/sample-requests.ts`) until the commission flow brings quotes, payments and deliveries. Paying a quote says "checkout opens soon". |
| ↳ **Artist track record** | Does this artist deliver? Delivered, on time, cancellations, disputes, reply time and reviews, shown as facts plus a "Reliable" badge; an internal trust score for moderation | **Planned** | Request, 2026-10-11. Recorded from the commission flow's first order; shown once an artist has enough orders. See the [brief](#brief-artist-track-record). |
| Discovery & search | Explore, search, filters, tags | Prototype | `/explore` built (studios, adoptables, palette wall). Search input isn't wired; `/explore/[section]` pages are placeholders. |
| Checkout & orders | 10% fee, order history, minimal refund/dispute flow | Needs decision | Payments provider. Commissions pay through the [commission flow](#brief-commission-flow-request--proposal--payment--delivery). |
| Media upload & delivery | Limits, validation, thumbnails, CDN, metadata stripping | **Built (first pass)** | Supabase Storage, public `art` bucket, one folder per account (policies: write/delete only your own). The browser resizes (posts 2400px, cover 2400px, picture 512px; never enlarges), re-encodes to WebP (strips EXIF) and **extracts the palette** before uploading straight to storage (no server hop, 10 MB cap). Next/Image serves them. **2026-10-11:** small images (≤ 640px) stay lossless PNG, and transparent ones stay PNG in browsers that can't encode WebP (Safari), instead of a JPEG that blackens transparency (messages excepted: their bucket takes no PNG). A new picture or cover is **framed first** (zoom + position, `<ImageCropDialog>`). Open: delete an account's files when the account is deleted; moderation/scanning; cropping animated GIFs (they go up whole for now). |
| Admin & moderation | Reports, takedowns, essential analytics | Needs decision | Moderation policy. |
| ↳ **Reporting: posts, comments, profiles** | "…" → Report on anything people post; reasons; block/mute; team review queue; outcomes and appeals | **Planned (P1)** | Request, 2026-10-11. Needed before sign-ups open beyond invited artists: posting is real and the site is public. See the [brief](#brief-reporting-and-keeping-artiflow-human-made). |
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
| **Flow+** subscription (was "Pro"): fully custom profiles and small extras | Needs decision | Renamed by the project lead, 2026-10-10. **Price: US$6.99/mo** (decided 2026-10-10). Exact scope open. **Decided perk: animated GIF profile picture and cover** (free accounts: still images), enforced in the database. **Customization built (2026-10-11):** Flow+ unlocks every theme + own colors, background patterns/images, name fonts/gradients/effects, button styles, sidebar side, custom CSS, HTML blocks and a 60-block About board; free keeps 5 themes, name color, 2 fonts, glow, rounded/pill buttons, dots pattern, free frames and a 10-block board. Avatar frames shop at `/shop` (3 free, 7 paid; prices $1.99–$3.99 are placeholders until shop pricing is decided). `profiles.plan` (`free`/`flow_plus`) is set by the team with `npm run plans` until billing exists; `profiles.plan_since` records when it started. Code still calls it `pro`. **Plans page built** (`/plans`, artist trading cards: your plan, since when, upgrade path); upgrade and checkout wait on the payments provider. |
| Higher tier (name TBD, working name "Flow+ Live"): live streaming, everything in Flow+, future features | Needs decision | Requested 2026-10-10. **Price: US$9.99/mo** (decided 2026-10-10). Needs a streaming provider. |
| Real-time chat (buyer ↔ artist) | **Built** | Request, 2026-10-11. Direct messages between any two accounts, live (Supabase Realtime, private channels): inbox in the header with unread, search, archive; a chat window over any page with the other person's **studio card** beside it (rating, commission status and slots, prices, links, Request a commission); pictures (private storage, AI check on upload), "Seen", typing ("… is sketching"). Visual concept: **studio mail** (postage stamps, postmarks, wax seals, a postcard to open each conversation). Demo artists can be written to but say they won't answer. **Next:** report / block from a conversation (with the [reporting brief](#brief-reporting-and-keeping-artiflow-human-made)), email when a message waits unread, and the [commission flow](#brief-commission-flow-request--proposal--payment--delivery)'s requests, proposals and orders shown inside the conversation (VGen manages requests in chat). |
| Notifications | Prototype | Header menu on mock data (`src/lib/notifications.ts`). A minimal in-app + email slice moves to Phase 1 for ["Notify me"](#brief-notify-me-when-a-service-reopens) and the [commission flow](#brief-commission-flow-request--proposal--payment--delivery). |
| Follow, favorites, wishlist, reviews | Prototype; **favorites Built** | **Favorites built 2026-10-11:** every save button is real (bookmark on posts and commissions, heart on gallery and Explore pieces), stored in `favorites` (private, per account). `/favorites` is the artist's moodboard: a swatch card mixed from the saved art's colors, the commissions and adoptables you're saving up for on a line, and the art and posts on a wall, filterable by kind and color, with unpin + Undo. Follow and likes still on mock data; reviews shown on commissions. Collections (several named boards) wait for Phase 3. |
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
- **Status:** Planned. The request form with required ToS already exists (Prototype). The payment step is blocked on the payments provider (Needs decision).
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

1. **Slots, one simple rule.** Slots are set per service and are optional. A slot is taken when a request arrives. It comes back when the artist declines, the buyer cancels, or a proposal expires. When the last slot goes, the service switches to the "when full" status the artist chose (Waitlist or Closed); when one comes back, it reopens. This matches what stakeholders expect and needs no setup. VGen's three counting options can come later if artists ask.
2. **Request form + required ToS** (this part exists). We'll store a snapshot of the exact ToS the buyer accepted on each request, so a later edit can't change the deal.
3. **The artist's inbox, per service.** For each request: **Accept** (send a proposal), **Decline** (optional reason; the buyer is notified and the slot comes back) or **Move to waitlist**. Waitlist requests are unpaid and either side can drop them with no penalty.
4. **The proposal is the payment page.** It holds the final price (the listed price is "from"), scope and delivery date, paid in full upfront in the MVP. The buyer gets it in-app and **by email**, with a pay link, so nobody has to keep checking the site. It **expires** after a set time (artist-set, default 3 days). One automatic reminder goes out 24 h before. When it expires, the slot comes back without anyone doing anything. VGen leaves reminders to the artist; we automate them.
5. **Payment makes it official.** The buyer gets a receipt email. The order appears in the artist's queue ("My commissions") and the buyer's "My requests", and moves through the blueprint's states (§7): awaiting payment → accepted → in progress → revision → completed, or cancelled / disputed. Emails go out on the important changes (work started, delivered).
6. **Delivery, credited on both sides.** At delivery, the artist can post the piece to their gallery as a `commission` artwork crediting the buyer (`Artwork.client` already exists). The buyer is notified and can flag it if it misrepresents the work. The buyer can show it on their own profile **and on the OC it depicts**. VGen doesn't do this last part, and it ties in with our character pages. Both leave reviews.

### Acceptance criteria

- Accept, decline and move to waitlist each take 1 click from the inbox. Accepting opens the proposal form already filled with the service's price, the licenses and add-ons the buyer ticked, and the turnaround.
- Taking or freeing a slot updates the service status and Explore right away. A declined, cancelled or expired request always gives its slot back.
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

### Implementation sketch

- Split the data into `CommissionRequest` (pending / waitlisted / declined / cancelled, plus `termsSnapshot`), `Proposal` (sent / expired / accepted, price, scope, due date, `expiresAt`) and `Order` (the blueprint's states).
- Routes: the artist inbox is `/commissions` ("My commissions", built 2026-10-11 as a UI prototype on sample orders; its rules live in `src/lib/commissions/queue.ts`), `/proposals/[id]` (the pay link target) and the buyer's `/requests` ("My requests", built 2026-10-11 as a prototype: real requests on top, a sample for the rest; its rules live in `src/lib/commissions/requests.ts`).
- Slot accounting lives in one function, used by every request transition, so the status can't drift.
- New notification kinds: `proposal_sent`, `proposal_expiring`, `request_declined`, `order_paid`, `order_started`, `order_delivered`.

---

## Brief: artist invite codes

- **Requested by:** project lead, 2026-10-10. First: "when creating an account, ask: do you have an invite code from another artist?" Then, clarified: invites are **random**, **specific artists receive them**, and later the others get them another way.
- **Phase / priority:** Phase 1, with Auth & accounts.
- **Status:** **Built** (codes, redemption, team script). Distribution beyond the team script is open. Blueprint §13 plans a small closed beta of invited artists; this is how it grows.

### How it works

- **Codes are scarce and random:** `K7QH-3MPA` style, 8 characters with no look-alikes (no 0/O, 1/I), drawn from a strong random source. Accounts **don't** get codes automatically.
- **The team grants them to specific artists:** `npm run invites -- grant @handle [count] ["why"]` (1–50 at a time; "why" is an internal note, never shown). `npm run invites -- list @handle` shows each code and who used it.
- **Single-use:** joining with a code redeems it and links the new account to whoever held it (`profiles.invited_by`). A used code says "already used" everywhere. It stays used even if the account that used it is deleted. One code per account.
- **Sign-up stays open:** the code is optional ("Got an invite from another artist?"). On `/join` (and `/join/handle` after a social sign-in), the sealed envelope opens into a code field. A good code shows who invited you, pins their polaroid on the canvas and lights the desk with their colors.
- **Invite links:** `/join?invite=CODE` arrives with the envelope open and checked.
- The demo artists keep reusable demo codes (`MIRA-7Q2K`, `KAI-B4NN`, `NADIA-1NK5`, `PEBB-L3S`) so the prototype still works.

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| How do "the others" get invites later? | Pick one once the beta is running. Options: a few codes per active artist every couple of weeks (Bluesky's beta model), codes earned by activity (first sale, complete profile), or a public waitlist that releases codes in waves. |
| How many codes per chosen artist? | Start with 3–5 and watch how fast they're used. |
| Where do artists see the codes they hold? | An "Your invites" panel in the account menu: copy code, copy link, used/unused, who joined. Until then the team sends them from the script's output. |
| Do codes expire? | Not at first. Add an expiry if unused codes pile up. |
| Should sign-up require a code (closed beta)? | Keep it optional unless spam or growth makes a closed beta necessary. Switching later is one check in the sign-up actions. |
| What does an invite unlock? | Decide with the payments and Flow+ decisions (skip a waitlist, Flow+ trial, lower fee on the first sale). The UI promises nothing yet. |
| Does the inviter hear about it? Show "Invited by @…" on profiles? | Yes to both, with the notifications slice and a profile setting to hide it. |

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

1. **Where.** Every post gets the "…" menu. Today only authors see it, and only for delete. For everyone else it holds **Report post**, **Block @handle** and **Mute @handle**. Comments and profiles get the same, and so will services, adoptables and messages once they exist. Visitors who aren't signed in are asked to sign in.
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

The team, at first, on a minimal team-only page (`/admin/reports`). It shows the queue by severity. Each case shows the item, the reports, the artist's history and past cases. The actions are dismiss, remove, ask for process, warn and suspend. Access goes by a `moderator` role on the profile; anything sent to that page is checked against the role on the server. Community moderators come later (Phase 3, "Moderation at scale").

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
   - **On delivery, we transfer the artist's share** to their connected account, and Stripe pays it out to their bank. The 10% stays with us.
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
| Artiflow's 10% | $10.00 | $10.00 |
| **Artist receives** | **$86.80** | **$90.00** |
| Artiflow keeps, before Connect's $2 per active artist per month and 0.25% + $0.25 per payout | ~$9.50 | ~$6.30 |

¹ +1.5% for an international card, +1% if currencies differ. Disputes cost $15 each (refunded if we win). US figures come from trackers that cite Stripe's US price list: Stripe's own page redirected to Brazilian prices from here. Confirm in the Stripe dashboard.

**Business risk to weigh:** VGen takes 5% and we plan 10%. If artists also pay processing, they'd keep about 87% with us against about 92% on VGen. The blueprint's 10% is a decision, but choose with that comparison in mind: who pays processing, and what Artiflow gives in return.

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
| 2026-10-11 | Research payments: buyer pays, we take our fee and split to the artist. How it works and how complex it is. Focus: the US and other countries; Brazil is a small fish. | [Payments brief](#brief-payments-how-the-money-moves): US company, Stripe Connect (separate charges and transfers, held until delivery) for US/UK/EEA/CA/CH artists at launch, PayPal as the second rail, Stripe sales for the other countries. Complexity: high overall, ~4–6 weeks for the Stripe rail; the paperwork is the long pole. |

## Pending decisions

From blueprint §16, with the items they block.

| Decision | Blocks |
| -------- | ------ |
| Final brand name & .com domain | Launch, logo, landing page |
| ~~Auth provider~~ **Decided 2026-10-10: Supabase** (auth, Postgres, storage, Realtime) via the Vercel Marketplace. Email: **Resend** as Supabase's SMTP; it needs a verified sending domain, so it follows the domain decision. | — |
| Legal entity & seller countries at launch. **Recommended 2026-10-11: a US company; at launch, artists in the US, UK, EEA, Canada and Switzerland via Stripe, others via PayPal or a Stripe deal** ([brief](#brief-payments-how-the-money-moves)) | Checkout, payouts |
| Payments provider (marketplace split, KYC, international payouts). **Recommended 2026-10-11: Stripe Connect first, PayPal second** ([brief](#brief-payments-how-the-money-moves)) | Checkout & orders, the commission flow's payment step, 10% fee, auctions |
| Refund, dispute & payout policy | Checkout & orders, commission cancellations |
| Content limits & moderation process | Admin & moderation, media upload |
| ~~Exact AI rule and strikes~~ **Decided 2026-10-11:** strict on the posted pixels (no upscalers that invent detail, no generative fill); strikes remove + warn → 30 days → immediate suspension for selling AI art. Still open: drawing *from* an AI image you don't post, after artist interviews. | — |
| ~~Drawn characters who look underage in sexual content~~ **Decided 2026-10-11: banned**, whatever the character's stated age. | — |
| ~~Can mature commissions be paid?~~ **Decided 2026-10-11: yes.** Still to do: the chosen provider's written OK for drawn adult art (like VGen's from Stripe). | Payments provider choice, paid mature commissions |
| License, ownership & transfer rules for OCs/adoptables | Character transfer, adoptable checkout |
| Flow+ scope and price; name, scope and price of the higher tier | Flow+, higher tier |
| MVP entry/exit criteria per phase | Phase gates in this file |

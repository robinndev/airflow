# Artiflow roadmap

Living plan for what we build and in what order. The blueprint (`docs/brand/Aqua_Product_Brand_Blueprint.docx`, §9) sets the vision and the phases; this file turns them into concrete items, tracks their status, and records stakeholder requests.

- **Maintained by:** Claude (roadmap owner), with input from stakeholders via the project lead.
- **Last updated:** 2026-10-10

**Status legend**

| Status         | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| Prototype      | Built in the app on mock data (`mock-db.ts`, mocked session). No real backend yet. |
| Planned        | Agreed scope, not started.                                            |
| Needs decision | Blocked on an open question (see [Pending decisions](#pending-decisions)). |
| Shipped        | Live on real infrastructure. (Nothing yet.)                           |

---

## Phase 1: Foundations & MVP

Goal (blueprint): launch the core discovery → transaction loop, validate that artists publish and sell, and don't wait for every future idea.

| Item | Scope | Status | Notes |
| ---- | ----- | ------ | ----- |
| Auth & accounts | Sign-up, sign-in, roles, permissions | Planned | Mocked: always `@mira`, visitor view via cookie (`src/lib/session.ts`). |
| Artist profile | Banner, identity, links, post feed + composer, free vs Pro appearance | Prototype | `/[handle]`. Pro gating in `resolveAppearance()`. |
| Portfolio & gallery | Upload, tags, credits, content warnings, visibility, ordering | Prototype | Gallery + filter exist; real upload pipeline is under "Media". |
| Characters (OCs) | Character page: lore, refs, gallery, creator, credits | Planned | Only Explore placeholders so far. |
| Adoptable listings | Create/edit listing; flatsale, auction, offer; available / reserved / adopted | Prototype | Display only (Explore hang tags). No creation flow. |
| Commission services | Services with examples, price, turnaround, ToS; request form | Prototype | `/[handle]/commissions`, request dialog. |
| ↳ **Per-service listings, one-click close** | Each commission type opens and closes on its own; closed ones leave discovery right away | **Planned (P1)** | Stakeholder request, 2026-10-10. See the [brief](#brief-commission-listings-close-in-one-click). |
| Discovery & search | Explore, search, filters, tags | Prototype | `/explore` built (studios, adoptables, palette wall). Search input isn't wired; `/explore/[section]` pages are placeholders. |
| Checkout & orders | 10% fee, order history, minimal refund/dispute flow | Needs decision | Payments provider. |
| Media upload & delivery | Limits, validation, thumbnails, CDN, metadata stripping | Planned | |
| Admin & moderation | Reports, takedowns, essential analytics | Needs decision | Moderation policy. |

Built ahead of plan: the **Ember** dark theme (the blueprint deferred dark mode) and a chronological **home feed** (`/`).

## Phase 2: Monetization & interaction

| Item | Status | Notes |
| ---- | ------ | ----- |
| Pro subscription (US$5/mo, advanced customization) | Needs decision | Premium scope. Free/Pro split already modeled in `ProfileAppearance`. |
| Real-time chat (buyer ↔ artist) | Planned | |
| Notifications | Prototype | Header menu on mock data (`src/lib/notifications.ts`). |
| Follow, favorites, wishlist, reviews | Prototype | Follow and likes on mock data; reviews shown on commissions. |
| Algorithmic discovery feed | Planned | Today's feed is chronological. |
| Character ownership transfer & structured licenses | Needs decision | Licensing and ownership rules. |
| Sales dashboard & stats for artists | Planned | |

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

## Brief: commission listings, close in one click

- **Requested by:** stakeholders, 2026-10-10
- **Phase / priority:** Phase 1, P1 (part of "Commission services")
- **Status:** Planned

### Problem

Artists sell several kinds of commissions at once. One artist might list five: headshot, half-body, full-body, ref sheet and emotes. Each one is its own listing and shows up in Explore and search. When the artist wants to pause three and keep two, pausing has to take almost no effort.

Toyhouse lets you deactivate a listing, but the flow is tedious enough that most artists skip it. The listings go stale, buyers request things that aren't available, artists turn people down by hand, and buyers stop trusting what discovery shows them.

### Where the code is today

Open/closed status and slots belong to the **artist** (`CommissionSummary.status`, `slotsTotal`, `slotsTaken` in `src/lib/profile/types.ts`), not to each `CommissionService`. Explore's "Open studios" shows one sheet per artist (`Studio` in `src/lib/explore.ts`). So today there's no way to close a single commission type.

### Proposal

1. **Each service is a listing with its own state:** `open` or `closed`, with optional slots per service. The profile-level status becomes derived (open when at least one service is open), so it can't drift from the services.
2. **One click, in place.** On their own commissions page, the artist sees an Open/Closed switch on every service row. One click closes it. There's no settings screen, no form and no confirmation dialog. An "Undo" toast covers mistakes.
3. **Pause everything.** One switch at the top ("Pause all commissions") for breaks and holidays. Resuming brings back exactly the services that were open before.
4. **Instant effect.** A closed service drops out of Explore, search and the home "Open commissions" widget on the next page load (Server Action + `updateTag`). Requests already sent for that service aren't affected; closing only stops new ones.
5. **Closing on autopilot.** This addresses "most people ignore it" from the other side, so the artist doesn't have to remember:
   - A service closes automatically when its slots fill.
   - The artist can set "Reopen on <date>", which feeds Explore's existing "Opening soon" tab and countdown.
   - After a long quiet stretch with no requests, the artist gets a nudge ("Still taking ref sheets?") with **Keep open / Close** buttons right in the notification.
6. **Visitors** see a closed service greyed out with a "Closed" rubber stamp (Explore's stamp language). They can't request it.

### Acceptance criteria

- On the commissions page, closing or reopening a service takes 1 click: no page change, no modal.
- A closed service can't be requested. The button is disabled and the server action rejects it too.
- After closing, the service is gone from Explore, search and the home widget on the next load.
- Pause all → Resume restores the previous per-service states exactly.
- State is shown as text + icon, not just color, and the switch works by keyboard and screen reader (`role="switch"` / `aria-checked`).
- Owner-only. Visitor view (eye button) shows the visitor version.

### Out of scope for this item

Per-service waitlists, scheduled *closing*, bulk price edits, "notify me when it reopens" (needs Phase 2 notifications).

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| Should closed services stay on the profile or disappear? | Keep them, greyed out and moved to the end. They still show the artist's range, and they're where "notify me" will go later. |
| Keep `waitlist` as a third state per service? | Not for the MVP. With two states, the control stays a single click. |
| Slots per service, a single total for the artist, or both? | Per service for the MVP. Many artists think in total capacity ("5 slots this month"), so test an optional artist-wide cap in the beta. |
| How long without requests before the nudge? | Start at 30 days and tune it with beta artists. |

### Implementation sketch

- Types: move `status` and slots into `CommissionService`; derive `CommissionSummary.status`.
- Server Action `setServiceStatus(serviceId, status)` + `pauseAllCommissions(paused)`, owner-checked, invalidating the services, profile and Explore tags.
- Client island `ServiceStatusToggle` with `useOptimistic`, plus an undo toast.
- Explore: index open *services* (a studio sheet shows only that artist's open ones), and leave out artists with nothing open.

---

## Stakeholder requests log

| Date | Request | Where it landed |
| ---- | ------- | --------------- |
| 2026-10-10 | Artists run several commission types and must be able to close some and keep others, very simply ("just click a close button"). Toyhouse's deactivate flow is so tedious that most people ignore it. | Phase 1 → Commission services → [brief](#brief-commission-listings-close-in-one-click) |

## Pending decisions

From blueprint §16, with the items they block.

| Decision | Blocks |
| -------- | ------ |
| Final brand name & .com domain | Launch, logo, landing page |
| Legal entity & seller countries at launch | Checkout, payouts |
| Payments provider (marketplace split, KYC, international payouts) | Checkout & orders, 10% fee, auctions |
| Refund, dispute & payout policy | Checkout & orders |
| Content limits & moderation process | Admin & moderation, media upload |
| License, ownership & transfer rules for OCs/adoptables | Character transfer, adoptable checkout |
| Exact Pro customization scope | Pro subscription |
| MVP entry/exit criteria per phase | Phase gates in this file |

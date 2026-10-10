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
| Auth & accounts | Sign-up, sign-in, roles, permissions | Prototype | `/sign-in` and `/join` ("the studio desk"). Mock auth: any well-formed sign-in, or Google/Discord, signs you in as `@mira`; sign-up runs the real checks (handle, password, invite) but stores nothing; sign out sets a cookie (`src/lib/session.ts`). Real accounts wait on the auth provider (see [Pending decisions](#pending-decisions)). Roles and permissions not started. |
| ↳ **Artist invite codes** | "Got an invite from another artist?" at sign-up; invite links; who brought whom | **Prototype (UI)** | Request, 2026-10-10. Code entry, invite links and the inviter reveal are built on mock codes. Where codes come from and what they unlock are open. See the [brief](#brief-artist-invite-codes). |
| Artist profile | Banner, identity, links, post feed + composer, free vs Pro appearance | Prototype | `/[handle]`. Pro gating in `resolveAppearance()`. |
| Portfolio & gallery | Upload, tags, credits, content warnings, visibility, ordering | Prototype | Gallery + filter exist; real upload pipeline is under "Media". |
| Characters (OCs) | Character page: lore, refs, gallery, creator, credits | Planned | Only Explore placeholders so far. |
| Adoptable listings | Create/edit listing; flatsale, auction, offer; available / reserved / adopted | Prototype | Display only (Explore hang tags). No creation flow. |
| Commission services | Services with examples, price, turnaround, ToS; request form | Prototype | `/[handle]/commissions`, request dialog. ToS acceptance is already required. |
| ↳ **Per-service status, set in one click** | Each commission type is Open, Waitlist or Closed on its own; one click changes it; closed ones leave discovery right away | **Planned (P1)** | Stakeholder request, 2026-10-10. See the [brief](#brief-per-service-status-set-in-one-click). |
| ↳ **"Notify me" when a service reopens** | One click on a closed service; everyone who asked is notified when it opens again | **Planned (P1)** | Stakeholder request, 2026-10-10. Pulls a minimal slice of notifications into Phase 1. See the [brief](#brief-notify-me-when-a-service-reopens). |
| ↳ **Commission flow: request → proposal → payment → delivery** | Slots, artist review (accept / decline / waitlist), proposal + payment link by email, order tracking, delivery, credit on both sides | **Planned (P1)** | Stakeholder request, 2026-10-10, checked against VGen's docs. The payment step depends on the payments provider. See the [brief](#brief-commission-flow-request--proposal--payment--delivery). |
| Discovery & search | Explore, search, filters, tags | Prototype | `/explore` built (studios, adoptables, palette wall). Search input isn't wired; `/explore/[section]` pages are placeholders. |
| Checkout & orders | 10% fee, order history, minimal refund/dispute flow | Needs decision | Payments provider. Commissions pay through the [commission flow](#brief-commission-flow-request--proposal--payment--delivery). |
| Media upload & delivery | Limits, validation, thumbnails, CDN, metadata stripping | Planned | |
| Admin & moderation | Reports, takedowns, essential analytics | Needs decision | Moderation policy. |

Built ahead of plan: the **Ember** dark theme (the blueprint deferred dark mode) and a chronological **home feed** (`/`).

## Phase 2: Monetization & interaction

| Item | Status | Notes |
| ---- | ------ | ----- |
| Pro subscription (US$5/mo, advanced customization) | Needs decision | Premium scope. Free/Pro split already modeled in `ProfileAppearance`. |
| Real-time chat (buyer ↔ artist) | Planned | |
| Notifications | Prototype | Header menu on mock data (`src/lib/notifications.ts`). A minimal in-app + email slice moves to Phase 1 for ["Notify me"](#brief-notify-me-when-a-service-reopens) and the [commission flow](#brief-commission-flow-request--proposal--payment--delivery). |
| Follow, favorites, wishlist, reviews | Prototype | Follow and likes on mock data; reviews shown on commissions. |
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
5. **Payment makes it official.** The buyer gets a receipt email. The order appears in the artist's queue and the buyer's "My commissions", and moves through the blueprint's states (§7): awaiting payment → accepted → in progress → revision → completed, or cancelled / disputed. Emails go out on the important changes (work started, delivered).
6. **Delivery, credited on both sides.** At delivery, the artist can post the piece to their gallery as a `commission` artwork crediting the buyer (`Artwork.client` already exists). The buyer is notified and can flag it if it misrepresents the work. The buyer can show it on their own profile **and on the OC it depicts**. VGen doesn't do this last part, and it ties in with our character pages. Both leave reviews.

### Acceptance criteria

- Accept, decline and move to waitlist each take 1 click from the inbox. Accepting opens the proposal form already filled with the service's price and turnaround.
- Taking or freeing a slot updates the service status and Explore right away. A declined, cancelled or expired request always gives its slot back.
- Every state change that needs the buyer's action (proposal sent, expiring soon, declined) reaches them in-app **and** by email.
- Each request stores the ToS snapshot the buyer accepted.
- Without a payment provider, the flow runs end to end on mock data, with the payment step stubbed.

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
- Routes: an artist inbox under the owner's commissions page, `/proposals/[id]` (the pay link target) and a buyer "My commissions" page.
- Slot accounting lives in one function, used by every request transition, so the status can't drift.
- New notification kinds: `proposal_sent`, `proposal_expiring`, `request_declined`, `order_paid`, `order_started`, `order_delivered`.

---

## Brief: artist invite codes

- **Requested by:** project lead, 2026-10-10 ("when creating an account, ask: do you have an invite code from another artist?")
- **Phase / priority:** Phase 1, with Auth & accounts.
- **Status:** Prototype (UI). Blueprint §13 plans a small closed beta of invited artists, and invites are how that beta would grow.

### What's built

- On `/join`, a sealed envelope asks **"Got an invite from another artist?"** It's optional and stays closed unless opened. Opened, it takes a code (case, spaces and dashes don't matter) and checks it when the full code is typed, on Enter or with **Check**.
- A good code shows **who invited you**: avatar, name, their personal note, and a wax seal with their initial. The canvas on the desk pins their polaroid and the desk takes on their colors. A bad code says so in place. The server checks it again on submit.
- **Invite links:** `/join?invite=CODE` arrives with the envelope already open and checked.
- Mock codes (`src/lib/auth/invites.ts`): `MIRA-7Q2K`, `KAI-B4NN`, `NADIA-1NK5`, `PEBB-L3S`.
- The UI promises only what is cheap to keep: "You'll follow each other, and your profile will show who brought you in."

### Open questions

| Question | Recommendation |
| -------- | -------------- |
| Where does an artist find their code? | "Invite an artist" in the account menu: copy link, copy code, and a count of who joined. |
| One code per artist, or single-use codes? | One personal code per artist, plus a cap per month during the closed beta, so it can't be posted publicly and abused. |
| What does an invite unlock? | Decide with the payments and Pro decisions. Options: skip the beta waitlist, a month of Pro for both, or a lower fee on the first sale. Don't promise any of these in the UI until they're decided. |
| Does the inviter hear about it? | Yes: an in-app notification ("Nova joined with your invite"), with the minimal notifications slice. |
| Show "Invited by @mira" publicly? | Yes, on the new artist's profile (both can turn it off). It credits the inviter and helps new artists get found. |

---

## Stakeholder requests log

| Date | Request | Where it landed |
| ---- | ------- | --------------- |
| 2026-10-10 | Artists run several commission types and must be able to close some and keep others, very simply ("just click a close button"). Toyhouse's deactivate flow is so tedious that most people ignore it. | Phase 1 → Commission services → [brief](#brief-per-service-status-set-in-one-click) |
| 2026-10-10 | "Wait list" as on VGen: on a closed commission type, buyers click "notify me when this reopens", and everyone interested is notified when the artist reopens it. | Phase 1 → [brief](#brief-notify-me-when-a-service-reopens), named **Notify me**: research showed VGen's Waitlist is a request queue, which we keep as a status. Minimal notifications pulled forward from Phase 2. |
| 2026-10-10 | Sign-in and sign-up screens that feel artistic, not generic. Sign-up asks "do you have an invite code from another artist?" | Phase 1 → Auth & accounts, Prototype at `/sign-in` and `/join`. Invites → [brief](#brief-artist-invite-codes). |
| 2026-10-10 | VGen's commission flow as stakeholders understand it: slots → form + required ToS → artist reviews (a decline frees the slot) → accepting sends a payment page, also by email → once paid it's official and shows on both profiles. | Phase 1 → [brief](#brief-commission-flow-request--proposal--payment--delivery), after checking each step against VGen's help center. |

## Pending decisions

From blueprint §16, with the items they block.

| Decision | Blocks |
| -------- | ------ |
| Final brand name & .com domain | Launch, logo, landing page |
| Auth provider (blueprint §10 suggests Supabase; not §16) | Real accounts, email confirmation, password reset, Google/Discord sign-in |
| Legal entity & seller countries at launch | Checkout, payouts |
| Payments provider (marketplace split, KYC, international payouts) | Checkout & orders, the commission flow's payment step, 10% fee, auctions |
| Refund, dispute & payout policy | Checkout & orders, commission cancellations |
| Content limits & moderation process | Admin & moderation, media upload |
| License, ownership & transfer rules for OCs/adoptables | Character transfer, adoptable checkout |
| Exact Pro customization scope | Pro subscription |
| MVP entry/exit criteria per phase | Phase gates in this file |

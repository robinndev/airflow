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
| Auth & accounts | Sign-up, sign-in, roles, permissions | **Built (Supabase)** | Real accounts since 2026-10-10: email + password sign-up with a handle, sign in with email **or** handle, sign out, password reset (`/new-password`), email confirmation (`/auth/confirm`). A database trigger creates each profile; invites are separate (see the [brief](#brief-artist-invite-codes)). Real profiles show at `/{handle}` beside the demo artists. **Before opening sign-ups:** Resend as Supabase's SMTP (the built-in mailer only reaches the project team) (redirect URLs are set). Social logins: **Google and Discord on** (2026-10-10); Twitch shows faded and disabled until 2FA is on for the owner's Twitch account and its app exists. A button turns on by itself once its provider is on in Supabase. Accounts without a handle (first social sign-in) go through `/join/handle` ("Connected to Twitch as @…", handle prefilled from their username). Roles and permissions not started. |
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
| Media upload & delivery | Limits, validation, thumbnails, CDN, metadata stripping | **Built (first pass)** | Supabase Storage, public `art` bucket, one folder per account (policies: write/delete only your own). The browser resizes (posts 2400px, cover 2400px, picture 512px), re-encodes to WebP (strips EXIF) and **extracts the palette** before uploading straight to storage (no server hop, 10 MB cap). Next/Image serves them. Open: delete an account's files when the account is deleted; moderation/scanning. |
| Admin & moderation | Reports, takedowns, essential analytics | Needs decision | Moderation policy. |

Built ahead of plan: the **Ember** dark theme (the blueprint deferred dark mode) and a chronological **home feed** (`/`).

## Phase 2: Monetization & interaction

| Item | Status | Notes |
| ---- | ------ | ----- |
| **Flow+** subscription (was "Pro"): fully custom profiles and small extras | Needs decision | Renamed by the project lead, 2026-10-10. **Price: US$6.99/mo** (decided 2026-10-10). Exact scope open. **Decided perk: animated GIF profile picture and cover** (free accounts: still images), enforced in the database. `profiles.plan` (`free`/`flow_plus`) is set by the team with `npm run plans` until billing exists; `profiles.plan_since` records when it started. Code still calls it `pro`. **Plans page built** (`/plans`, artist trading cards: your plan, since when, upgrade path); upgrade and checkout wait on the payments provider. |
| Higher tier (name TBD, working name "Flow+ Live"): live streaming, everything in Flow+, future features | Needs decision | Requested 2026-10-10. **Price: US$9.99/mo** (decided 2026-10-10). Needs a streaming provider. |
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

## Pending decisions

From blueprint §16, with the items they block.

| Decision | Blocks |
| -------- | ------ |
| Final brand name & .com domain | Launch, logo, landing page |
| ~~Auth provider~~ **Decided 2026-10-10: Supabase** (auth, Postgres, storage, Realtime) via the Vercel Marketplace. Email: **Resend** as Supabase's SMTP; it needs a verified sending domain, so it follows the domain decision. | — |
| Legal entity & seller countries at launch | Checkout, payouts |
| Payments provider (marketplace split, KYC, international payouts) | Checkout & orders, the commission flow's payment step, 10% fee, auctions |
| Refund, dispute & payout policy | Checkout & orders, commission cancellations |
| Content limits & moderation process | Admin & moderation, media upload |
| License, ownership & transfer rules for OCs/adoptables | Character transfer, adoptable checkout |
| Flow+ scope and price; name, scope and price of the higher tier | Flow+, higher tier |
| MVP entry/exit criteria per phase | Phase gates in this file |

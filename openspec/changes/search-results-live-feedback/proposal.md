# Give search live, trustworthy feedback

## Why now

Issue #66: a screen-reader user (VoiceOver/Safari, NVDA/Firefox) can find the search box, but once they type, the page tells them nothing. The result list changes silently — no match, one match, or many, all look and sound the same until they tab down and explore. Placing an order already announces its outcome immediately (`REQ-ORD-7`); search is the one interaction left that still forgets the user is there. The earlier fix for order announcements ([`note-aria-live-announcement`](../../changes/archive/2026-09-02-note-aria-live-announcement/proposal.md)) named this exact gap and deliberately left it for its own Gate 1 — this is that change.

The same report surfaces a second defect: typing fast ("mug") can leave the page showing results for an earlier, already-superseded keystroke ("mu") — not just a transient flicker, but the *settled* state being wrong. A sighted colleague on slow wifi saw it too, so it is a correctness bug in how the page handles overlapping search requests, not only an accessibility gap.

## What changes for the user

- As the result list changes in response to typing, a screen reader announces the outcome right away — how many items matched, or that none did — without the user needing to move focus into the list to find out. This announcement is **new page content**: no match count or summary exists anywhere on the page today, so this is not an exposure of text that was already there. It lives in a short, visually-hidden summary of its own, separate from the item cards — the same pattern already used for order outcomes — so a screen reader is never made to re-read every remaining item's full detail on a keystroke; the empty-state phrasing already used for "no results" (`REQ-CAT-6`) is what the summary holds when nothing matches.
- The page's very first search — the automatic one that runs on load, before anyone has typed anything — is announced the same way as every search after it. It is not a silent exception: an absent or empty query is already a search under `REQ-CAT-3` (it returns everything), so it gets the same treatment.
- Every settled outcome is announced as soon as it renders, not just the last one after typing pauses. This is a decision, not an open question: once a stale response can no longer overwrite a newer one (see below), holding an outcome back until typing pauses would need its own timing mechanism — and any such mechanism is explicitly out of scope below.
- Whatever appears after typing settles is *correct* for what was actually typed. If an earlier keystroke's response arrives late, it no longer overwrites a newer, already-rendered result — so nobody, sighted or not, ends up looking at results for "mu" after finishing typing "mug".
- Placing an order refreshes the item list, but that refresh does not itself trigger a new summary announcement. Ordering changes stock counts, not which items match the current query, so a screen reader hears the order outcome (`REQ-ORD-7`) once and is not immediately followed by a duplicate summary it already heard seconds earlier.

## Out of scope

- Any change to what counts as a match (`REQ-CAT-3`) or how price narrows the list (`REQ-CAT-4`) — this change is about how results already computed by the API are surfaced and sequenced on the page, not what matches.
- The announcement composing with a `max_price` ceiling (`REQ-CAT-4`) — the page has no control that can set `max_price` at all, and `loadItems()` only ever sends `q`. A shopper cannot reach that state from the page, so it stays the API-level concern `REQ-CAT-4` already covers, with no page-side scenario here.
- Any debounce interval or other request-throttling mechanism — an implementation choice for the build, not a behaviour a user can observe or a test can assert on. This is also why every settled outcome is announced as it renders rather than only once typing pauses: a pause-based "calm" mode would itself be a throttling mechanism.

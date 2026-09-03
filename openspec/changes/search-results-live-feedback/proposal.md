# Give search live, trustworthy feedback

## Why now

Issue #66: a screen-reader user (VoiceOver/Safari, NVDA/Firefox) can find the search box, but once they type, the page tells them nothing. The result list changes silently — no match, one match, or many, all look and sound the same until they tab down and explore. Placing an order already announces its outcome immediately (`REQ-ORD-7`); search is the one interaction left that still forgets the user is there. The earlier fix for order announcements ([`note-aria-live-announcement`](../../changes/archive/2026-09-02-note-aria-live-announcement/proposal.md)) named this exact gap and deliberately left it for its own Gate 1 — this is that change.

The same report surfaces a second defect: typing fast ("mug") can leave the page showing results for an earlier, already-superseded keystroke ("mu") — not just a transient flicker, but the *settled* state being wrong. A sighted colleague on slow wifi saw it too, so it is a correctness bug in how the page handles overlapping search requests, not only an accessibility gap.

## What changes for the user

- As the result list changes in response to typing, a screen reader announces the outcome right away — how many items matched, or that none did — without the user needing to move focus into the list to find out. The same phrasing already used for "no results" (`REQ-CAT-6`) is what gets announced when nothing matches.
- Whatever appears after typing settles is *correct* for what was actually typed. If an earlier keystroke's response arrives late, it no longer overwrites a newer, already-rendered result — so nobody, sighted or not, ends up looking at results for "mu" after finishing typing "mug".

## Out of scope

- Any change to what counts as a match (`REQ-CAT-3`) or how price narrows the list (`REQ-CAT-4`) — this change is about how results already computed by the API are surfaced and sequenced on the page, not what matches.
- The exact wording of the match-count announcement, beyond stating the count — only the empty-state wording is fixed, because it already exists (`REQ-CAT-6`).
- Any debounce interval or other request-throttling mechanism — an implementation choice for the build, not a behaviour a user can observe or a test can assert on.
- The order-outcome live region (`REQ-ORD-7`) — already announces correctly and is untouched here.

## Open question

Today the page fires a new request on every keystroke. Once stale responses can no longer win (see below), should the live region announce **every** settled keystroke's outcome as it renders (chattier, but nothing ever hidden), or only once typing pauses briefly (calmer, closer to how the order region announces one discrete outcome per action)? The issue's own account is ambivalent about whether the churn and the silence are one problem or two — Gate 1 should pick one.

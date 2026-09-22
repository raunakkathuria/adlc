# A genuinely empty catalogue says so, distinctly from a search with no matches

## Why now

Issue #108: `loadItems()` renders the same `Nothing matches "{q}".` message whether zero results come from a search or from a catalogue that holds no items at all — with an empty query, that reads the nonsensical `Nothing matches "".` The live-region announcement (`REQ-CAT-7`) already gets this right (`Showing 0 items.`), so the visible message and the announcement can currently disagree in wording and in honesty about what happened. Not reproducible against today's seeded catalog (3 items, no delete endpoint) — this is a code-read finding from a scheduled exploration, not an observed live defect, but the mismatch is real and the existing test harness can force the zero-item state by stubbing the `/api/items` response, the same way `REQ-CAT-7`'s own "catalogue holds none" tests already do.

## What changes for the user

When the catalogue itself holds zero items and no search query narrows it, the page tells the shopper the catalogue is empty, instead of claiming nothing matched an empty search. A search that genuinely matches nothing — a non-empty query with no hits — keeps today's `Nothing matches "{q}".` wording unchanged. The live-region announcement's existing `Showing 0 items.` wording for an empty catalogue is unaffected; this only fixes the message shown among the item cards.

## Out of scope

- No change to `REQ-CAT-3` search semantics, or to the `Nothing matches "{q}".` wording for an actual no-match search.
- No change to `REQ-CAT-7`'s live-region announcement wording — it already distinguishes these two cases correctly.
- No delete endpoint or any other way to make the real seeded catalog empty — the fix is verified by stubbing the item-list response, as `REQ-CAT-7`'s own zero-item tests already do.
- No change to the load-failure message or path (`REQ-CAT-11`) — a failed load and a successful load of zero items are already distinct code paths.

## Open question

None — the fix is exactly what the issue proposes: a distinct, query-free message for a genuinely empty catalogue.

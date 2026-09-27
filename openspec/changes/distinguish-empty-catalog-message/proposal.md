# A genuinely empty catalogue says so, distinctly from a search with no matches

## Why now

Issue #108: `loadItems()` renders the same `Nothing matches "{q}".` message whether zero results come from a search or from a catalogue that holds no items at all — with an empty query, that reads the nonsensical `Nothing matches "".` The live-region announcement (`REQ-CAT-7`) already gets this right (`Showing 0 items.`), so the visible message and the announcement can currently disagree in wording and in honesty about what happened. Not reproducible against today's seeded catalog (3 items, no delete endpoint) — this is a code-read finding from a scheduled exploration, not an observed live defect, but the mismatch is real and the existing test harness can force the zero-item state by stubbing the `/api/items` response, the same way `REQ-CAT-7`'s own "catalogue holds none" tests already do.

## What changes for the user

When the item list loads with no search query and no other filter narrowing it, and the catalogue itself holds zero items, the page states this exactly: `The catalogue is empty.`, in place of the item cards — instead of claiming nothing matched an empty search. A search that genuinely matches nothing — a non-empty query with no hits — keeps today's `Nothing matches "{q}".` wording unchanged, and so does a zero-result narrowed by any other filter (see Out of scope). The live-region announcement's existing `Showing 0 items.` wording for an empty catalogue is unaffected; this only fixes the message shown among the item cards.

## Out of scope

- No change to `REQ-CAT-3` search semantics, or to the `Nothing matches "{q}".` wording for an actual no-match search.
- No change to `REQ-CAT-7`'s live-region announcement wording — it already distinguishes these two cases correctly.
- No delete endpoint or any other way to make the real seeded catalog empty — the fix is verified by stubbing the item-list response, as `REQ-CAT-7`'s own zero-item tests already do.
- No change to the load-failure message or path (`REQ-CAT-11`) — a failed load and a successful load of zero items are already distinct code paths.
- A zero-item result produced while a filter other than an empty search is applied — for example `max_price` (`REQ-CAT-4`) narrowing the list to nothing — is not a genuinely empty catalogue, and this requirement does not decide what message that case gets. `max_price` has no control on the catalogue page today (`REQ-CAT-4` is API-only), so this case cannot occur through the page yet; the change that eventually gives shoppers a way to apply it (see issue #110) is the one that decides its own empty-state wording, not this one.

## Open question

None — the fix is exactly what the issue proposes, pinned to the exact wording and scope the human specified: a distinct, query-free message for a genuinely empty catalogue, shown only when no query and no other filter narrows the list.

## Why now

The page has one region (`#note`) for the result of the last order. Today it keeps its text when the shopper goes on to search for something else, so a "placed" or "rejected" message can sit beside results it has nothing to do with and read as current. Issue #124, found by the line's own exploration.

## What changes for the user

- When the shopper changes the search query, the last order's message (confirmation, rejection, or "not sent") disappears at once, before the new results arrive. Nothing is announced by the clearing.
- The list refresh that follows an order does not clear it, so a fresh outcome stays visible.
- The order history still records every order; only the transient message goes.

Capability touched: `orders` only (`REQ-ORD-7`, modified — it owns the region). The page is the only surface: the API has no such message. No new capability directory. Nothing about the message's content moves, so the existing inert-text guarantees are untouched.

## Out of scope

- Labelling the message as "last order" instead of clearing it (see open question).
- Clearing on the catalogue's retry control: it reloads the same query, which is not a new search.
- Any change to the search summary (`REQ-CAT-7`) or the order history (`REQ-ORD-10`).
- Timed auto-dismissal of the message.

## Open question

Clear the message on a new search (as drafted), or keep it and label it "Last order: …"? Reply "label" and the delta will be revised. Clearing was chosen because the region is a live announcement, and a label would be re-announced on every reword.

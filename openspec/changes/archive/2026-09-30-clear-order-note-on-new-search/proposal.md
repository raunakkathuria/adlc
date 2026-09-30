## Why now

The page has one region (`#note`) for the result of the last order. Today it keeps its text when the shopper goes on to search for something else, so a "placed" or "rejected" message can sit beside results it has nothing to do with and read as current. Issue #124, found by the line's own exploration.

## What changes for the user

- When the trimmed search query changes, a confirmation or a rejection disappears at once, while the new results are still on their way. The region's text becomes empty, and the clearing writes no new sentence into it.
- A "not sent" message stays. Clearing it would remove the only sign that the order may not exist (`REQ-ORD-11`), and the history cannot record an order that never arrived. That is a deliberate exception to the clear.
- Typing or deleting only whitespace, so the trimmed query is unchanged, does not clear anything. The catalogue's retry reloads the same query and does not clear anything. The list refresh that follows an order does not clear it either.
- A confirmation or a rejection that arrives after the trimmed query has already changed is not written into the region. That is the same stale pairing this change removes: an "Order placed" for a mug must not appear beside cup results. The order itself is unchanged — a successful order is still in the history, and the item-list refresh for the old query is still discarded (`REQ-CAT-8`). A rejection that arrives that late is not announced; the history does not record a rejection, so the shopper is not told. A "not sent" that arrives after the change is written in and announced, and a later search does not clear it.
- "Already changed" is judged when the outcome arrives, by comparing the trimmed query with the one the order was placed under. If the shopper went mug → book → mug during the flight, the results beside the outcome are for `mug` again, so the outcome is shown. A withheld outcome never overwrites a not-sent message already showing.
- The order history still records every order that was accepted. Only the transient confirmation or rejection goes.

Capability touched: `orders` only (`REQ-ORD-7`, modified — it owns the region). The page is the only surface: the API has no such message. No new capability directory. Nothing about the message's content moves, so the existing inert-text guarantees are untouched.

## Out of scope

- Labelling the message as "last order" instead of clearing it. This delta clears a confirmation or a rejection. A label would be re-announced on every reword, and the region is a live announcement.
- Any change to the search summary (`REQ-CAT-7`) or the order history (`REQ-ORD-10`), other than a successful order still appearing in the history when its confirmation is withheld.
- Timed auto-dismissal of the message.

## Open question

Should a query that changes and reverts during an order's flight withhold the outcome (any change counts) or show it (only the final query counts, as drafted)? Drafted as the latter; say if you want the former.

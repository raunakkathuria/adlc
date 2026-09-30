## Why now

The page has one region (`#note`) for the result of the last order. Today it keeps its text when the shopper goes on to search for something else, so a "placed" or "rejected" message can sit beside results it has nothing to do with and read as current. Issue #124, found by the line's own exploration.

## What changes for the user

- When the trimmed search query changes, a confirmation or a rejection disappears at once, while the new results are still on their way. The region's text becomes empty, and the clearing writes no new sentence into it.
- A "not sent" message stays. Clearing it would remove the only sign that the order may not exist (`REQ-ORD-11`), and the history cannot record an order that never arrived. That is a deliberate exception to the clear.
- Typing or deleting only whitespace, so the trimmed query is unchanged, does not clear anything. The catalogue's retry reloads the same query and does not clear anything. The list refresh that follows an order does not clear it either.
- A confirmation or a rejection that arrives after the trimmed query has changed is not written into the region. That is the same stale pairing this change removes. The comparison uses the trimmed search field at the moment the Order button was operated, not the results still on screen. If the shopper goes mug → book → mug during the flight, the field matches again and the outcome is shown. A not-sent message stays across later searches until the next order outcome replaces it, and a withheld confirmation or rejection does not replace it.
- A late rejection is not announced. The history does not record a rejection, so the shopper is not told. That cost is accepted: a rejection for one search must not be read as current beside another. The scenarios that say a rejection is announced apply only while the field is unchanged.
- The order history list is reloaded even when the confirmation is withheld, so the accepted order appears there. The catalogue cards may still show the stock from before the order, because the refresh for the old query is discarded (`REQ-CAT-8`). That window is accepted.

Capability touched: `orders` only (`REQ-ORD-7`, modified — it owns the region). The page is the only surface: the API has no such message. No new capability directory. Nothing about the message's content moves, so the existing inert-text guarantees are untouched.

## Out of scope

- Labelling the message as "last order" instead of clearing it. This delta clears a confirmation or a rejection. A label would be re-announced on every reword, and the region is a live announcement.
- Any change to the search summary (`REQ-CAT-7`) or the order history (`REQ-ORD-10`), other than a successful order still appearing in the history when its confirmation is withheld.
- Timed auto-dismissal of the message.

# Order limit checked before stock

## Why now

`REQ-ORD-3` says an order over 20 units "SHALL be rejected, regardless of stock", and its scenario names no SKU — it reads as a promise about every item in the catalogue. `app/server.mjs` checks stock before the unit limit, so the rejection reason a shopper sees for the same over-limit order depends on which item they picked: `MUG-1` and `BOOK-1` (plenty of stock) answer `over_limit`, but `PEN-1` (8 in stock) answers `insufficient_stock` — the scenario's `THEN` is false for it. Filed as issue #85, reproduced with a failing test (`repro-85`), and already recorded as a known gap in `docs/design.md`.

## What changes for the user

A shopper who orders more than 20 units of any item is always told the order is over the unit limit, never that stock is insufficient — even for an item, like `PEN-1`, that also doesn't have 21 in stock. The rejection is now the same shape for every item at the same quantity, regardless of that item's stock level. The page needs no change to show this: `REQ-ORD-9` already gives `over_limit` its own plain-English wording, so whichever reason the API now returns for these orders was already displayed correctly.

## Out of scope

- `REQ-ORD-2` (stock is a hard limit) is unchanged for every order that does not also exceed the unit cap — an order for 12 units of an 8-stock item still answers `insufficient_stock`, exactly as before.
- `REQ-ORD-4` (a rejected order changes nothing) already covers `over_limit` rejections; this delta changes which reason is returned in the overlapping case, not whether the rejection is inert.
- No new rejection reason, no change to the 20-unit threshold itself, no change to the discount or malformed-request rules.

## Open question

Should the unit-limit rejection always take precedence over the stock rejection when both apply (this delta's choice, matching the scenario's literal, unqualified "21 units are ordered" and the requirement's own "regardless of stock"), or should the more specific `insufficient_stock` reason still win when it's the tighter constraint (in which case the scenario, not the code, should change to name a well-stocked SKU)? This delta implements the first reading.

# Show the ordered item's name in order-history entries

## Why now

The order history (`<ol id="orders">`) renders `#{id} — {qty} × {sku} — {total}`, with no item name. A shopper with several different items ordered has to mentally map SKUs back to names to know what they bought. `REQ-ORD-10` already covers this entry — it requires the `sku` shown there to be inert text — but it is silent on the item's name, because showing the name was never in scope for that delta; the current rendering is spec-covered, not a defect. Issue #88, raised by the line's own scheduled exploration, asks for the UX pass this delta is.

## What changes for the user

Each order-history entry now shows the ordered item's name alongside its SKU, in addition to the quantity and total it already shows: for example, `#3 — 2 × Enamel Mug (MUG-1) — £25.00` in place of today's `#3 — 2 × MUG-1 — £25.00`. Nothing else about placing an order, stock, discounts, or rejections changes.

To render this without guessing, `GET /api/orders` and a successful `POST /api/orders` both now also carry the ordered item's `name`, alongside the `id`, `sku`, `qty`, and `total` they already carry. The item's name is already server-supplied data rendered elsewhere on the page (the item card, `REQ-CAT-10`; the Order button's accessible name, `REQ-ORD-8`), both under a guarantee that no part of it is ever interpreted as markup or run as script. This delta carries that same guarantee to the order history, the third surface that now renders it.

## Out of scope

- The order-outcome confirmation banner (`REQ-ORD-7`), shown immediately after placing an order, still reads `{qty} × {sku}` with no name. The issue names only the order-history list; the confirmation already carries its own inert-text guarantee for the SKU it echoes, unaffected by this delta. A symmetrical change there is a decision for its own delta.
- What happens if an item's name could change after an order referencing it was placed. The catalog has no endpoint that creates, renames, or removes an item (`openspec/specs/catalog/spec.md`: "Over the API it is read-only"), so there is no system state today where "the name at order time" and "the name now" could differ.
- No change to the order history's sort order, filtering, or pagination — none exist today and none are added.
- No change to stock, discount, rejection, or malformed-request rules.

## Open question

The issue leaves it open whether the item name should appear *alongside* the SKU or *replace* it. This delta keeps the SKU, parenthetically after the name, because the item card and the Order button (`REQ-CAT-10`, `REQ-ORD-8`) already show the name first with the SKU as a secondary identifier, and a shopper may still want to cross-reference an order by SKU. Should the SKU be dropped from the order-history entry entirely instead, leaving only the name, quantity, and total?

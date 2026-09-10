# Show the ordered item's name in the order confirmation

## Why now

The order-outcome confirmation (`#note`, populated by `order()` in `app/index.html`) reads `Order #{id} placed — {qty} × {sku} for {total}.` — SKU only, no item name. Since the `order-history-item-name` change shipped, the order-history entry just below it reads `#{id} — {qty} × {name} ({sku}) — {total}`, naming the item. A shopper who doesn't recognize SKUs now sees the name one line down, but not at the moment the confirmation itself speaks — the exact moment it should tell them what they ordered. That earlier change named this gap explicitly and left it out on purpose: "The order-outcome confirmation banner (`REQ-ORD-7`) ... still reads `{qty} × {sku}` with no name ... A symmetrical change there is a decision for its own delta." Issue #93, raised by the line's own scheduled exploration, is that follow-up, and this is that delta.

## What changes for the user

After placing an order, the confirmation message names the item alongside its SKU, quantity, and total — the same `{name} ({sku})` grouping the order history already uses:

`Order #1 placed — 2 × Enamel Mug (MUG-1) for £25.00.`

in place of today's `Order #1 placed — 2 × MUG-1 for £25.00.` Nothing else changes: rejection messages (`REQ-ORD-9`) still don't name an item, the order history's own format (`REQ-ORD-10`) is unaffected, and placing, stock, discount, and rejection rules are untouched.

No API change is needed. `POST /api/orders`'s `201` response already carries the ordered item's `name` (`REQ-ORD-1`, shipped by `order-history-item-name`) — this delta only changes how the page renders the confirmation it already receives.

## Out of scope

- The order-history entry's own format (`REQ-ORD-10`) — already shows the name, unaffected.
- Rejection message wording (`REQ-ORD-9`) — rejections carry no item name today and still don't; the issue is specific to the *success* confirmation.
- What happens if an item's name could change after an order referencing it was placed — the catalog is still read-only over the API (`openspec/specs/catalog/spec.md`), so this doesn't arise, the same reasoning `order-history-item-name` gave and which still holds.
- Any change to `POST /api/orders` or `GET /api/orders`'s response shape — `name` is already there.

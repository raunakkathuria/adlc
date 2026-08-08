## Cause

`createOrder` decremented `item.stock` *before* the 20-unit cap check ran, so an over-limit order was rejected only after it had already taken its units off the shelf.

## Diff

```diff
--- a/app/server.mjs
+++ b/app/server.mjs
@@ -56,11 +56,11 @@ export function createOrder(sku, qty) {
   if (!item) return { ok: false, reason: 'unknown_sku' };
   if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: 'invalid_qty' };
   if (qty > item.stock) return { ok: false, reason: 'insufficient_stock' };
-
-  item.stock -= qty; // reserve the units
-
   if (qty > MAX_UNITS_PER_ORDER) return { ok: false, reason: 'over_limit' };
 
+  // The decision is final — only now does anything change. REQ-ORD-4: a rejection consumes nothing.
+  item.stock -= qty;
+
   const order = { id: nextOrderId++, sku, qty, total: orderTotal(item.price, qty) };
   orders.push(order);
   return { ok: true, order };
```

The write moves below the last guard rather than being compensated after the fact. Adding `item.stock += qty` on the reject path would have turned the tests green while leaving a mid-decision write in place — the same bug waiting for the next guard somebody adds. Guard order is unchanged, so every rejection still reports the same `reason` it did before: `PEN-1 qty 12` is still `insufficient_stock`, `MUG-1 qty 25` is still `over_limit`.

## `npm run verify`

```
> ai-sdlc-workshop@0.1.0 verify
> npm test --silent && npm run req-coverage --silent

✔ REQ-CAT-1: lists every item with sku, name, price and stock (12.466584ms)
✔ REQ-CAT-2: fetches a single item by sku (4.032916ms)
✔ REQ-CAT-2: an unknown sku is a 404 with a reason (1.479708ms)
✔ REQ-CAT-3: search narrows the list to the matching item (1.429ms)
✔ REQ-CAT-3: an empty query returns everything (1.304375ms)
✔ REQ-ORD-1: an accepted order is created and takes units out of stock (17.0245ms)
✔ REQ-ORD-2: an order beyond available stock is rejected (3.956292ms)
✔ REQ-ORD-3: an order over the 20-unit cap is rejected (1.649833ms)
✔ REQ-ORD-3: exactly 20 units is allowed (1.43725ms)
✔ REQ-ORD-4: a rejected order leaves stock untouched (3.187791ms)
✔ REQ-ORD-4: an over-limit rejection leaves stock and order history untouched (4.251208ms)
✔ REQ-ORD-4: every rejection reason leaves the catalog and orders unchanged (6.539916ms)
✔ REQ-ORD-4: stock consumed by a rejection must not starve a later valid order (3.198542ms)
✔ REQ-ORD-5: 12 units take 10% off, rounded down (0.840917ms)
✔ REQ-ORD-5: 9 units pay the gross total (0.845708ms)
✔ REQ-ORD-6: an unknown sku is a 404 (1.333584ms)
✔ REQ-ORD-6: a non-positive or fractional qty is a 400 (2.519416ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 121.212875
  ✓ REQ-CAT-1  test/catalog.test.js
  ✓ REQ-CAT-2  test/catalog.test.js
  ✓ REQ-CAT-3  test/catalog.test.js
  ✓ REQ-ORD-1  test/orders.test.js
  ✓ REQ-ORD-2  test/orders.test.js
  ✓ REQ-ORD-3  test/orders.test.js
  ✓ REQ-ORD-4  test/orders.test.js
  ✓ REQ-ORD-5  test/orders.test.js
  ✓ REQ-ORD-6  test/orders.test.js

req-coverage: 9 requirements, all covered.
```

All 17 pass, including the 12 that were passing before. I watched the three new REQ-ORD-4 tests fail first — stock 22 instead of 47, and a valid 20-unit order rejected because two failed attempts had eaten the shelf down to 5.

## Noticed, deliberately not changed

**Neighbours: none.** The mechanism is *a write that lands before the decision is final*. `createOrder` is the only path in `server.mjs` that mutates `items`, and `orders.push` / `nextOrderId++` already sat on the success side of the last guard. There is no second instance of this.

**`listItems`, `getItem` and `listOrders` hand out the live objects un-copied.** A different hazard — internal state escaping rather than being written early — and no rejection path touches it. The HTTP layer only serialises them, so nothing is broken today. Not mine to fix under this prompt.

**REQ-ORD-3's "regardless of stock" leaves one reason string ambiguous.** An order that breaks both rules at once — say `PEN-1 qty 25`, over the cap *and* over its 8 in stock — reports `insufficient_stock`, because the stock guard runs first. The spec's "regardless of stock" says the cap isn't conditioned on stock; it doesn't say `over_limit` outranks `insufficient_stock` when reporting. Both readings reject the order, so there's no behavioural drift — only a reason string on a combination no test pins. Reordering the guards to change it would be a behaviour change with no requirement behind it. If the product wants a defined precedence, that's a spec delta and a human gate.

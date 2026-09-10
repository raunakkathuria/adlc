# Tasks

- [ ] 1.1 Update the existing `REQ-ORD-12` test asserting `max="20"` (`test/orders.test.js`) so it targets an item with 20 or more in stock (for example `MUG-1`, 47 in stock), and watch it keep passing — it already describes the well-stocked case.
- [ ] 1.2 Write a test asserting a scarcer item's quantity input carries `max` equal to its own stock, not `20` — for example `PEN-1` (8 in stock) renders `max="8"` — REQ-ORD-12. Watch it fail against today's static `max="20"`.
- [ ] 1.3 Write a test asserting an item with exactly 20 in stock renders `max="20"` — REQ-ORD-12.
- [ ] 1.4 Write a test asserting an item with 0 in stock renders `max="0"` — REQ-ORD-12.
- [ ] 1.5 Update the existing `REQ-ORD-12` "composes with search" test so it asserts the stock-aware `max` (not a hardcoded `"20"`) survives a search that narrows the catalogue — REQ-ORD-12.
- [ ] 1.6 Write a test asserting that after an order lowers an item's stock, the item list's next refresh renders that item's quantity input with a `max` reflecting the new, lower stock — REQ-ORD-12.
- [ ] 1.7 Change the quantity input's `max` in `app/index.html` from the literal `20` to `Math.min(20, item.stock)`, leaving `min="1"`, the default value, the input's `id`/accessible name, and the order-submission logic untouched.
- [ ] 1.8 Confirm the existing `REQ-ORD-2` and `REQ-ORD-3` scenarios (stock and unit-limit rejections) pass unchanged, since this delta adds a hint only.
- [ ] 1.9 Run `npm run verify` and confirm all tests pass and coverage is green.

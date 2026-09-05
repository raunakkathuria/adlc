## 1. API — `POST /api/orders`

- [ ] 1.1 Apply the attached reproduction (`repro-85`): an order for 21 units of an item with fewer than 21 in stock (e.g. `PEN-1`, stock 8) expects `422 {"reason":"over_limit"}`. Confirm it fails on the current build for the stated reason (`insufficient_stock` returned instead).
- [ ] 1.2 In `createOrder` (`app/server.mjs`), check the 20-unit limit before the stock check, so the unit-limit rejection wins whenever both would otherwise apply.
- [ ] 1.3 Confirm the reproduction now passes, and that the existing `REQ-ORD-2` scenario (order under the unit limit, over stock) and `REQ-ORD-4` scenarios (a rejected order leaves stock and the order list untouched) still pass unchanged.
- [ ] 1.4 `npm run verify` green.

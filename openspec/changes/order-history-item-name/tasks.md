# Tasks

## 1. API — order records carry the item name

- [ ] 1.1 Write a test asserting the `201` response from `POST /api/orders` includes the ordered item's `name`, alongside `id`, `sku`, `qty`, and `total` — REQ-ORD-1. Watch it fail against today's build.
- [ ] 1.2 Write a test asserting `GET /api/orders` lists that same `name` for every order — REQ-ORD-1. Watch it fail.
- [ ] 1.3 Include the ordered item's `name` in the order record `createOrder` builds in `app/server.mjs`, so both the `POST` response and `GET /api/orders` carry it.
- [ ] 1.4 Confirm 1.1 and 1.2 now pass.

## 2. Order-history page — shows the item name

- [ ] 2.1 Update the existing REQ-ORD-10 "ordinary order" test to expect the new entry format, `#{id} — {qty} × {name} ({sku}) — {total}`, and confirm it fails against today's page (which renders the SKU alone).
- [ ] 2.2 Write a test asserting markup in an order's item `name` is shown as inert text in the order-history entry, and that a script-injection construct in the name does not run — REQ-ORD-10. The real catalog has no write path for a markup name, so stand in for the order-list response the way the existing `fakeOrdersFetch` test helper already does, extended with a `name` field. Watch it fail.
- [ ] 2.3 Update `loadOrders()` in `app/index.html` to render each entry with the item's name, routed through the same `escapeHtml()` already used for the SKU.
- [ ] 2.4 Confirm 2.1 and 2.2 now pass, and that the existing REQ-ORD-10 markup-in-SKU test still passes unchanged.

## 3. Verify

- [ ] 3.1 `npm run verify` green — requirement coverage includes REQ-ORD-1 and REQ-ORD-10.

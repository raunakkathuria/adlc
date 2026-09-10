# Tasks

## 1. Order confirmation — names the item

- [x] 1.1 Write a test asserting the confirmation message for an accepted order includes the ordered item's `name` alongside its `sku`, `qty`, and `total`, formatted as `Order #{id} placed — {qty} × {name} ({sku}) for {total}.` — REQ-ORD-7. Watch it fail against today's page (which renders the SKU alone).
- [x] 1.2 Write a test asserting markup in an ordered item's `name` is shown as inert text in the confirmation message, and that a script-injection construct in the name does not run — REQ-ORD-7. Watch it fail.
- [x] 1.3 Update the confirmation message built in `order()` in `app/index.html` to include the item's `name`, routed through the same `escapeHtml()` already used for the SKU. `body.name` is already returned by `POST /api/orders` (`REQ-ORD-1`) — no server change is needed.
- [x] 1.4 Confirm 1.1 and 1.2 now pass, and that the existing REQ-ORD-7 SKU-inert-text and rejection tests still pass unchanged.

## 2. Verify

- [x] 2.1 `npm run verify` green — requirement coverage includes REQ-ORD-7.

# Tasks

- [ ] 1.1 Write a test asserting the catalogue page's item card renders a zero-stock item's Order button as disabled — REQ-ORD-13. Watch it fail against today's markup.
- [ ] 1.2 Write a test asserting an item with 1 or more in stock still renders its Order button as enabled — REQ-ORD-13.
- [ ] 1.3 Write a test asserting the disabled state survives a search that narrows the catalogue to a zero-stock item (REQ-CAT-3) — REQ-ORD-13.
- [ ] 1.4 Write a test asserting an item that drops to 0 stock as the result of an accepted order is rendered with its Order button disabled once the post-order refresh completes — REQ-ORD-13.
- [ ] 1.5 Disable the Order button for a zero-stock item in `app/index.html`, leaving the button's accessible name, the quantity input, and the order-submission logic untouched.
- [ ] 1.6 Confirm the existing `REQ-ORD-2` scenario (an order over stock is rejected) still passes unchanged, since this delta adds a hint only.
- [ ] 1.7 Run `npm run verify` and confirm the new tests pass and coverage is green.

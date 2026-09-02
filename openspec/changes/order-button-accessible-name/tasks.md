# Tasks

- [ ] 1.1 Write a test asserting `GET /` serves each item card's Order button (`button[data-sku]`) with an accessible name that includes the item's name (an `aria-label` or equivalent) — REQ-ORD-8. Watch it fail against today's markup, where the button's only text is "Order".
- [ ] 1.2 Add the accessible name to the Order button in `app/index.html`, keeping the visible "Order" label unchanged.
- [ ] 1.3 Run `npm run verify` and confirm the new test passes and coverage is green.

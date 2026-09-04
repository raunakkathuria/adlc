# Tasks

- [ ] 1.1 Write a test asserting that an item's `name`/`sku` containing markup/script constructs (for example `<img src=x onerror=alert(1)>`, or a quote followed by an event-handler attribute) is rendered as inert text in the item card's visible name, visible SKU, and the quantity input's accessible name — REQ-CAT-10. Watch it fail against today's page.
- [ ] 1.2 Write a test asserting the same for the Order button's accessible name — REQ-ORD-8. Watch it fail against today's page.
- [ ] 1.3 Fix the catalogue page's item-card rendering in `app/index.html` so `item.name` and `item.sku` are routed through the same `escapeHtml()` already used for the search query, everywhere the card interpolates them into `innerHTML` — the visible name, the visible SKU, the quantity input's `aria-label`, and the Order button's `aria-label`.
- [ ] 1.4 Run `npm run verify` and confirm the new tests pass and coverage is green.

# Tasks

- [ ] 1.1 Write a failing test that a zero-stock item's Order button carries an accessible description (e.g. `aria-describedby`) whose referenced text includes the item's stock count
- [ ] 1.2 Write a failing test that the referenced description text is the same stock text the item card already displays in its meta line (`REQ-CAT-10`), not new wording
- [ ] 1.3 Write a failing test that an item with 1 or more in stock renders an Order button with no disabled-reason description
- [ ] 1.4 Write a failing test that the description composes with search — a zero-stock item among search-narrowed results keeps its Order button's description
- [ ] 1.5 Write a failing test that an item which drops to zero stock via an accepted order (`REQ-ORD-1`) gains the description on the item list's next render
- [ ] 1.6 Write a failing test that the button's accessible name is unaffected — still exactly "Order {name}" per `REQ-ORD-8` — when the description is present
- [ ] 2.1 Give the item card's rendered stock text a stable identifier and reference it from the Order button's accessible description when the button is disabled
- [ ] 2.2 Run `npm run verify` and confirm all new tests pass and no existing test regresses

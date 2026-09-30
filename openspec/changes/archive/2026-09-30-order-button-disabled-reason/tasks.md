# Tasks

- [x] 1.1 Write a failing test that a zero-stock item's Order button carries an accessible description (e.g. `aria-describedby`) whose referenced text is exactly that item's stock text, "{n} in stock" (for example "0 in stock")
- [x] 1.2 Write a failing test that the referenced description text is exactly that stock text and not the item card's whole meta line — it does not include the item's SKU or price
- [x] 1.3 Write a failing test that an item with 1 or more in stock renders an Order button with no disabled-reason description
- [x] 1.4 Write a failing test that when two or more items are out of stock at the same time, each one's Order button's description is that item's own stock text, never another item's
- [x] 1.5 Write a failing test that the description composes with search — a zero-stock item among search-narrowed results keeps its Order button's description
- [x] 1.6 Write a failing test that an item which drops to zero stock via an accepted order (`REQ-ORD-1`) gains the description on the item list's next render
- [x] 1.7 Write a failing test that the button's accessible name is unaffected — still exactly "Order {name}" per `REQ-ORD-8` — when the description is present
- [x] 2.1 Give the item card's rendered stock text its own stable identifier, distinct from the SKU and price in the same meta line, and reference it from the Order button's accessible description when the button is disabled
- [x] 2.2 Run `npm run verify` and confirm all new tests pass and no existing test regresses

# Tasks

- [ ] 1.1 Write a failing test that operating an item's Order button twice before the outcome is known sends one `POST /api/orders` and places one order (`REQ-ORD-14`)
- [ ] 1.2 Write a failing test that the button is disabled while the order is pending and operable again after a confirmation, a rejection, a not-sent outcome, and a withheld outcome
- [ ] 1.3 Write a failing test that only the ordered item's button is held, and that a different item can be ordered meanwhile
- [ ] 1.4 Write a failing test that the hold survives a re-render of the item list (search change while pending)
- [ ] 1.5 Write a failing test that a pending-disabled button carries no out-of-stock description, and that its accessible name, visible text and the quantity input are unchanged
- [ ] 1.6 Write a test that the server still accepts two sequential valid orders for the same item
- [ ] 2.1 Hold an item's Order button from the moment its order is placed until the outcome is known, following the item across list re-renders, and release it on every outcome
- [ ] 3.1 Run `npm run verify` and confirm the new tests pass and no existing test regresses

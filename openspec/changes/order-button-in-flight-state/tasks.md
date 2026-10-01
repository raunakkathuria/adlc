# Tasks

- [ ] 1.1 Write a failing test that operating an item's Order button twice before the outcome is known, by click or by Enter or Space, sends one `POST /api/orders`, places exactly one order, and drops stock by `qty` once (`REQ-ORD-14`)
- [ ] 1.2 Write a failing test that the button uses the native `disabled` attribute while the order is pending and is enabled again at the moment a confirmation, a rejection, a not-sent outcome, or a withheld outcome is known — not when a later refresh arrives — unless the card then showing says 0 in stock
- [ ] 1.3 Write a failing test that only the ordered item's button is held, and that a different item can be ordered meanwhile
- [ ] 1.4 Write a failing test that the hold survives a re-render, the item leaving the list and coming back, and a load failure followed by retry
- [ ] 1.5 Write a failing test that a button disabled only because an order is in flight carries no stock description (`REQ-ORD-13`), and that its accessible name, visible text and the quantity input are unchanged; a zero-stock button still carries "0 in stock"
- [ ] 1.6 Write a test that the server still accepts two sequential valid orders for the same item once the first outcome is known
- [ ] 2.1 Hold an item's Order button from the moment its order is placed until the outcome is known, following the item across list re-renders, and release it on every outcome
- [ ] 3.1 Run `npm run verify` and confirm the new tests pass and no existing test regresses

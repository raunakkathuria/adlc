## 1. Tests (red)

- [ ] 1.1 `REQ-CAT-3`: bring in the reproduce station's failing test (`repro-17`) asserting `GET /api/items?q=mug` returns `Enamel Mug`
- [ ] 1.2 `REQ-CAT-3`: `GET /api/items?q=book-1` returns the item with SKU `BOOK-1`
- [ ] 1.3 `REQ-CAT-3`: a query that matches neither SKU nor name still returns `200` with an empty array
- [ ] 1.4 Confirm both new tests fail against today's `listItems()` before touching it

## 2. Implementation (green)

- [ ] 2.1 Match `q` against **SKU or name**, case-insensitively, in `listItems()`, composing unchanged with `max_price` (`REQ-CAT-4`)

## 3. Verification

- [ ] 3.1 `npm run verify` is green
- [ ] 3.2 `npm run req-coverage` shows `REQ-CAT-3` covered

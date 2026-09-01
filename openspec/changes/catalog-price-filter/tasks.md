## 1. Tests (red)

- [ ] 1.1 `REQ-CAT-4`: `GET /api/items?max_price=` returns only items priced at or under the ceiling
- [ ] 1.2 `REQ-CAT-4`: an item priced exactly at `max_price` is included (boundary is inclusive)
- [ ] 1.3 `REQ-CAT-4`: a `max_price` under every item's price returns `200` with an empty array
- [ ] 1.4 `REQ-CAT-4`: an absent `max_price` returns every item, unaffected
- [ ] 1.5 `REQ-CAT-4`: `max_price` combined with `q` returns only items matching both
- [ ] 1.6 `REQ-CAT-4`: a non-numeric `max_price` (e.g. `abc`, `10.50`) is refused with `400` and `{"reason":"invalid_max_price"}`
- [ ] 1.7 `REQ-CAT-4`: a negative `max_price` is refused with `400` and `{"reason":"invalid_max_price"}`

## 2. Implementation (green)

- [ ] 2.1 Validate `max_price` from the query string; reject non-integer or negative values before filtering
- [ ] 2.2 Filter the catalog listing by `max_price`, composing with the existing search filter

## 3. Verification

- [ ] 3.1 `npm run verify` is green
- [ ] 3.2 `npm run req-coverage` shows REQ-CAT-4 covered

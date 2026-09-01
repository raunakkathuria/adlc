## 1. Tests (red)

- [x] 1.1 `REQ-CAT-4`: `GET /api/items?max_price=1000` returns only items priced at or under the ceiling
- [x] 1.2 `REQ-CAT-4`: an item priced exactly at `max_price` is included (boundary is inclusive)
- [x] 1.3 `REQ-CAT-4`: a `max_price` under every item's price returns `200` with an empty array
- [x] 1.4 `REQ-CAT-4`: an absent `max_price` returns every item, unaffected
- [x] 1.5 `REQ-CAT-4`: `max_price` combined with `q` returns only items matching both
- [x] 1.6 `REQ-CAT-4`: a non-numeric `max_price` (e.g. `abc`, `10.50`) is refused with `400` and `{"reason":"invalid_max_price"}`
- [x] 1.7 `REQ-CAT-4`: a negative `max_price` is refused with `400` and `{"reason":"invalid_max_price"}`
- [x] 1.8 `REQ-CAT-4`: an empty `max_price` (`?max_price=`) is refused with `400` and `{"reason":"invalid_max_price"}`
- [x] 1.9 `REQ-CAT-4`: a borderline numeric form (e.g. `+10`, `1e3`, or leading/trailing whitespace) is refused with `400` and `{"reason":"invalid_max_price"}`
- [x] 1.10 `REQ-CAT-4`: a repeated `max_price` (`?max_price=100&max_price=200`) is refused with `400` and `{"reason":"invalid_max_price"}`, even when both values are individually well-formed

## 2. Implementation (green)

- [x] 2.1 Validate `max_price` from the query string — reject if it appears more than once, or if the single value doesn't match `^\d+$` (including empty) — before filtering
- [x] 2.2 Filter the catalog listing by `max_price`, composing with the existing search filter

## 3. Verification

- [x] 3.1 `npm run verify` is green
- [x] 3.2 `npm run req-coverage` shows REQ-CAT-4 covered

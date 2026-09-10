# Tasks

- [x] 1.1 Write a test asserting the catalogue page's item card quantity input carries `max="20"` alongside its existing `min="1"` — REQ-ORD-12. Watch it fail against today's markup.
- [x] 1.2 Write a test asserting the `max="20"` hint survives a search that narrows the catalogue (REQ-CAT-3) — REQ-ORD-12.
- [x] 1.3 Add `max="20"` to the quantity input in `app/index.html`, leaving `min="1"`, the default value, the input's `id`/accessible name, and the order-submission logic untouched.
- [x] 1.4 Confirm the existing `REQ-ORD-3` scenarios (an order over the limit is still rejected) pass unchanged, since this delta adds a hint only.
- [x] 1.5 Run `npm run verify` and confirm the new tests pass and coverage is green.

# Tasks

- [ ] 1.1 Write a failing test (REQ-STORE-1) that fetches `GET /` and asserts `#note` carries a live-region marking (e.g. `role="status"` or `aria-live="polite"`) in the markup returned on initial load — before any order has been placed
- [ ] 2.1 Add the live-region marking to `#note` in `app/index.html`, on the static element itself so it is present from page load and covers every message the region ever shows (success and every rejection reason alike)
- [ ] 3.1 Run `npm run verify` and confirm it is green

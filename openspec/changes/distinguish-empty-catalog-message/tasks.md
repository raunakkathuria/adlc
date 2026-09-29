# Tasks

- [ ] 1.1 Write a test that stubs the `/api/items` response to `[]` (as `REQ-CAT-7`'s existing "clearing the query announces zero items when the catalogue holds none" test already does), drives the page with an empty query, and asserts the item-area message is the exact text `The catalogue is empty.` rather than `Nothing matches "".` — REQ-CAT-12. Watch it fail against today's page script.
- [ ] 1.2 Write a test asserting a non-empty query that matches nothing still renders `Nothing matches "{q}".` in the item area, unchanged — REQ-CAT-6.
- [ ] 1.3 Write a test asserting the search-results live region still announces `Showing 0 items.` for an empty query against a zero-item catalogue, unchanged by this delta — REQ-CAT-7 (regression guard, not a new requirement).
- [ ] 1.4 In `app/index.html`, change the `items.length === 0` branch of `loadItems()` to distinguish an empty query (catalogue itself empty) from a non-empty query (search matched nothing), rendering the exact text `The catalogue is empty.` in the former case and the existing `Nothing matches "{q}".` message in the latter. (The page sends no other filter parameter today, so an empty query is the whole condition in code; `max_price` (`REQ-CAT-4`) staying unwired from the page is what keeps that out of scope — see proposal.)
- [ ] 1.5 Write a test asserting that neither the empty-catalogue message nor the no-results message renders as a list item (`REQ-CAT-9`).
- [ ] 1.6 Write a test asserting a whitespace-only query against a stubbed zero-item catalogue shows exactly `The catalogue is empty.` — REQ-CAT-12.
- [ ] 1.7 Run `npm run verify` and confirm the new tests pass and coverage is green.

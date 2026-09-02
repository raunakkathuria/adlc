# Tasks

- [ ] 1.1 Write a test asserting that a search query containing markup/script constructs (for example `<img src=x onerror=alert(1)>`) matching no items is rendered in the empty-state message as inert text, not parsed as markup or executed — REQ-CAT-6. Watch it fail against today's page.
- [ ] 1.2 Fix the catalogue page's empty-state rendering in `app/index.html` so the search query is displayed safely instead of spliced raw into `innerHTML`, keeping the existing `Nothing matches "..."` phrasing for ordinary queries unchanged.
- [ ] 1.3 Run `npm run verify` and confirm the new test passes and coverage is green.

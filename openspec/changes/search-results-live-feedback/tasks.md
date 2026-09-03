## 1. Tests (red)

- [ ] 1.1 `REQ-CAT-7`: the markup served for `/` exposes the results area as an ARIA live region (`role="status"` or an equivalent `aria-live` announcement), present before any search — page load
- [ ] 1.2 `REQ-CAT-7`: a search that matches one or more items writes a match-count announcement into that live region
- [ ] 1.3 `REQ-CAT-7`: a search that matches nothing writes the empty-state message (`REQ-CAT-6`) into that live region
- [ ] 1.4 `REQ-CAT-7`: clearing the query back to empty writes an announcement stating the full catalogue's count
- [ ] 1.5 `REQ-CAT-7`: a second search's outcome replaces the live region's content rather than appending to it
- [ ] 1.6 `REQ-CAT-8`: stub `fetch` in the page-script sandbox so an earlier query's response resolves after a later query's; assert the later query's results render and the earlier response never overwrites them
- [ ] 1.7 `REQ-CAT-8`: a single, settled search (no overlapping request) still renders and announces normally
- [ ] 1.8 Confirm every new test fails against today's page script before touching it

## 2. Implementation (green)

- [ ] 2.1 Mark the results area as an ARIA live region in the static markup, so it is in place before any search is performed (`REQ-CAT-7`)
- [ ] 2.2 On each search outcome, write a match-count or empty-state announcement into that region, replacing its previous content (`REQ-CAT-7`)
- [ ] 2.3 Track which query is the most recently issued and discard any response that arrives for an earlier one, so it is never rendered or announced (`REQ-CAT-8`)

## 3. Verification

- [ ] 3.1 `npm run verify` is green
- [ ] 3.2 `npm run req-coverage` shows `REQ-CAT-7` and `REQ-CAT-8` covered

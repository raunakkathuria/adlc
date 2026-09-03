## 1. Tests (red)

- [ ] 1.1 `REQ-CAT-7`: the markup served for `/` exposes a short, visually-hidden summary — a distinct element from the item cards area — as an ARIA live region (`role="status"` or an equivalent `aria-live` announcement); the item cards area itself carries no such role
- [ ] 1.2 `REQ-CAT-7`: the page's automatic search on load writes the exact wording `Showing {n} item(s).` into the summary, stating the full catalogue's count
- [ ] 1.3 `REQ-CAT-7`: a search that matches one or more items writes the exact wording `1 item matches "{q}".` or `{n} items match "{q}".` into the summary
- [ ] 1.4 `REQ-CAT-7`: a search that matches nothing writes the empty-state message (`REQ-CAT-6`) into the summary
- [ ] 1.5 `REQ-CAT-7`: clearing the query back to empty writes the same full-count wording as the automatic search on load
- [ ] 1.6 `REQ-CAT-7`: a second search's outcome replaces the summary's content rather than appending to it
- [ ] 1.7 `REQ-CAT-7`: several non-superseded searches issued in quick succession, with no pause between keystrokes, are each announced as they settle — not only the final one after a pause
- [ ] 1.8 `REQ-CAT-8`: stub `fetch` in the page-script sandbox so an earlier query's response resolves after a later query's; assert the later query's results render and the earlier response never overwrites them
- [ ] 1.9 `REQ-CAT-8`: a single, settled search (no overlapping request) still renders and announces normally
- [ ] 1.10 Confirm every new test fails against today's page script before touching it

## 2. Implementation (green)

- [ ] 2.1 Add a short, visually-hidden summary element, distinct from the item cards area, present in the static markup before any search runs (`REQ-CAT-7`)
- [ ] 2.2 On each search outcome — including the automatic search on page load — write the exact match-count, empty-state, or full-count wording into that summary, replacing its previous content; never mark the item cards area itself live (`REQ-CAT-7`)
- [ ] 2.3 Track which query is the most recently issued and discard any response that arrives for an earlier one, so it is never rendered or announced (`REQ-CAT-8`)

## 3. Verification

- [ ] 3.1 `npm run verify` is green
- [ ] 3.2 `npm run req-coverage` shows `REQ-CAT-7` and `REQ-CAT-8` covered

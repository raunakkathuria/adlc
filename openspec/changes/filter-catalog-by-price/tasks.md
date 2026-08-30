# Tasks — filter the catalogue by price

Only after a human approves this delta at Gate 1. One task per surface, in dependency order. The build ticks each box as it completes — the verifier reads them.

## 1. Tests

- [ ] 1.1 `test/catalog.test.js` — red first. A test per scenario in REQ-CAT-4, plus the three new REQ-CAT-3 scenarios and the new REQ-CAT-1 one. Through HTTP with `withServer`, and every test names its requirement in the title. They must fail before anything in `app/` moves, and fail for the right reason — an unfiltered list or a missing rejection, not a typo in the URL.
- [ ] 1.2 The zero-cap test asserts what Gate 1 approved: `200` with an empty array (the cap is a threshold, not a quantity). If the approved spec says otherwise, the test follows the spec — not the other way round.

One hazard: today's build's search matches the **name only**, and case-sensitively, which already contradicts REQ-CAT-3. A composition test written as `?q=notebook&max_price=1000` therefore fails for two independent reasons, and passing it would need a search fix this delta did not ask for. Either land that separate defect first, or assert composition with a query today's search also matches (`?q=Notebook`) and let the lowercase case arrive with the fix. Do not "fix" search inside this change.

## 2. Implementation

- [ ] 2.1 `app/server.mjs` — narrow, and refuse loudly. The item listing accepts a cap, refuses one that is not a whole number of minor units at or above zero, and otherwise narrows the list by it — together with the query when both are present, and before any narrowing when the cap is refused. `invalid_max_price` answers `400`. Fetch-by-SKU and orders are untouched; if either changes, the change is wrong.
- [ ] 2.2 `app/index.html` — a maximum-price input beside the search field, labelled in pounds, narrowing as you type the way search does. The page converts to minor units before it asks; the shopper never sees pence. The empty state says what was actually asked for: the cap, the search text, or both — today's `Nothing matches ""` is wrong when only a cap was set.

## 3. Verification

- [ ] 3.1 `npm run verify` green — every REQ-CAT-4 scenario named by a test, no test citing a requirement the spec does not carry.

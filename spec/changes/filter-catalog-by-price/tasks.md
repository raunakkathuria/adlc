# Tasks — filter the catalogue by price

Only after a human merges this delta. One task per surface, in dependency order.

## 1. `spec/catalog.md` — fold the delta in

Apply the proposed text for REQ-CAT-1 and REQ-CAT-3, add REQ-CAT-4, then delete `spec/changes/filter-catalog-by-price/`. The living spec is the record of what was agreed; the delta directory goes away.

`req-coverage` reads only the top level of `spec/` — `readdir`, not a recursive walk — so REQ-CAT-4 is invisible to the gate while it sits in `spec/changes/`, and gate-visible the moment it lands here. This task and task 2 land together, or `npm run verify` goes red on "specified but never tested".

## 2. `test/catalog.test.js` — red first

A test per scenario in REQ-CAT-4, plus the three new REQ-CAT-3 scenarios and the new REQ-CAT-1 one. Through HTTP with `withServer`, and every test names its requirement in the title.

They must fail before anything in `app/` moves, and fail for the right reason — an unfiltered list or a missing rejection, not a typo in the URL.

One hazard: today's build's search matches the **name only**, and case-sensitively, which already contradicts REQ-CAT-3. A composition test written as `?q=notebook&max_price=1000` therefore fails for two independent reasons, and passing it would need a search fix this delta did not ask for. Either land that separate defect first, or assert composition with a query today's search also matches (`?q=Notebook`) and let the lowercase case arrive with the fix. Do not "fix" search inside this change.

## 3. `app/server.mjs` — narrow, and refuse loudly

The item listing accepts a cap, refuses one that is not a whole number of minor units at or above zero, and otherwise narrows the list by it — together with the query when both are present, and before any narrowing when the cap is refused. `invalid_max_price` answers `400`.

Fetch-by-SKU and orders are untouched. If either changes, the change is wrong.

## 4. `app/index.html` — a price box beside the search box

A maximum-price input next to the search field, labelled in pounds, narrowing as you type the way search does. The page converts to minor units before it asks; the shopper never sees pence.

The empty state needs new copy. Today it reads `Nothing matches ""` whenever the list comes back empty, which is wrong when the shopper typed no text and only set a cap — say what was actually asked for: the cap, the search text, or both.

---

`npm run verify` green before this is done — that is the gate, not a task.

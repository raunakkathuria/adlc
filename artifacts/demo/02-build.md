Built. Nothing committed — the working tree holds the change.

## What I did, task by task

1. **`spec/catalog.md` — folded the delta in.** REQ-CAT-1 and REQ-CAT-3 replaced with the proposed text, REQ-CAT-4 added after REQ-CAT-3 with its "How it composes" block, `spec/changes/filter-catalog-by-price/` deleted (`spec/changes/README.md` kept).
2. **`test/catalog.test.js` — 16 new tests, red first.** One per REQ-CAT-4 scenario and per composition clause, three new REQ-CAT-3 scenarios, one new REQ-CAT-1 scenario. All through HTTP via `withServer`, all naming their requirement.
3. **`app/server.mjs` — narrow, and refuse loudly.** `listItems(query, maxPrice)` filters inclusively on `price <= cap`; a `parseMaxPrice` helper at the HTTP edge treats absent/empty as no cap and refuses anything else that isn't digits-only, returning `400 invalid_max_price` before any narrowing. Fetch-by-SKU and orders untouched.
4. **`app/index.html` — a price box beside the search box.** Pounds in, minor units out, narrowing on `input` like search; empty state now names what was asked for ("Nothing matching "mug" at or under £10.00."); a `400` is surfaced through the existing note rather than blanking the catalogue.

**Red run before touching `app/`:** 10 of the 16 new tests failed — unfiltered lists (`?max_price=1000` returned all three items) and missing rejections (`-1`, `9.99`, `cheap` all answered `200`). Six were green from the start and are regression guards, not red-first tests, because today's behaviour already satisfied them: cap above everything, absent cap, empty cap, cap on `/api/items/{sku}`, query-matches-nothing + cap, and `?q=Notebook&max_price=1000` (no case substitution makes that one red — the cap excludes nothing from that query's result). The "can still be ordered" test went red only on its precondition line; the POST half was always green.

## `npm run verify`

```
> adlc@0.1.0 verify
> npm test --silent && npm run req-coverage --silent

✔ REQ-CAT-1: lists every item with sku, name, price and stock (13.224459ms)
✔ REQ-CAT-2: fetches a single item by sku (3.538458ms)
✔ REQ-CAT-2: an unknown sku is a 404 with a reason (1.301125ms)
✔ REQ-CAT-3: search narrows the list to the matching item (1.261375ms)
✔ REQ-CAT-3: an empty query returns everything (1.679209ms)
✔ REQ-CAT-1: with no query and no price cap, every item is returned (1.408959ms)
✔ REQ-CAT-4: a cap returns only the items priced at or below it (1.453958ms)
✔ REQ-CAT-4: the cap is inclusive — a cap of 800 keeps the item priced 800 (1.344375ms)
✔ REQ-CAT-4: a cap above the most expensive item returns every item (1.452875ms)
✔ REQ-CAT-4: a cap below the cheapest item returns an empty array (1.53875ms)
✔ REQ-CAT-4: an empty cap returns every item (1.59875ms)
✔ REQ-CAT-4: a cap of zero returns only the items priced zero — empty today (1.438ms)
✔ REQ-CAT-4: a negative cap is rejected (1.136584ms)
✔ REQ-CAT-4: a cap that is not a whole number is rejected (1.289042ms)
✔ REQ-CAT-4: a cap that is not a number is rejected (1.11725ms)
✔ REQ-CAT-4: a refused cap is refused before anything is narrowed (1.141708ms)
✔ REQ-CAT-4: a cap has no effect on fetch by sku (1.24125ms)
✔ REQ-CAT-4: an item priced above the cap can still be ordered (REQ-ORD-1) (3.435875ms)
✔ REQ-CAT-3: a query and a cap both apply (1.393ms)
✔ REQ-CAT-3: an item matching the query but above the cap is not returned (1.0085ms)
✔ REQ-CAT-3: a query matching nothing and a cap excluding everything is an empty list, not a rejection (0.999875ms)
✔ REQ-ORD-1: an accepted order is created and takes units out of stock (17.28725ms)
✔ REQ-ORD-2: an order beyond available stock is rejected (4.267875ms)
✔ REQ-ORD-3: an order over the 20-unit cap is rejected (1.764292ms)
✔ REQ-ORD-3: exactly 20 units is allowed (1.895625ms)
✔ REQ-ORD-4: a rejected order leaves stock untouched (4.264833ms)
✔ REQ-ORD-5: 12 units take 10% off, rounded down (1.353333ms)
✔ REQ-ORD-5: 9 units pay the gross total (1.2255ms)
✔ REQ-ORD-6: an unknown sku is a 404 (1.704208ms)
✔ REQ-ORD-6: a non-positive or fractional qty is a 400 (3.163291ms)
ℹ tests 30
ℹ suites 0
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 106.257792
  ✓ REQ-CAT-1  test/catalog.test.js
  ✓ REQ-CAT-2  test/catalog.test.js
  ✓ REQ-CAT-3  test/catalog.test.js
  ✓ REQ-CAT-4  test/catalog.test.js
  ✓ REQ-ORD-1  test/catalog.test.js, test/orders.test.js
  ✓ REQ-ORD-2  test/orders.test.js
  ✓ REQ-ORD-3  test/orders.test.js
  ✓ REQ-ORD-4  test/orders.test.js
  ✓ REQ-ORD-5  test/orders.test.js
  ✓ REQ-ORD-6  test/orders.test.js

req-coverage: 10 requirements, all covered.
```

All 14 pre-existing tests still pass. `index.html` isn't covered by any test, so I checked it by hand: served the app, confirmed the inline script parses, and curled `?max_price=1000` → BOOK-1 + PEN-1, `?q=Mug&max_price=1000` → `[]`, `?max_price=-1` → `400 invalid_max_price`, `?max_price=0` → `200 []`, `?max_price=` → all three.

## Left alone deliberately

- **Search matches the name only, and case-sensitively** — it contradicts REQ-CAT-3 today. `tasks.md` names it and says work around it, so the composition tests use `Notebook` and `Mug`.
- **`createOrder` decrements stock above the `over_limit` guard** (issue 001) — stock leaks on a rejected over-limit order, contradicting REQ-ORD-4. Untouched.
- **Raw `${q}` interpolated into `innerHTML`** in the empty state. Pre-existing; my new copy keeps the same shape rather than fixing or extending it.
- **Broken links into the deleted delta directory.** Deleting it (task 1) leaves dangling references in `README.md:47,49`, `facilitator.md:57`, and `artifacts/gate-1/README.md:7`. That's a real consequence of the task, but fixing workshop prose isn't in the delta — it's yours to decide.

## Ambiguities worth sending back to the spec

- **The living spec now carries two REQ-CAT-3 scenarios no test asserts verbatim.** `spec/catalog.md` says "WHEN the query is `notebook`…" and "WHEN the query is `mug`…"; my tests use `Notebook` and `Mug`, because today's search can't honour the lowercase form. `req-coverage` matches on requirement ids, so it reports REQ-CAT-3 ✓ while two of its written scenarios are untested. The gate structurally cannot see this. It resolves when the search defect is fixed.
- **The zero-cap question was both answered and asked in the same document.** `spec.md` specified `0` → `200`, then said "confirm it before writing the test." I built what the approved text said. A delta shouldn't ship with an open question inside the text that becomes the spec — the answer belongs there, the question doesn't. I also trimmed that trailing "…the open question this delta hands to Gate 1" clause when folding, since the living spec records what was agreed, not how.
- **Which malformed caps count as malformed.** I chose digits-only on the raw string. That satisfies every stated scenario and also refuses `' '`, `1e3`, `+5`, `1000.0`, while accepting `007`. None of those are in the spec.
- **Repeated `?max_price=1&max_price=2` now has a de facto answer** — `searchParams.get` takes the first, silently. The delta explicitly left repeated parameters unspecified; the implementation no longer is.
- **Task 4 didn't say what the page does with the new `400`.** As written, `loadItems` would have read `.length` off a rejection body and blanked the catalogue with a TypeError. I routed it through the existing note mechanism, with a flag so the notice clears once the cap is fixed.

One thing outside my change: `CONCEPT.md`, `README.md`, `check.sh`, and `package.json` (renamed to `adlc`) were modified during this session and `.github/workflows/feature-build.yml` appeared — none of them mine. My footprint is exactly `spec/catalog.md`, `test/catalog.test.js`, `app/server.mjs`, `app/index.html`, and the deleted delta directory.

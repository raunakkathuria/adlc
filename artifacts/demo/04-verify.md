Every observation below is from a freshly seeded server on a free port. I created no files.

---

# Verification report — `spec/catalog.md`

Gate status: `npm run verify` → **30/30 pass, `req-coverage: 10 requirements, all covered`**. The gate is green and REQ-CAT-3 is not implemented. That combination is the main thing this report has to say.

REQ-CAT-1, REQ-CAT-2 and REQ-CAT-4 hold on every scenario I walked, including all nine REQ-CAT-4 scenarios and all four composition rules. The cap is correct work.

## Missing — the spec requires it, the product does not do it

### 1. REQ-CAT-3 — search is case-sensitive

- **Requirement** — REQ-CAT-3, scenario: "WHEN the query is `mug` THEN the item named `Enamel Mug` is returned — a name match in a different case."
- **Spec requires** — "The comparison is **case-insensitive** on both fields." (`spec/catalog.md:27`)
- **Code does** — `found.filter((item) => item.name.includes(query))` — a raw substring match, no case folding on either side (`app/server.mjs:40`).
- **Evidence** —
  ```
  $ curl -s 'localhost:3241/api/items?q=mug'   -> []   [200]
  $ curl -s 'localhost:3241/api/items?q=Mug'   -> [{"sku":"MUG-1",...}]  [200]
  ```
- **Severity** — **Breaks a user's task.** The spec's own justification is the shopper typing what is on the packaging. A lowercase search for a product that exists returns nothing, and returns it as a successful `200 []`, so nothing signals the failure.

### 2. REQ-CAT-3 — SKU is never searched at all

- **Requirement** — REQ-CAT-3, scenario: "WHEN the query is `book-1` THEN the item with SKU `BOOK-1` is returned — a SKU match in a different case."
- **Spec requires** — "returns only the items whose **SKU or name** contains the query" (`spec/catalog.md:27`)
- **Code does** — filters on `item.name` only. `item.sku` is never consulted, so this is not a casing problem layered on a working SKU match — the field is absent from the predicate (`app/server.mjs:40`).
- **Evidence** — exact-case SKU fails too, which isolates it from finding 1:
  ```
  $ curl -s 'localhost:3241/api/items?q=book-1'  -> []  [200]
  $ curl -s 'localhost:3241/api/items?q=BOOK-1'  -> []  [200]
  $ curl -s 'localhost:3241/api/items?q=PEN-1'   -> []  [200]
  ```
- **Severity** — **Breaks a user's task.** "The SKU off the box" is the second of the two access paths REQ-CAT-3 exists to provide. Neither case works.

### 3. REQ-CAT-3 — the documented composition scenario fails

- **Requirement** — REQ-CAT-3, scenario: "WHEN the query is `notebook` and the cap is `1000` THEN the `Pocket Notebook`, priced `800`, is returned."
- **Spec requires** — query AND cap, both applied (`spec/catalog.md:35`)
- **Code does** — returns `[]`. The cap half is right; the query half drops the item before the cap is reached.
- **Evidence** —
  ```
  $ curl -s 'localhost:3241/api/items?q=notebook&max_price=1000'  -> []  [200]
  $ curl -s 'localhost:3241/api/items?q=Notebook&max_price=1000'  -> [{"sku":"BOOK-1",...}]  [200]
  ```
- **Severity** — **Breaks a user's task.** Listed separately from finding 1 because it is the scenario the spec writes out verbatim, and because it is the one the test suite claims to cover — see the coverage gap.

This drift is original, not a regression from the price filter. `git log -S 'name.includes(query)'` returns only `3a54e5d`, the first commit, and the "SKU or name, case-insensitively" wording entered `spec/catalog.md` in that same commit. The code has never implemented REQ-CAT-3.

## Extra — the product does it, no requirement asks for it

Not bugs, and I am not blessing them. Each is a decision the code had to make because the spec stayed silent, so nobody chose it. Each belongs back in the spec as a change, for a human at Gate 1.

**1. Duplicate query parameters resolve silently to the first.** `max_price=800&max_price=100` narrows to 800 and discards 100 — no rejection, no `reason`. Same for `q=Mug&q=Pen`. The spec defines no precedence rule, and AGENTS.md says "Reject loudly."
```
$ curl -s 'localhost:3240/api/items?max_price=800&max_price=100' -> [BOOK-1, PEN-1] [200]
$ curl -s 'localhost:3240/api/items?q=Mug&q=Pen'                 -> [MUG-1]         [200]
```

**2. The cap's accepted grammar is `/^\d+$/`, which the spec never states.** REQ-CAT-4 names exactly two rejections: not a whole number (`9.99`), and not a number at all (`cheap`). `1e3` is a number *and* a whole one, and is refused anyway; `+800` is refused; `0800` is silently normalised to 800; whitespace padding is refused. Digits-only is `app/server.mjs:93` deciding, not the spec.
```
$ ... 'max_price=1e3'    -> {"reason":"invalid_max_price"} [400]
$ ... 'max_price=%2B800' -> {"reason":"invalid_max_price"} [400]
$ ... 'max_price=0800'   -> [BOOK-1, PEN-1]               [200]
$ ... 'max_price=%20800' -> {"reason":"invalid_max_price"} [400]
```

**3. A cap beyond exact integer representation is accepted.** The spec says the cap is a whole number; `1e20` is past `Number.MAX_SAFE_INTEGER`, so it is no longer exactly one.
```
$ ... 'max_price=99999999999999999999' -> all three items [200]
```

**4. A whitespace-only query is treated as a substring, and today's seed hides it.** `q=%20` returns all three items — which looks like the "absent or empty → every item" rule of `spec/catalog.md:34`, but is not. `' '` is truthy, so it filters, and every seeded name happens to contain a space. Add one single-word product and the same request starts dropping items.
```
$ curl -s 'localhost:3240/api/items?q=%20' -> all three items [200]
```

**5. One line, lower value:** the `catch` in `createApp` answers `{"reason":"bad_request","detail":"<parser message>"}`, a rejection reason no requirement names, and it forwards an internal message to the client.

I looked for Extras in the rest of the catalog surface and did not count them: `GET /`, `GET /api/orders`, the `not_found` catch-all, `POST /api/items` answering 404 rather than 405, and `GET /api/items/` answering `unknown_sku`. These are pre-existing app surface, unrelated to catalog behaviour, and calling them drift from `spec/catalog.md` would be the scope inflation this role exists to catch.

## Coverage gap

**REQ-CAT-3 is reported covered by the gate and neither of its specified behaviours is tested.** The three REQ-CAT-3 tests were written from the implementation: each one queries in the exact case of the seeded name, which is precisely and only what the code supports.

| Test | Queries | Spec scenario it stands in for | Gap |
|---|---|---|---|
| `test/catalog.test.js:28` "search narrows the list to the matching item" | `q=Mug` | `q=mug` (`:31`) | Asserts exact-case name matching. Passes today, would pass on any build that never implements case-insensitivity. |
| `test/catalog.test.js:140` "a query and a cap both apply" | `q=Notebook` | `q=notebook` (`:35`) | Same casing substitution, on the scenario the spec spells out literally. |
| — | — | `q=book-1` → SKU `BOOK-1` (`:32`) | **No test anywhere queries by SKU.** An entire field the requirement names has zero coverage. |

The sharpest one is `test/catalog.test.js:147`, "an item matching the query but above the cap is not returned" (`q=Mug&max_price=1000` → `[]`). It passes today for the right reason. But corrected to the spec's own casing it would *still* pass, for the wrong one:

```
$ curl -s 'localhost:3241/api/items?q=Mug&max_price=1000'  -> []  [200]   <- excluded by the cap
$ curl -s 'localhost:3241/api/items?q=mug&max_price=1000'  -> []  [200]   <- never matched at all
```

An empty-array assertion cannot distinguish "the cap excluded it" from "the query found nothing." Fixing the casing is not enough here; that scenario needs a positive assertion alongside it to have any force.

Smaller: REQ-CAT-1's "whatever its price or stock" (`:16`) is not really exercised — the seed contains no zero-stock item, so the clause has nothing to bite on. And `test/catalog.test.js:10` checks the key set of `body[0]` only, not of every item.

## Verdict

**`FAIL → back to the Planner`**

Routing as the prompt specifies. One qualification, because the two halves of this report need different work: the Extras genuinely do need Gate 1 — the cap's accepted grammar and duplicate-parameter precedence are undefined in the spec, and code cannot abstain on them. REQ-CAT-3 needs no spec work at all. That spec is clear and unchanged since `3a54e5d`; the code simply never implemented it, and the tests were written to agree with the code. It needs the filter fixed and tests written to the spec's own casing and to SKU.

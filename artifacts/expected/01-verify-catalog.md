Verification complete. Report follows — stdout only, no files created.

---

# Verification — `spec/catalog.md`

Re-derived from the spec before opening `app/`. Evidence from a clean server on port 3987, correctly seeded (`47/120/8`). Working tree `spec/`, `app/`, `test/` unmodified.

## Missing — the spec requires it, the product does not do it

### 1. Search is case-sensitive

- **Requirement** — REQ-CAT-3, scenario 1
- **Spec requires** — "The comparison is **case-insensitive** on both fields." / "WHEN the query is `mug` THEN the item named `Enamel Mug` is returned — a name match in a different case."
- **Code does** — `item.name.includes(query)` — a raw, case-sensitive substring test (`app/server.mjs:41`)
- **Evidence** — `curl -s 'http://127.0.0.1:3987/api/items?q=mug'` → `[] [200]`. The same query capitalised, `?q=Mug`, returns `MUG-1`.
- **Severity** — Breaks the user's task. `app/index.html:94` sends `q` to the server with no client-side fallback, so a shopper who types what's on the packaging gets an empty catalogue.

### 2. SKU is never searched at all

- **Requirement** — REQ-CAT-3, scenario 2
- **Spec requires** — "returns only the items whose **SKU or name** contains the query" / "WHEN the query is `book-1` THEN the item with SKU `BOOK-1` is returned."
- **Code does** — the filter reads `item.name` only. `item.sku` is not consulted (`app/server.mjs:41`).
- **Evidence** — `?q=book-1` → `[] [200]`, **and** `?q=BOOK-1` → `[]`. The exact-case probe is the discriminator: this is not the case bug wearing a second hat. Lowercasing both sides of the existing comparison satisfies scenario 1 and leaves this one failing.
- **Severity** — Breaks the user's task. The SKU off the box finds nothing, in any case.

## Extra — the product does it, no requirement asks for it

Not bugs, and I am not blessing them. Each is a decision the code had to make because the spec is silent. They belong back in the spec as a change, for a human at Gate 1.

1. **A whole web UI.** `GET /` and `/index.html` serve HTML (`server.mjs:126-130`). No requirement in `spec/catalog.md` or `spec/orders.md` mentions a browser surface at all. This is the largest unspecified thing in the product.
2. **`bad_request` catch-all leaks internals.** Any thrown error → `400` with `{"reason":"bad_request","detail":err.message}` (`server.mjs:133-134`). Observed: `{"detail":"Expected property name or '}' in JSON at position 1..."}`. Two unchosen decisions — the internal message reaches the client, and a genuine server-side failure is reported as a client error.
3. **`not_found` is a reason code in no spec.** Unknown paths → `404 {"reason":"not_found"}` (`server.mjs:132`). Every reason the spec names is enumerated in REQ-CAT-2 and REQ-ORD-6; this is not among them.
4. **Writes to the catalog are refused as 404.** `POST /api/items` → `{"reason":"not_found"} [404]`. The spec says the catalog "is read-only" over the API but never says how a write is refused — `404` vs `405` was picked by routing order, not chosen.
5. **An unknown filter is silently ignored.** `?max_price=1000` → `200` with all three items. Worth flagging *now*: the price-filter delta is sitting at Gate 1, and its own composition note argues a shopper must never "receive a plausible-looking list assembled from a filter the system did not understand." Today's behaviour is exactly that.
6. **SKU lookup is case-sensitive.** `/api/items/mug-1` → `404 unknown_sku`. REQ-CAT-2 never says which, so the code chose — and it chose the opposite of REQ-CAT-3's stated intent, so once search is fixed the same string will find an item on one route and 404 on the other.
7. Minor, one line each: `/api/items/` with an empty SKU answers `404 unknown_sku` (an empty string is not "a SKU not in the catalog"); `/api/items/MUG-1/extra` is treated as a SKU rather than an unknown route; `%2D`-encoded SKUs are decoded and matched; a repeated `?q=a&q=zzz` silently takes the first.

## Coverage gap

**The deterministic gate is fully green — 14/14 tests pass, `req-coverage` reports 9 requirements, all covered — while REQ-CAT-3 is broken in two ways.** That is the finding. Coverage counts whether somebody wrote a test; it cannot read what the test asserts.

REQ-CAT-3 has two tests, and neither exercises either half of what the requirement says:

- **`test/catalog.test.js:28` — "search narrows the list to the matching item"** queries `?q=Mug`. Capital M: the one case the case-sensitive implementation happens to handle. The spec's scenario says `mug`. This is a test written from the implementation — it agrees with the code, passes forever, and tells you nothing. AGENTS.md names this failure mode directly under *Red before green*.
- **`test/catalog.test.js:36` — "an empty query returns everything"** covers `?q=`, but not `q` **absent**, which the scenario states as well. It also asserts `body.length` without asserting the `200`.
- **No test asserts a SKU match at all** — REQ-CAT-3's scenario 2 is entirely unexercised.
- **No test asserts "query matches nothing → `200` with an empty array."** Note this one would pass today by accident: the search is broken *toward* emptiness, so a no-match test would go green for the wrong reason.

## Verdict

**`FAIL → back to the Planner`**

Splitting the routing, since a bare FAIL invites the wrong conclusion:

- **The Extra list needs Gate 1.** The UI, the `bad_request` and `not_found` reasons, the refusal shape for writes, and the silently-ignored unknown filter are behaviour nobody specified. A human decides what the spec should say; that is not the Executor's call.
- **REQ-CAT-3 needs no delta.** The spec is correct, complete, and unambiguous here — both failing scenarios are written out in it already. Only the code is wrong, and per AGENTS.md the code is what changes.

Two notes, deliberately outside this verdict: a rejected 21-unit order still decrements stock (`120 → 99`, `422 over_limit`, no order recorded) — that is `spec/orders.md` REQ-ORD-4, not the spec under verification, and it is already tracked as issue 001. And several workshop docs were edited by another session while I worked; `spec/`, `app/`, and `test/` were untouched, so nothing here rests on a moving file.

I changed no files, and started and stopped only my own server on port 3987. A stale server on port 3131 from an earlier session is still running and served the first batch of probes I ran — I discarded those results, since it reported `stock: 22` against an unknown build. Left it alone; it isn't mine to kill.

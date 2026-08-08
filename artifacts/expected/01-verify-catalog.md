Server stopped, temp logs removed, repo untouched — `git status` is byte-identical to session start (`M prompts/verify.md`, `?? artifacts/` both pre-existed).

---

# Verification report — `spec/catalog.md`

All observations come from a clean server on port 3937, confirmed at seeded state (`MUG-1` stock 47) before each scenario.

## Findings

### Finding 1 — search is case-sensitive

- **Requirement** — REQ-CAT-3, scenario: *"WHEN the query is `mug` THEN the item named `Enamel Mug` is returned — a name match in a different case."*
- **Spec requires** — "The comparison is **case-insensitive** on both fields."
- **Code does** — Returns an empty array. The query is compared with `String.prototype.includes` against the raw `name`, so `mug` never matches `Enamel Mug`. Only the exact-case substring `Mug` matches.
- **Evidence**
  ```
  $ curl -s 'http://127.0.0.1:3937/api/items?q=mug'
  []                                                        [HTTP 200]

  $ curl -s 'http://127.0.0.1:3937/api/items?q=Mug'
  [{"sku":"MUG-1","name":"Enamel Mug","price":1250,"stock":47}]   [HTTP 200]
  ```
  `app/server.mjs:41`
- **Severity** — **Breaks a user's task.** The spec's own rationale names this exact case: a shopper typing what's on the packaging gets nothing back and concludes the product doesn't exist.

### Finding 2 — search never looks at the SKU field

- **Requirement** — REQ-CAT-3, scenario: *"WHEN the query is `book-1` THEN the item with SKU `BOOK-1` is returned — a SKU match in a different case."*
- **Spec requires** — "returns only the items whose **SKU or name** contains the query."
- **Code does** — Returns an empty array. `listItems` filters on `item.name` only; `item.sku` is never consulted. This is a separate defect from Finding 1, not a consequence of it — the uppercase SKU `BOOK-1`, which needs no case folding at all, also returns nothing.
- **Evidence**
  ```
  $ curl -s 'http://127.0.0.1:3937/api/items?q=book-1'
  []                                                        [HTTP 200]

  $ curl -s 'http://127.0.0.1:3937/api/items?q=BOOK-1'      # exact case, still nothing
  []                                                        [HTTP 200]
  ```
  `app/server.mjs:41`
- **Severity** — **Breaks a user's task.** A shopper reading the SKU off the box cannot find the item by it. Fixing only case-insensitivity would leave this bug in place.

### Scenarios that hold

Walked individually, not skimmed:

| Requirement | Scenario | Result |
|---|---|---|
| REQ-CAT-1 | three items → `200`, three objects | ✅ all four fields present on each |
| REQ-CAT-2 | SKU exists → `200` with that item | ✅ `MUG-1` returns the item |
| REQ-CAT-2 | SKU unknown → `404` `{"reason":"unknown_sku"}` | ✅ exact match |
| REQ-CAT-3 | query matches nothing → `200` + empty array | ✅ `q=zzz` → `[]`, `200` |
| REQ-CAT-3 | query absent or empty → every item | ✅ both `?q=` and no `q` return all three |

One note on scope: `GET /api/items/mug-1` returns `404`. I am **not** filing that as a finding. REQ-CAT-3 explicitly requires case-insensitivity for *search*; REQ-CAT-2 says only "the item with that SKU" and is silent on case. That is unspecified behaviour, not drift.

## Coverage gap

**REQ-CAT-3 has two tests. Both pass. Neither asserts what the requirement says.**

- **`test/catalog.test.js:28` — `REQ-CAT-3: search narrows the list to the matching item`**
  Queries `?q=Mug` — capital M, name field. That is precisely and only what the current implementation can do. The requirement's two named scenarios are `mug` (lowercase name) and `book-1` (SKU); **neither string appears anywhere in the test suite.** This test was written from the implementation's capability rather than from the spec, so it will pass forever against broken search and tell you nothing. It is the exact failure mode `AGENTS.md:32` warns about — "how the tests end up agreeing with the code instead of with the product."

- **`test/catalog.test.js:36` — `REQ-CAT-3: an empty query returns everything`**
  Correct, but covers only one of the requirement's four scenarios.

- **No test exists for "query matches nothing → `200` with an empty array."** Worth flagging for whoever writes the reproduction: a test asserting `body.length === 0` for a nonsense query passes *today*, against the broken code. Added alone it would raise the apparent coverage without testing anything. The `mug` and `book-1` cases are the ones that must go red first.

**The gate cannot see any of this.** `npm run verify` is fully green — 14/14 tests pass, and `req-coverage` reports "9 requirements, all covered" — while two spec scenarios demonstrably fail over HTTP. That is the gate working as designed and documented (`AGENTS.md:25`): it checks that somebody wrote a test naming each requirement, not that the test asserts the right thing.

## A note on the procedure itself

Not a product finding, but it cost me a wrong reading and will cost the next verifier one. Following this prompt's own suggested command, `PORT=3131 node app/server.mjs &`, I got answers showing `MUG-1` stock at 22 instead of the seeded 47. My server had never started — `EADDRINUSE` went to a log I hadn't read, the shell reported a healthy PID, and I was in fact querying a 13-minute-old process from an earlier session whose stock had been mutated by test orders. Every response looked plausible. Suggest the prompt either pin a port check or have the reader confirm seeded state (`stock: 47`) before trusting a single response.

## Verdict

**FAIL** — `listItems` at `app/server.mjs:41` filters on `item.name.includes(query)`, one field and case-sensitive, where REQ-CAT-3 requires two fields and case-insensitive; that single line is the cause of both findings.

**Files changed: none.** Report is stdout only.

## Not testable — no test added

**Issue 002 cannot be reproduced through the API this app exposes.** I did not add a test to `test/orders.test.js`.

### What the numbers actually are

`BOOK-1` (Pocket Notebook) is priced at `800` cents (`app/server.mjs:20`).

| | value | where it comes from |
|---|---|---|
| Charged | £86.40 = `8640` | `9600 − floor(9600 × 10 / 100)` — the discounted total |
| Email | £96.00 = `9600` | `800 × 12` — the **gross**, pre-discount total |

So the email is showing `price × qty` with the bulk discount never applied. The charged figure is the correct one: REQ-ORD-5 says 12 units of a 10+ order take 10% off, rounded down, and `8640` is exactly that.

### What I tried

Probed a live server (`app/server.mjs` via `createApp()`), through HTTP:

```
POST /api/orders {"sku":"BOOK-1","qty":12}  -> 201 {"id":1,"sku":"BOOK-1","qty":12,"total":8640}
GET  /api/orders                            -> 200 [{"id":1,"sku":"BOOK-1","qty":12,"total":8640}]
GET  /api/orders/1                          -> 404 {"reason":"not_found"}
GET  /api/orders/1/confirmation             -> 404 {"reason":"not_found"}
GET  /api/orders/1/email                    -> 404 {"reason":"not_found"}
GET  /api/emails                            -> 404 {"reason":"not_found"}
GET  /api/confirmations                     -> 404 {"reason":"not_found"}
GET  /api/receipts                          -> 404 {"reason":"not_found"}
GET  /api/notifications                     -> 404 {"reason":"not_found"}
```

Also:

- Every route in `createApp()` (`app/server.mjs:98–137`) is accounted for: `GET /api/items`, `GET /api/items/{sku}`, `GET /api/orders`, `POST /api/orders`, `GET /` — nothing else. There is no confirmation, receipt, or email surface to assert against.
- Grepped the whole repo for `email|mailer|smtp|notif|confirmation|receipt`. The only hits are inside `issues/002-confirmation-email-wrong-total.md` itself. No mailer, no template, no queue.
- The app's **own** confirmation surface is correct: `app/index.html:133` renders `money(body.total)` from the POST response, i.e. "Order #1 placed — 12 × BOOK-1 for **£86.40**." The £96.00 is produced somewhere downstream of this codebase.
- Neither `spec/orders.md` nor `spec/catalog.md` contains any requirement about confirmation emails, so there is **no `REQ-*` id this test could honestly carry** — and that string is what the coverage gate reads.

### The command I ran and its actual output

```
$ npm test

> ai-sdlc-workshop@0.1.0 test
> node --test 'test/*.test.js'

✔ REQ-CAT-1: lists every item with sku, name, price and stock (13.62875ms)
✔ REQ-CAT-2: fetches a single item by sku (4.130667ms)
✔ REQ-CAT-2: an unknown sku is a 404 with a reason (1.560375ms)
✔ REQ-CAT-3: search narrows the list to the matching item (1.470375ms)
✔ REQ-CAT-3: an empty query returns everything (1.423042ms)
✔ REQ-ORD-1: an accepted order is created and takes units out of stock (18.979584ms)
✔ REQ-ORD-2: an order beyond available stock is rejected (4.0985ms)
✔ REQ-ORD-3: an order over the 20-unit cap is rejected (1.461375ms)
✔ REQ-ORD-3: exactly 20 units is allowed (1.834375ms)
✔ REQ-ORD-4: a rejected order leaves stock untouched (3.684042ms)
✔ REQ-ORD-5: 12 units take 10% off, rounded down (1.18125ms)
✔ REQ-ORD-5: 9 units pay the gross total (1.044917ms)
✔ REQ-ORD-6: an unknown sku is a 404 (1.544084ms)
✔ REQ-ORD-6: a non-positive or fractional qty is a 400 (2.443125ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 107.185042
```

Green — unchanged, because I added nothing. That green is the finding: every reachable surface already reports the correct total.

### Why I stopped rather than writing something

Two tests were available and both would have been dishonest:

- Asserting `GET /api/orders` total equals the POST total — **passes today**, so it reads as *bug not reproduced* while the actual bug sits untouched.
- Asserting against an invented `/api/orders/{id}/confirmation` — **fails today for the wrong reason** (the route doesn't exist). That is a fabricated reproduction, not a reproduction.

### For the human

- **Mechanism hypothesis:** the email template computes `price × qty` itself instead of reading the stored `order.total`. The £96.00/£86.40 gap is exactly one un-applied bulk discount, and it will appear on every order of 10+ units — not just this customer's.
- **Where it lives:** outside this repo. This codebase computes and stores `8640` and serves it correctly on every surface it owns.
- **Gate 1 question you own:** the spec says nothing about confirmation emails. If that surface is in scope for this product, it needs a spec delta in `spec/changes/` first — there is no requirement to test against, and therefore no `REQ-*` id for a regression guard. Once that requirement exists and the email total is reachable over the API, this becomes a one-line reproduction.

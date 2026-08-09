# Advisory review — delta-b, cancel an order

Read: `proposal.md`, `spec.md`, `tasks.md`, `spec/orders.md`, `spec/catalog.md`, `spec/changes/README.md`.

Advisory only. A human decides at Gate 1.

## Product

### 1. MISSING — nothing says what happens to stock, and either answer needs a spec edit this delta does not contain

REQ-ORD-1 already says: "the item's stock has dropped by `qty`". The delta adds a cancel action and never returns to that sentence. `Out of scope` names only "Refunds."

This is not a gap that can be left to the build, because both possible answers change spec text that is not in the delta:

- **If cancelling puts stock back**, then `spec/catalog.md` is wrong as written — "Over the API it is read-only; only an order changes stock (see [orders.md](../../../spec/orders.md))". A cancel would be a second thing that changes stock. That needs a `MODIFIED` entry, and the delta's "Target: `spec/orders.md`" is then incomplete.
- **If cancelling does not put stock back**, then REQ-ORD-2 — "stock is a hard limit" — becomes permanently lossy: every cancellation burns units that were never sold. That is a new product rule, and nobody has stated it.

The spec already has a stance in the neighbourhood, in REQ-ORD-4: "A rejection is a decision not to trade. Nothing may be consumed by a trade that did not happen." A cancellation is arguably the same claim one step later. The delta does not engage with it either way.

Why it matters: a customer orders the last 8 units, cancels a minute later, and the item is now unbuyable with nothing sold. Whichever way this goes, it should be a decision made at Gate 1, not discovered in `server.mjs`.

### 2. MISSING — every scenario in the delta is the happy path

The three scenarios under REQ-ORD-7 are "the response is `200`", "returns order 1 with `cancelled: true`", and "it still appears in their order history". There is no scenario where the answer is no. `AGENTS.md` requires the opposite: "Reject loudly. Every rejection returns a status and a `reason`." REQ-ORD-6 is the shape to copy — it pairs `404 unknown_sku` with `400 invalid_qty`.

At least three refusal paths are unwritten, each needing a status and a `reason`:

- Cancelling an order id that does not exist (`POST /api/orders/999/cancel`).
- Cancelling an order that is already cancelled. This is the transition question in disguise: the delta introduces a second order state without saying whether the move into it is one-way, or whether repeating it is a success (idempotent `200`) or a conflict (`409`, `already_cancelled`).
- A malformed id — non-numeric, empty.

Why it matters: the delta reads as finished and the build will invent all three answers on its own.

### 3. WRONG — the delta describes an ownership model this system does not have

`proposal.md`: "After placing an order, a customer can cancel it." `spec.md`: "WHEN a customer has cancelled an order THEN it still appears in **their** order history."

Nothing in `spec/orders.md` knows what a customer is. An order is `{ id, sku, qty, total }` and `GET /api/orders` returns all of them. As written, the actual behaviour being specified is: any caller can cancel any order by guessing its id. That may well be the right call for this system — but then say it in the requirement ("an order is cancelled by id; this system has no notion of an order's owner"), so the next delta that adds customers knows it is changing something.

Smaller, same paragraph: "Their order history then shows the order as cancelled rather than hiding it" implies today's behaviour hides something. Nothing in the spec hides an order.

### 4. MISSING — the proposal promises a timestamp that no requirement delivers

`proposal.md`: "gives us a record of what was cancelled **and when**."

No requirement in `spec.md` captures a cancellation time or exposes it anywhere. The `cancelled: true` field carries the what and not the when. Either add the requirement or drop the claim — right now the proposal is selling something the spec does not build, and support will ask for it on day one.

### 5. MISSING — no window, and no open questions handed to the human

The "why now" rests on a window: "emails us within a few minutes". The spec then places no bound on when cancelling is allowed. If the honest answer is "any order, forever, because this system has no fulfilment state", that is fine — but it is a decision, and `prompts/delta.md` rule 6 asks for it to be surfaced rather than picked silently. There is no open-questions section in the delta at all.

Related, and cheap to fix: `Out of scope` names refunds only. It does not name stock restoration (finding 1), partial cancellation (cancel 1 of 3 units), or un-cancelling. Those are the three things most likely to be argued into the build once it starts.

## Architect

### 1. WRONG — the first sentence of the first new requirement is a design decision

REQ-ORD-7: "The service holds cancelled order ids in a `Set` keyed by order id, and `GET /api/orders` reads that `Set` to add a `cancelled: true` field to each affected order."

`Set`, "keyed by order id", and "reads that `Set`" are a data structure and an internal read path. None of it is observable to a user, and it can be satisfied exactly one way — a status field on the order itself, or a cancellations log, would deliver identical behaviour and violate this requirement. This is `prompts/delta.md` rule 1, in the delta's opening line.

The observable half of that sentence is fine and should survive: after a successful cancel, `GET /api/orders` returns the order with `cancelled: true`. The storage is the build's business.

(`tasks.md` naming `app/server.mjs` and `listOrders` is correct — that is what tasks are for. The objection is only to `spec.md`.)

### 2. WRONG — REQ-ORD-8 cannot be tested, and the coverage gate will hide that

"Cancelling an order should feel instant to the customer. The order history must reflect the cancellation straight away, with no delay a customer would notice." Scenario: "WHEN a customer cancels an order THEN the change is visible immediately."

"Feel instant", "straight away", "no delay a customer would notice", "immediately" — no test asserts any of these without a human first deciding what they mean. `prompts/delta.md` rule 3 names this exact failure.

Worse, the requirement is not merely vague, it is already covered: REQ-ORD-7's second scenario ("WHEN a customer cancels order 1 THEN `GET /api/orders` returns order 1 with `cancelled: true`") is the read-after-write guarantee REQ-ORD-8 is reaching for. The recommendation is to delete REQ-ORD-8. If something real is hiding in it, it is a latency budget with a number in it, and that is a different requirement than the one written.

Why it matters more here than in most repos: `npm run req-coverage` checks only that a test names each requirement. A test called `REQ-ORD-8: cancellation is immediate` that asserts nothing meaningful turns the gate green. An untestable requirement plus a mandatory test slot produces a fake test.

### 3. WRONG — scenario 3 names a surface the spec does not have

"WHEN a customer has cancelled an order THEN it still appears in their **order history**."

Scenario 2 names `GET /api/orders`. Scenario 3 switches to "order history", which appears nowhere in `spec/orders.md` or `spec/catalog.md`. A test author has to decide whether that means the endpoint or the page rendered by `app/index.html` — and `tasks.md` task 3 touches the page, so both readings are live. Say `GET /api/orders`, the same as scenario 2.

### 4. MISSING — the contract is not precise enough for two people to build the same thing

Two gaps:

- **The success body.** REQ-ORD-7 says only "the response is `200`". REQ-ORD-1 sets the house standard by stating the shape: "`201` with `{ id, sku, qty, total }`". Does cancel return the updated order, an empty body, `{ok:true}`? Unstated, so the client and the server will disagree.
- **The field on orders that are not cancelled.** "add a `cancelled: true` field to each affected order" implies the field is absent everywhere else. `order.cancelled === false` and `order.cancelled === undefined` are different contracts for anyone asserting on the response, and every existing order object in `GET /api/orders` is affected. Pick one and write it down.

Blast radius otherwise looks contained: adding a field to `GET /api/orders` does not disturb REQ-ORD-3, REQ-ORD-5, or REQ-ORD-6, and REQ-ORD-4 concerns rejected orders, which never exist to be cancelled. The one sideways break is stock, in Product finding 1.

### Taste

None. Every finding above is either wrong or missing; there is nothing here I would merely have done differently.

---

**NEEDS WORK** — no requirement says what happens to stock when an order is cancelled, and both possible answers contradict spec text (`catalog.md`'s "only an order changes stock", or REQ-ORD-2's hard limit) that this delta does not touch.

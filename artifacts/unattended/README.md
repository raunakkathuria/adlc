# Unattended — three issues in, three different endings

The point of this directory is not that something ran at night. It is that nobody steered it.

Each run below was produced by piping **one prompt file into one CLI**, with nothing else: no hint about where the bug was, no follow-up turns, no corrections, no second attempt. What is committed is the first response.

```bash
{ cat prompts/triage.md; printf '\nThe issue to classify is `issues/001-....md`.\n'; } \
  | claude -p --allowedTools "Read Grep Glob"
```

That one extra line names which file to read. It carries no judgement about the answer.

## What happened

| Issue | Classified as | Where it stopped |
|---|---|---|
| [001](../../issues/001-rejected-order-eats-stock.md) — stock disappears on a rejected order | `bug` | Reproduced by a failing test, fixed, reviewed. Pull request open on green gates, waiting at Gate 2. |
| [002](../../issues/002-confirmation-email-wrong-total.md) — confirmation email shows the wrong total | `feat` | Nothing built. Two stations independently concluded there was nothing here to fix, and it went to a human. |
| [003](../../issues/003-filter-catalog-by-price.md) — let shoppers filter by price | `feat` | Spec delta drafted. Waiting at Gate 1, before any code exists. |

Three endings, and not one of them is "an agent merged its own work."

## Issue 001 — the bug path, start to finish

`triage-001.txt` classifies it as a bug and names the requirements it bears on, `REQ-ORD-4` and `REQ-ORD-3`, without being told they exist.

The rest of that run is in [`../expected/`](../expected/): the reproduction, the fix, and two reviews. Nothing needs repeating here.

## Issue 002 — the one that stopped

This is the run worth your time.

A customer says their confirmation email shows £96.00 while they were charged £86.40. It reads exactly like a bug. Two stations disagreed with that reading, for two different reasons, and neither of them guessed.

**The classifier** ([`triage-002.txt`](triage-002.txt)) worked out that £86.40 is the *correct* number under `REQ-ORD-5` — 9600 gross, less 10%. So nothing the spec promised is broken. And the spec describes no confirmation email at all. Its conclusion: this is not a defect, it is a request for behaviour that was never specified, and specifying what a customer's records should say is new product design. Classified `feat`, needs a human.

**The reproduction step** ([`../expected/06-reproduce-002-escalation.md`](../expected/06-reproduce-002-escalation.md)) came at it from the other end. It probed eight endpoints looking for any surface that emits a confirmation — `/api/orders/1/confirmation`, `/api/emails`, `/api/receipts`, and five more. All 404. It wrote no test and said so plainly, with the list of what it tried.

Both were right. The email is almost certainly showing `price × qty` with the discount never applied — the reproduction step worked that out too — but whatever sends that email is not in this repository. The correct output was to stop.

A loop that always produces a fix will produce a fix for this, and it will be fiction.

## Issue 003 — stopped at the gate, not by failure

Classified `feat`, so the spec moves before any code does. The delta is in [`../gate-1/`](../gate-1/), where a human decides.

Worth noting: I would have called this one `extension` rather than `feat` — it changes behaviour but needs no new design. The classifier argued it is a net-new query capability whose units and boundary semantics need a human-approved proposal. That is defensible, and more to the point it is *legible*: it wrote down its reason, so a human can disagree in one line and relabel it. A classifier that returns a label with no reason cannot be argued with.

## What this does not prove

The runs above are honest, but three issues is three issues. None of this shows an agent is reliable. It shows that when it is wrong, the wrongness lands somewhere a person can see it: a test that fails, a review that objects, a gate that stays red, or a run that stops and says what it tried.

That is the property worth building for. Not "the agent got it right," but "we would have known if it hadn't."

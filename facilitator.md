# Facilitator notes

Everything a participant should discover for themselves is spoiled here. Don't share this file during the session.

## The one thing they leave with

> The gate is not an AI. The loop is deterministic, only the worker is generative. A bug is real when a test reproduces it, not when a model says so. And the check that catches drift is the one that never saw the code being written.

If they take home only the shape — plain-English issue, classified, reproduced by a failing test, fixed, independently reviewed, two human gates — the session worked.

## Framing the title, honestly

"Work while you sleep" is not a claim about night shifts. Do not stage a fake overnight run, and do not let the room think the point is a cron schedule.

The claim is **no guidance**: the same prompt files, any repo, any time, and nobody steering. That is provable rather than staged, and the proof is how `artifacts/` was made — one prompt file piped into one CLI, no hint about where the bug was, no follow-up turns, no corrections. First response, committed as-is.

Say that in the first four minutes, because it is the difference between a demo and a claim someone can check. Then let them check it: the exact commands are at the bottom of this file.

The second half of the claim is **anywhere**. Nothing in `prompts/` knows anything about this repo that it does not read from the repo at run time. No file paths baked into the reasoning, no "the bug is in `createOrder`". That is why the same five files work on a codebase they were never written for, and it is the part worth stealing on Monday.

## Timetable

| Time | Min | Block |
|---|---|---|
| 0:00 | 4 | The claim. Put the `artifacts/unattended/` table on screen. Receipts before theory. |
| 0:04 | 3 | `./check.sh`. Say the fallback out loud now. |
| 0:07 | 7 | Exercise 1 — find the drift. Debrief inside the block. |
| 0:14 | 15 | Exercise 2 — the bug loop. |
| 0:29 | 4 | Debrief 2 — the two reviews. |
| 0:33 | 6 | Exercise 3 — Gate 1. |
| 0:39 | 6 | Wiring it up, and what breaks. |

**The cut line:** if the live half of exercise 2 isn't green by **0:26**, stop the room and walk `artifacts/expected/03-fix.diff` on the projector. Do not let it eat the debrief. The debrief is where the lesson lands; the live run is only where it gets felt.

Exercise 1 and 3 are each compressible by two or three minutes — drop the live re-run, give one delta instead of two. Never squeeze exercise 2.

## Minute 5, say this out loud

> Every exercise works from what's already committed in `artifacts/`. If your CLI is broken, rate-limited, or you never installed one, you lose nothing. The reading-and-judging half is the part that teaches; the live run is the part that convinces.

Say it before anyone gets stuck, not after. It changes the room from "am I keeping up" to "I'm choosing how deep to go."

## Exercise 1 — the answer

`spec/catalog.md` REQ-CAT-3 requires search to match **SKU or name**, **case-insensitively**. `app/server.mjs:41` is:

```js
return all.filter((item) => item.name.includes(query));
```

Two separate defects on one line: it never reads `item.sku`, and `includes` is case-sensitive. Fixing the case would still leave the SKU half broken.

```bash
curl -s 'localhost:3000/api/items?q=mug'      # []
curl -s 'localhost:3000/api/items?q=BOOK-1'   # []  — exact case, still nothing
curl -s 'localhost:3000/api/items?q=Mug'      # the mug
```

**The part that matters more than the bug.** `test/catalog.test.js:28` covers REQ-CAT-3 and queries `?q=Mug` — capital M, the one casing the broken code handles. The test was written from the implementation, so it agrees with the implementation, passes forever, and reports nothing. Coverage is full. The pipeline is green. The product is wrong.

Expect someone to say "so just delete the useless test." Good moment: the test isn't useless, it's aimed at the code instead of the spec. That's the difference between a test suite and a specification.

### If they run the verifier

It finds both halves, separates them, and flags the weak test unprompted. It also correctly declines to file `GET /api/items/mug-1` returning 404 as a finding — REQ-CAT-2 is silent on case, so that's unspecified behaviour, not drift. Worth pointing at: knowing what *not* to report is half of being a useful reviewer.

## Exercise 2 — the answer

`app/server.mjs` takes the units out of stock **before** the last guard has run:

```js
if (qty > item.stock) return { ok: false, reason: 'insufficient_stock' };

item.stock -= qty;                                              // ← the write lands here

if (qty > MAX_UNITS_PER_ORDER) return { ok: false, reason: 'over_limit' };
```

It reads like a guard that was added later and appended in the wrong place, which is exactly how this happens in real code.

- **The right fix** moves `item.stock -= qty` below every guard.
- **The tempting wrong fix** adds `item.stock += qty` before the `over_limit` return.

Both pass all 17 tests. Both are in `artifacts/expected/`. That is the whole debrief.

**Why the existing REQ-ORD-4 test passes:** it exercises the `insufficient_stock` path, and that guard sits *above* the write. So the requirement has a test, the test is honest, and the bug lives in the path the test doesn't walk. REQ-ORD-4 says the invariant holds "for **every** rejection reason" — one path tested, four paths claimed.

### What to watch for

- **Polarity.** Some agents will write a test asserting `stock === before - 25`, which passes today and hides the bug. If someone's agent does this, stop the room and show it. It is the most valuable failure in the session.
- **How many tests it writes.** The reference run wrote three: the reported symptom, the invariant across every rejection reason, and the consequence — that stock lost to rejections starves a later valid order. That third one is what "model the mechanism, not the symptom" looks like in practice.
- **The fix shape.** `git diff app/server.mjs` and ask the room which of the two fixes they got.

### Debrief 2 script

Put `04-review.md` and `05-review-of-the-naive-fix.md` side by side. Same bug, same tests, both green, `APPROVE` versus `REQUEST CHANGES`.

Then read the reviewer's own caveat aloud, because it is the most credible line in the repo:

> "high on there being **no reproducible runtime defect today** — I checked, and say so plainly... The severity comes from the repo's stated rule about patch shape, not from a wrong response I can show you."

That is a reviewer distinguishing "this is wrong" from "this will rot." Most human reviewers don't separate those two out loud.

The reviewer also found a real spec gap: when an order is both over the 20-unit cap and over available stock, `spec/orders.md` never says which `reason` wins. Nothing is broken today, and nothing pins it either. That finding routes to the spec, not to the code, and it is the second row of the table in `CONCEPT.md` happening for real.

## Exercise 3 — the answer

**Delta A is sound. Delta B should be sent back.** Three flaws in B, in the order they matter:

1. **REQ-ORD-7 specifies *how*, not *what*.** It names the data structure: "holds cancelled order ids in a `Set` keyed by order id, and `GET /api/orders` reads that `Set`". A user cannot observe a `Set`. This freezes the implementation and can only be satisfied one way.
2. **No refusal path anywhere.** Every WHEN in the delta is a success case. Missing: cancelling an order that does not exist, cancelling one that is already cancelled, and whether there is any time limit at all.
3. **It says nothing about stock** — and this is the one to push the room on. Cancelling an order that took units out of stock either puts them back or does not. The delta is silent, so whoever builds it will decide by accident. `REQ-ORD-4` already says a rejected order changes nothing; a *cancelled* order is a different case and nobody has said what it does. Anyone who did exercise 2 has the reflex to catch this.

**REQ-ORD-8 is the untestable one** — "should feel instant", "no delay a customer would notice". No test can assert that without a human interpreting it first.

Read the committed advisory review in `artifacts/gate-1/delta-b/review.md` before the session and note which of the three it found. Whatever it missed is the better question to put to the room: *the review is advisory, so what did it not tell you?* Do not tell them in advance which ones it caught — let them compare their own list to it. That comparison is the exercise.

Runs well as a vote. Hands up for merge, hands up for send-back, then ask one person from each side why. This is the block that works for the non-engineers in the room, so extend it if the room skews that way.

**On provenance:** the two deltas are constructed exercise material, unlike everything in `artifacts/expected/`. An exercise needs a known answer, so delta B's flaws are planted on purpose. The advisory reviews of them are real runs.

## The 60-second experiment for the close

If you have time and a working CLI, this is the strongest closing demo. Add one line to `AGENTS.md`:

```markdown
- **Decide before you write.** A request that can still be rejected must not have changed any state. Validate fully, then mutate.
```

Reset the repo, re-run `./run.sh prompts/reproduce.md` and `./run.sh prompts/fix.md`, and the naive fix stops appearing. Same prompt, same model, different outcome, because the standard was written down.

That is the answer to "do we need a steering document?" You don't need nine files of philosophy. You need the six rules your team actually argues about in review, in one file the agent reads. Everything else is a wiki page nobody opens.

## When things break

| What happens | What to say |
|---|---|
| A CLI won't authenticate | "Use `artifacts/expected/` — you're doing the graded half anyway." |
| An agent produces a different diff | "Expected. The gate is deterministic, the worker isn't. Green verify is the criterion." |
| An agent edits the test to make it pass | Stop the room. This is a real failure mode and `prompts/fix.md` forbids it by name. Best teaching moment available. |
| Someone's `npm run verify` is red before they start | They have a leftover edit. `git checkout app/ test/`. |
| The room finishes early | Point them at `issues/003` and `prompts/triage.md`, and let them draft the delta. |

## Resetting between runs

```bash
git checkout app/ test/ && npm run verify
```

Fourteen tests, nine requirements, green. That is the shipping state, with both defects live.

## Where the artifacts came from

Everything in `artifacts/` is captured output from actually running the prompts in this repo with Claude Code in headless mode (`claude -p`), not written by hand. Terminal output, diffs, and failure messages are real.

To regenerate any of them:

```bash
cat prompts/verify.md | claude -p --allowedTools "Read Grep Glob Bash(node:*) Bash(npm:*) Bash(curl:*)"
```

Worth doing before you run the session, for two reasons: the output will differ from what's committed, which is honest and worth showing, and it confirms your own setup works on the day.

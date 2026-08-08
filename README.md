# Work while you sleep — a 45-minute workshop

A small storefront, a spec that is the source of truth, and a delivery loop where agents carry the work between two points where a human decides.

You will find a bug the pipeline is green on, watch an agent write a test that fails on purpose, and stand in as the human who approves a change before it exists. Everything you need is committed here, including real output from real runs.

For the shape of the whole thing, read [CONCEPT.md](CONCEPT.md). For the standards every agent here answers to, [AGENTS.md](AGENTS.md).

## Setup

Three things, and the third is optional.

```bash
git clone https://github.com/raunakkathuria/ai-sdlc-workshop
cd ai-sdlc-workshop
./check.sh
```

1. **Node 22 or newer.** That's the only requirement. There is nothing to install — no dependencies, no lockfile, no Docker.
2. **`./check.sh`** should print green.
3. **Optionally, one agent CLI**, logged in: Claude Code, Codex, Gemini CLI, Cursor, or OpenCode. Any one of them. Without one you can still do every exercise, because the reference runs ship in [`artifacts/`](artifacts/).

Want to see the product first? `npm start`, then open http://localhost:3000.

---

## Exercise 1 — find the drift

The pipeline is green. Run it and see:

```bash
npm run verify
```

Fourteen tests pass. Every requirement in `spec/` has a test. Nothing is red.

Now open [`spec/catalog.md`](spec/catalog.md) beside [`app/server.mjs`](app/server.mjs) and read `REQ-CAT-3` scenario by scenario. Ask one question of each scenario: *does the code actually do this?* Then check the same scenarios against [`test/catalog.test.js`](test/catalog.test.js).

Three minutes of reading. Then, if you have a CLI:

```bash
./run.sh prompts/verify.md
```

That runs an independent verifier with a fresh context. It has the spec, the code, and no memory of writing either. Compare what it found to what you found — including whether it says anything about the test.

Reference run: [`artifacts/expected/01-verify-catalog.md`](artifacts/expected/01-verify-catalog.md).

**The thing to take away:** a green pipeline is only as true as the thing it compares against. `npm run req-coverage` checks that every requirement is *named* by a test. Naming is not asserting.

---

## Exercise 2 — the bug loop

Read the bug report first. It is written the way support actually writes them: [`issues/001-rejected-order-eats-stock.md`](issues/001-rejected-order-eats-stock.md).

### First, judge a test you did not write

Open [`artifacts/expected/02-reproduce.diff`](artifacts/expected/02-reproduce.diff). That is the real output of the reproduce step. Answer one question before you run anything:

> **On today's build, does this test fail?**

It matters more than it looks. A reproduction has to assert the behaviour that *should* happen, so it fails now and passes once the bug is fixed. Get the polarity backwards and you write a test that passes today, hides the bug, and reports success. Then look at how many tests it wrote, and why.

### Then run it yourself

```bash
./run.sh prompts/reproduce.md     # writes a failing test
npm test                          # watch it fail — read the failure
./run.sh prompts/fix.md           # make it pass
npm run verify                    # green
```

Your agent will not produce the same diff as the reference run, and that is fine. The success criterion is `npm run verify` going from red to green, not a particular patch.

When you are done: `git diff app/server.mjs`. Did it stop the bug happening, or clean up after it?

Reference runs: [`03-fix.diff`](artifacts/expected/03-fix.diff), [`04-review.md`](artifacts/expected/04-review.md), and the one worth reading twice, [`05-review-of-the-naive-fix.md`](artifacts/expected/05-review-of-the-naive-fix.md).

**The thing to take away:** those two reviews cover two different fixes for this same bug. Both fixes pass all 17 tests. One review approves, the other asks for changes. The deterministic gate could not tell them apart.

---

## Exercise 3 — you are Gate 1

Two spec deltas are open, waiting on a human. Each comes with the advisory reviews that ran automatically when it opened — a product lens and an architect lens.

Read both in [`artifacts/gate-1/`](artifacts/gate-1/), then decide, for each one: **merge, or send it back?**

You are not reviewing code. There is no code yet. You are deciding whether the intent is agreed and testable. Two questions carry most of the weight:

- Does every requirement say *what* the product does, or does one of them say *how* to build it?
- Is every path covered, including the ones where the answer is no?

Read the advisory reviews too, and judge them. A review that missed something is its own finding.

**The thing to take away:** this is the gate that cannot be automated, and it is the cheapest place in the whole process to catch a bad decision. No code exists yet.

---

## Running it without guidance

The claim is not that a machine works the night shift. It is that the loop runs without anyone steering it: the same prompt files, in any repo, at any time, with no one to nudge it back on track.

Every run in [`artifacts/`](artifacts/) was produced by piping **one prompt file into one CLI and nothing else**. No hint about where the bug was. No follow-up turns. No corrections. What is committed is what came back the first time.

Three issues went in. Three different endings, and none of them was an agent merging its own work:

| Issue | What it was | Where it stopped |
|---|---|---|
| [001](issues/001-rejected-order-eats-stock.md) | a bug with a clear symptom | reproduced, fixed, reviewed, pull request open on green gates |
| [002](issues/002-confirmation-email-wrong-total.md) | a report about a surface this system does not own | classified as a product request rather than a bug, and reproduction found nothing to test. Handed to a human. |
| [003](issues/003-filter-catalog-by-price.md) | a request that changes behaviour | spec delta drafted, waiting at Gate 1 |

Issue 002 is the one to look at. Two stations reached the same conclusion by different routes — the classifier because the spec never promised a confirmation email, the reproduction step because no endpoint could surface it. Neither guessed. See [`artifacts/unattended/`](artifacts/unattended/).

A loop that only ever succeeds has not been tested.

[`.github/workflows/bug-intake.yml`](.github/workflows/bug-intake.yml) is that same chain wired to GitHub, reading the same files in `prompts/`. It is off without a token, and it opens pull requests — it never merges one.

## Taking it further

- [CONCEPT.md](CONCEPT.md) — the line, the feedback loops, and what a production version adds.
- [`facilitator.md`](facilitator.md) — if you are running this session for your own team.
- The same method on a larger, multi-service codebase, with browser tests, a database, and org-level standards that are pinned and drift-checked: [spec-driven-sdlc-demo](https://github.com/raunakkathuria/spec-driven-sdlc-demo).

One experiment worth trying on Monday, in your own repo: write down the six rules your team actually argues about in review, put them in an `AGENTS.md`, and see how much of your review queue stops being about those rules.

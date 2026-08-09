# ADLC — the automated development life cycle

A small storefront, a spec that is the source of truth, and a delivery loop where agents carry the work between two points where a human decides. Built as a **45-minute hands-on workshop**, and runnable on its own.

The session has two halves. First we take **one feature end to end** — a request in plain English, through a spec change, past a human gate, into working code with a pull request. Then **you run the shorter path yourself** on a real bug, and see why the same loop carries very different amounts of process depending on what the change is.

Everything is committed, including real output from real runs. For the shape of the whole thing, read [CONCEPT.md](CONCEPT.md). For the standards every agent here answers to, [AGENTS.md](AGENTS.md).

## Setup

Three things, and the third is optional.

```bash
git clone https://github.com/raunakkathuria/adlc
cd adlc
./check.sh
```

1. **Node 22 or newer.** The only requirement. Nothing to install — no dependencies, no lockfile, no Docker.
2. **`./check.sh`** should print green.
3. **Optionally, one agent CLI**, logged in: Claude Code, Codex, Gemini CLI, Cursor, or OpenCode. Any one. Without one you can still do everything, because every reference run ships in [`artifacts/`](artifacts/).

Want to see the product first? `npm start`, then open http://localhost:3000.

---

# Part 1 — one feature, end to end

Follow along. One decision in the middle is yours.

Two of these six are worth running live in a room. The rest you read, because they are either slow or already committed as evidence:

| Step | In the room |
|---|---|
| 01 classify | **run it** — about a minute, and its output is data you can pipe |
| 02 spec delta | read the committed one; a live run will not overwrite it |
| 03 spec review | run it if the clock allows — read-only, no collision |
| 04 Gate 1 | the room decides. No command. |
| 05 build | **switch to the branch.** The real run took ~50 minutes. |
| 06 Verifier | **run it** — read-only, and it is the station that lands hardest |


Somebody in product wants shoppers to be able to narrow the catalogue by price. It arrives as [issue #4](https://github.com/raunakkathuria/adlc/issues/4) — three paragraphs, no ticket template, the way real requests actually turn up.

The first station takes it in: the issue is copied into the repo as [`issues/003-filter-catalog-by-price.md`](issues/003-filter-catalog-by-price.md), and every station after that reads only that file. It makes a run reproducible from the commit alone, and it means none of what follows needs a GitHub token. See [`issues/README.md`](issues/README.md) — `bug-intake.yml` does the same thing automatically.

### 1. Classify it

```bash
./run.sh prompts/triage.md issues/003-filter-catalog-by-price.md
```

This is the one station whose output is **data, not prose** — `bug-intake.yml` parses it to pick the path. Interactively you will see the agent narrate around the JSON. To get it clean enough to pipe:

```bash
./run.sh --print prompts/triage.md issues/003-filter-catalog-by-price.md \
  | claude -p --allowedTools "Read Grep Glob" | jq
```

The committed run is [`artifacts/unattended/triage-003.txt`](artifacts/unattended/triage-003.txt). The file holds it on one line; this is the same object through `jq`:

```json
{
  "class": "feat",
  "needs_spec": true,
  "needs_proposal": true,
  "slug": "filter-catalog-by-price",
  "requirements": [
    "REQ-CAT-1",
    "REQ-CAT-3"
  ],
  "reason": "The spec defines only list, fetch-by-SKU, and text search — it is silent on price filtering, so this is a net-new query capability whose units and boundary semantics need a human-approved proposal."
}
```

| Field | What it decides |
|---|---|
| `class` | Which of the five paths the issue takes: `feat`, `extension`, `bug`, `chore`, `docs`. `bug-intake.yml` reads this key and nothing else to decide whether the bug path runs. |
| `needs_spec` | Whether a human has to merge a spec delta before any code exists. True when a rebuild from the spec alone would lose the change. |
| `needs_proposal` | Whether that delta also carries `proposal.md`, the why-it-exists file for the person at Gate 1. True only for `feat`. |
| `slug` | The directory the delta lands in, `spec/changes/<slug>/`. Empty for `bug`, `chore` and `docs`, which write no delta. |
| `requirements` | The requirement ids the issue bears on. For a bug, what is broken. For a feature, what the delta touches. |
| `reason` | Why this class, in one sentence, so a human can disagree in one line. |

`class` sets the three keys under it: `feat` needs a delta and a proposal, `extension` a delta only, and the code-only classes neither.

One question decides how much process this change carries: **would a rebuild from the spec alone lose it?** Here, yes — so the spec moves before any code does.

### 2. Change the spec, not the code

```bash
./run.sh prompts/delta.md issues/003-filter-catalog-by-price.md
```

**Read the committed one rather than running this live.** The delta is already in the repo as evidence, and `delta.md` will not overwrite committed work — it checks `spec/changes/` first, and writes to a fresh slug while saying why. That refusal is correct and worth knowing about, but two delta directories mid-demo is noise. Delete the extra one with `git checkout -- spec/` if you do try it.

Output: [`spec/changes/filter-catalog-by-price/`](spec/changes/filter-catalog-by-price/) — a proposal for the person deciding, the requirements themselves, and the tasks.

Read [`tasks.md`](spec/changes/filter-catalog-by-price/tasks.md) even if you skim the rest. It works out that the coverage gate only reads the top level of `spec/`, so the new requirement is invisible to CI while the delta sits in `changes/` and gate-visible the moment it lands. It also spots the *other* defect in this repo and says explicitly: work around it, do not fix it here.

### 3. Two reviewers read it, before a human does

```bash
./run.sh prompts/spec-review.md spec/changes/filter-catalog-by-price/
```

A product lens and an architect lens, neither of which wrote the delta. Advisory only. See [`artifacts/gate-1/`](artifacts/gate-1/).

### 4. Gate 1 — your turn

A second delta arrived the same morning: [`artifacts/gate-1/delta-b/`](artifacts/gate-1/delta-b/), which lets a customer cancel an order. It reads reasonably.

**Would you merge it?** Take four minutes. There is no code yet, so you are not reviewing an implementation — you are deciding whether the intent is agreed and testable. Two questions carry most of the weight:

- Does every requirement say *what* the product does, or does one of them say *how* to build it?
- Is every path covered, including the ones where the answer is no?

Then read [`delta-b/review.md`](artifacts/gate-1/delta-b/review.md) and compare it to your own list. Judge the review too — anything it missed is its own finding.

This is the gate that cannot be automated, and it is the cheapest place in the whole process to catch a bad decision.

### 5. Build it

Delta A gets merged, and the Executor builds it:

```bash
./run.sh prompts/build.md spec/changes/filter-catalog-by-price/
```

**This one is already done.** It is the main development work of Part 1, and the real run took about 50 minutes. Keep the session clock in mind: that is the longest step in the loop by a wide margin, and a spinner in front of a room teaches nothing. Switch to the finished branch instead:

```bash
git checkout feat/filter-by-price
git diff main
```

If you do run the build live, know that it folds the delta into `spec/catalog.md` and **deletes `spec/changes/filter-catalog-by-price/`**. That is correct behaviour, and it consumes Part 1's starting state. Put it back with:

```bash
git checkout main && git checkout -- app/ test/ spec/
```

The delta folds into the living spec, tests come before the implementation, and the gate has to be green at the end.

The finished work is **[pull request #1](https://github.com/raunakkathuria/adlc/pull/1)**, on the `feat/filter-by-price` branch. Its run report is in `artifacts/demo/` on that branch, and it is the thing to actually read — four moments in it carry the session:

- It **stayed inside the change**, working around the search defect the delta warned it about, then listing everything it deliberately left alone.
- It **found a hole in the gate**: the spec now has two `REQ-CAT-3` scenarios no test asserts, and `req-coverage` matches on requirement ids, so it reports the requirement as covered anyway. *"The gate structurally cannot see this."*
- It **argued with the delta it was given** — an open question does not belong in text that becomes the spec.
- It **named four behaviours it made true by accident**, because code cannot abstain where a spec stayed silent.

```bash
git diff main feat/filter-by-price
```

### 6. The Verifier signs it off

A third role. It wrote none of this and shares no session with the two that did.

```bash
./run.sh prompts/verify.md spec/catalog.md
```

It re-derives the feature from the spec *before* reading any code — read the code first and you end up checking whether the code is self-consistent, which it always is. Then it reports drift in both directions: **missing** (a requirement the product does not honour) and **extra** (behaviour that traces back to no requirement at all).

That second direction is the one most reviews skip. Code cannot abstain: where the spec stayed silent, an implementation detail decided, and nobody chose it. So extra findings go back to the spec, not into the code.

On `pass` the work goes to Gate 2. On `fail` it goes **back to the Planner, not the Executor** — if the spec was silent or wrong, more code will not fix it.

Expect it to flag the search defect this build deliberately left alone. Per-diff review passed that; the independent check did not.

### 7. Gate 2 — still a human

The pull request is open, the gates are green, and nothing merges it but a person.

That is the honest shape of this loop. It does not remove unspecified behaviour. It makes the unspecified behaviour visible at the moment it gets decided, in a report someone can read.

---

# Part 2 — you run it

Now the short path. Same loop, much less process, because it is a bug rather than a behaviour change.

## First: the pipeline is green and the product is wrong

```bash
npm run verify
```

Fourteen tests pass. Every requirement has a test. Nothing is red.

Now open [`spec/catalog.md`](spec/catalog.md) beside [`app/server.mjs`](app/server.mjs) and read `REQ-CAT-3` scenario by scenario. Ask of each one: *does the code actually do this?* Then check the same scenarios against [`test/catalog.test.js`](test/catalog.test.js).

Three minutes of reading — you are doing the Verifier's job by hand. Then hand it to the real thing, the same station you watched in Part 1 step 6:

```bash
./run.sh prompts/verify.md spec/catalog.md
```

Reference run: [`artifacts/expected/01-verify-catalog.md`](artifacts/expected/01-verify-catalog.md).

**The lesson:** `npm run req-coverage` checks that every requirement is *named* by a test. Naming is not asserting. A green pipeline is only as true as the thing it compares against.

## Then: the bug loop

Read the report first, written the way support actually writes them: [issue #2](https://github.com/raunakkathuria/adlc/issues/2), taken in as [`issues/001-rejected-order-eats-stock.md`](issues/001-rejected-order-eats-stock.md).

### Judge a test before you write one

Open [`artifacts/expected/02-reproduce.diff`](artifacts/expected/02-reproduce.diff) and answer one question:

> **On today's build, does this test fail?**

It matters more than it looks. A reproduction asserts the behaviour that *should* happen, so it fails now and passes once the bug is fixed. Get the polarity backwards and you have a test that passes today, hides the bug, and reports success. Then count how many tests it wrote, and work out why.

### Run it

```bash
./run.sh prompts/reproduce.md issues/001-rejected-order-eats-stock.md   # writes a failing test
npm test                                                                # watch it fail
./run.sh prompts/fix.md                                                 # make it pass
npm run verify                                                          # green
```

Your agent will not produce the reference diff, and that is fine. The criterion is `npm run verify` going from red to green.

Then `git diff app/server.mjs`, and ask: did it stop the bug happening, or clean up after it?

**The lesson:** [`04-review.md`](artifacts/expected/04-review.md) and [`05-review-of-the-naive-fix.md`](artifacts/expected/05-review-of-the-naive-fix.md) are reviews of two different fixes for this same bug. Both fixes pass all 17 tests. One approves, one asks for changes. The deterministic gate could not separate them.

---

## The two paths, side by side

Same loop, same gates, same standards. What differs is only what comes *before* the code.

| | Part 1 — the feature | Part 2 — the bug |
|---|---|---|
| Spec delta | Yes | No |
| Human gate before code | Gate 1 | none |
| Stations | triage → delta → spec review → **Gate 1** → build → review | triage → reproduce → fix → review |
| Why | a rebuild from the spec alone would lose it | it wouldn't |

That is the whole triage decision. One question, asked once, and the process sizes itself.

## Running without guidance

The claim is not that a machine works the night shift. It is that the loop runs without anyone steering it: the same prompt files, in any repo, at any time.

Every run in [`artifacts/`](artifacts/) was produced by piping **one prompt file into one CLI and nothing else**. No hint about where the bug was. No follow-up turns. No corrections. What is committed is what came back the first time.

Three issues went in. Three different endings, and none was an agent merging its own work:

| Issue | What it was | Where it stopped |
|---|---|---|
| [#2](https://github.com/raunakkathuria/adlc/issues/2) | a bug with a clear symptom | reproduced, fixed, reviewed, pull request on green gates |
| [#3](https://github.com/raunakkathuria/adlc/issues/3) | a report about a surface this system does not own | classified as a product request rather than a bug, and reproduction found nothing to test. Handed to a human. |
| [#4](https://github.com/raunakkathuria/adlc/issues/4) | a request that changes behaviour | spec delta, Gate 1, then built — Part 1 |

Issue 002 is the one to look at. Two stations reached the same conclusion by different routes — the classifier because the spec never promised a confirmation email, the reproduction step because no endpoint could surface it. Neither guessed. See [`artifacts/unattended/`](artifacts/unattended/).

A loop that only ever succeeds has not been tested.

[`.github/workflows/bug-intake.yml`](.github/workflows/bug-intake.yml) is that same chain wired to GitHub, reading the same files in `prompts/`. It is off without a token, and it opens pull requests — it never merges one.

## Taking it further

- [CONCEPT.md](CONCEPT.md) — the line, the feedback loops, and what a production version adds.
- [`facilitator.md`](facilitator.md) — if you are running this session for your own team.
- The same method on a larger, multi-service codebase, with browser tests, a database, and org-level standards that are pinned and drift-checked: [spec-driven-sdlc-demo](https://github.com/raunakkathuria/spec-driven-sdlc-demo).

One experiment worth trying on Monday, in your own repo: write down the six rules your team actually argues about in review, put them in an `AGENTS.md`, and see how much of your review queue stops being about those rules.

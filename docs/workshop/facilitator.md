# Facilitator notes

> **Note:** this facilitator guide belongs to the original 45-minute workshop, built on the v1 layout (`spec/`, `run.sh` paths, `bug-intake.yml`). The committed reference runs in `artifacts/` are still real evidence; the live line has since moved to OpenSpec and the six-station workflows — see README.md.

Everything a participant should discover for themselves is spoiled here. Don't share this file during the session.

## The one thing they leave with

> The gate is not an AI. The loop is deterministic, only the worker is generative. A bug is real when a test reproduces it, not when a model says so. And the check that catches drift is the one that never saw the code being written.

If they take home only the shape — a plain-English request, classified, and then either a spec change through a human gate *or* a failing test and a fix, both ending at a pull request nobody but a person merges — the session worked.

## Framing the title, honestly

"Work while you sleep" is not a claim about night shifts. Do not stage a fake overnight run, and do not let the room think the point is a cron schedule.

The claim is **no guidance**: the same prompt files, any repo, any time, nobody steering. That is provable rather than staged, and the proof is how `artifacts/` was made — one prompt file piped into one CLI, no hint about where the bug was, no follow-up turns, no corrections. First response, committed as-is.

Say that in the first four minutes, because it is the difference between a demo and a claim someone can check. Then let them check it: the commands are at the bottom of this file.

The second half of the claim is **anywhere**. Nothing in `prompts/` knows anything about this repo that it does not read from the repo at run time. No paths baked into the reasoning, no "the bug is in `createOrder`". That is why the same files work on a codebase they were never written for, and it is the part worth stealing on Monday.

## What to run live, and what to read

Only two of Part 1's six stations are worth running live. The rest are slow, or already committed as evidence, and a room learns nothing from watching a spinner.

| Station | In the room | Why |
|---|---|---|
| 01 classify | **run it** | ~1 minute, and its output is data — pipe it to `jq` on screen |
| 02 spec delta | read the committed one | `delta.md` refuses to overwrite committed work and writes a fresh slug instead. Correct, but two delta directories mid-demo is noise. |
| 03 spec review | run if the clock allows | read-only, no collision |
| 04 Gate 1 | the room votes | no command |
| 05 build | **`git checkout feat/filter-by-price`** | the real run took ~50 minutes. Show [PR #1](https://github.com/raunakkathuria/adlc/pull/1) and the run report. |
| 06 Verifier | **run it** | read-only, ~4 minutes, and it is the station that lands hardest |

Part 2 is all live — that is the point of Part 2.

## Rehearsing safely

Test the commands without touching your working copy or the repo on GitHub:

```bash
./run.sh --print prompts/triage.md issues/003-filter-catalog-by-price.md | tail -3
```

`--print` invokes no agent. It proves the prompt resolved, the target resolved, and the target line was appended — which is the only thing that silently breaks. Re-run it for each station on the morning of the session.

For a full rehearsal with the agents actually running, use a throwaway clone with no remote, so nothing can be pushed and no issue can be closed:

```bash
git clone https://github.com/raunakkathuria/adlc.git /tmp/rehearsal
cd /tmp/rehearsal && git branch feat/filter-by-price origin/feat/filter-by-price \
  && git remote remove origin && ./check.sh
```

Create that branch **before** dropping the remote. Removing `origin` deletes the remote-tracking refs with it, and step 5 of Part 1 is `git checkout feat/filter-by-price` — without a local branch it fails outright, in the one clone you rehearse in.

Only two stations change files: `build.md` (folds the delta in and deletes its directory) and `reproduce.md` / `fix.md`. Nothing in the loop touches GitHub. Worth knowing: `AGENTS.md` has a Git section, so an agent could decide to commit on its own — harmless in a remote-less clone, which is the main argument for using one.

## Timetable

| Time | Min | Block | Who |
|---|---|---|---|
| 0:00 | 4 | The claim. `artifacts/unattended/` on screen, and the [GitHub issues](https://github.com/raunakkathuria/adlc/issues) beside it — "the line accepts work one way, as a tracked issue" is worth showing rather than asserting. Receipts before theory. | you |
| 0:04 | 3 | `./check.sh`, and say the fallback out loud. | them |
| 0:07 | 14 | **Part 1 — one feature, end to end.** The Gate 1 vote lands around 0:15. | you drive |
| 0:21 | 3 | **Part 2 warm-up** — the pipeline is green and the product is wrong. | them, reading |
| 0:24 | 14 | **Part 2 — the bug loop.** | them, running |
| 0:38 | 4 | Debrief — the two reviews, then the two paths side by side. | you |
| 0:42 | 3 | Close. | you |

**The cut line:** if the live half of Part 2 isn't green by **0:35**, stop the room and walk `artifacts/expected/03-fix.diff` on the projector. Do not let it eat the debrief — the debrief is where the lesson lands; the live run is only where it gets felt.

Part 1 compresses to 10 minutes by showing the delta and its review as finished artifacts rather than running the prompts live. Never squeeze Part 2.

## Minute 5, say this out loud

> Every exercise works from what's already committed in `artifacts/`. If your CLI is broken, rate-limited, or you never installed one, you lose nothing. The reading-and-judging half is the part that teaches; the live run is the part that convinces.

Say it before anyone gets stuck, not after. It changes the room from "am I keeping up" to "I'm choosing how deep to go".

---

# Part 1 — running the demo

You drive. Everything is already committed, so you can either run the prompts live or walk the artifacts. Decide by how the clock is going.

### The beats

1. **The request.** Read `issues/003-filter-catalog-by-price.md` aloud. Three paragraphs, no template. Point out that this is the actual input — nobody wrote acceptance criteria first.

2. **Classify.** `./run.sh prompts/triage.md issues/003-filter-catalog-by-price.md`, or read `artifacts/unattended/triage-003.txt`. One question sizes the process: would a rebuild from the spec alone lose this? Yes, so the spec moves first.

   Say what the second argument is doing, because it is the whole intake story in one line: the issue is [#4 on GitHub](https://github.com/raunakkathuria/adlc/issues/4), and the first station copied it into the repo so every station after this reads the same bytes — and so none of this needs a token.

   Worth admitting in the room: it came back `feat`, and I would have said `extension`. It is a defensible call either way, and the thing that matters is that it *wrote down its reason*, so a human can disagree in one line. A classifier that returns a label with no reason cannot be argued with.

3. **The delta.** `./run.sh prompts/delta.md issues/003-filter-catalog-by-price.md` produces `spec/changes/filter-catalog-by-price/`. The one to actually open is `tasks.md`, for two reasons:
   - It worked out on its own that `req-coverage` reads only the top level of `spec/` — `readdir`, not a recursive walk — so the new requirement is invisible to the gate while the delta sits in `changes/`, and gate-visible the moment it lands. Nobody told it that. It read the script.
   - It noticed the *other* defect in this repo, the search one from Part 2, and wrote: **"Do not 'fix' search inside this change."** It suggested asserting composition with a query today's search happens to match, so the feature test doesn't fail for two unrelated reasons.

   That second point is the demo's strongest moment. Scope discipline is the thing people assume an agent cannot do.

   Then `proposal.md`, and specifically the split between **decisions taken** and the **open question for Gate 1**. It picks the things that are not coin flips and says why. It hands up the one that genuinely is — whether `max_price=0` is a filter with an empty answer or a mistake to refuse — and argues *against its own choice*, citing REQ-ORD-6 as precedent. "My proposal is the inconsistent one" is a sentence worth reading out.

4. **Two reviewers, before a human.** `./run.sh prompts/spec-review.md spec/changes/filter-catalog-by-price/` — a product lens and an architect lens, neither of which wrote the delta.

5. **Gate 1 — hand it to the room.** See below. This is the audience-participation beat and it needs no laptops.

6. **Build.** [Pull request #1](https://github.com/raunakkathuria/adlc/pull/1), and the run report in `artifacts/demo/` on that branch. Tests first, gate green, delta folded into the living spec and its directory deleted — the spec is the record of what was agreed, not a pile of change files.

   The four beats to read out are in the PR description. If you only use one, use the second: it found that the living spec now carries two `REQ-CAT-3` scenarios no test asserts, and that `req-coverage` matches on requirement ids so it reports the requirement covered regardless. *"The gate structurally cannot see this."* An agent auditing the gate it was measured by is not what people expect from this.

   The fourth beat is the one that earns trust with a sceptical room: four behaviours the delta left unspecified now have answers, decided by an implementation detail rather than a person, and it said so. The loop does not remove unspecified behaviour — it makes it visible at the point it gets decided.

7. **The Verifier.** `./run.sh prompts/verify.md spec/catalog.md` — the third role, which wrote none of it and shares no session with the two that did.

   Two things to draw out. It **re-derives the feature from the spec before opening any code**, which is what stops it becoming a diff-reader: read the code first and you only ever check whether the code is self-consistent, which it always is. And it reports drift **in both directions** — *missing* (a requirement the product does not honour) and *extra* (behaviour that traces to no requirement).

   Extra is the one nobody expects, and on this repo it is spectacular. Run it before the session and read `artifacts/expected/01-verify-catalog.md`: it finds an entire unspecified web UI, an error handler leaking internal messages to clients, three reason codes in no spec, and — the best one — that `?max_price=1000` is **silently ignored today**, while cross-referencing the delta sitting at Gate 1 whose own composition rule says a shopper must never receive a plausible-looking list assembled from a filter the system did not understand.

   Its verdict splits the routing rather than saying a bare FAIL: the Extra list needs Gate 1 because a human decides what the spec should say, while `REQ-CAT-3` needs no delta at all because the spec is already correct and only the code is wrong. That distinction is the whole point of `FAIL → back to the Planner`.

   **Expect it to flag the seeded search defect, and let it.** The build deliberately left that alone, per-diff review passed it, and the independent check caught it anyway. It is advisory, so the pull request stays mergeable. This is the strongest live proof of independence in the session — do not apologise for it.

   If you name the defect out loud here, name both halves: `app/server.mjs:41` never reads `item.sku`, and the match is case-sensitive. Say only "search is case-sensitive" and the first person who types `BOOK-1` exactly as printed will contradict you. Worked out in full under Part 2 below.

8. **Gate 2.** The pull request is open on green gates. Nothing merges it but a person.

   Worth showing the Actions tab here: `verify` runs in about 11 seconds. The gate being that cheap is why it can sit between every station.

### The Gate 1 vote — the answer

Give them `artifacts/gate-1/delta-b/` (cancel an order) and ask whether they would merge it. **They should send it back.** Three flaws, in the order they matter:

1. **REQ-ORD-7 specifies *how*, not *what*.** It names the data structure: "holds cancelled order ids in a `Set` keyed by order id, and `GET /api/orders` reads that `Set`". A user cannot observe a `Set`. It can be satisfied exactly one way.
2. **No refusal path anywhere.** Every WHEN is a success case. Missing: cancelling an order that does not exist, cancelling one already cancelled, and whether there is any time limit at all.
3. **It says nothing about stock** — push the room on this one. Cancelling an order that took units out of stock either puts them back or does not, the delta is silent, and whoever builds it will decide by accident. Anyone who has done Part 2 has the reflex to catch it.

**REQ-ORD-8 is the untestable one** — "should feel instant", "no delay a customer would notice". No test asserts that without a human first deciding what it means.

**Read `delta-b/review.md` before the session.** It found all three, and four more nobody planted: an ownership model the system does not have (nothing in the spec knows what a customer is, so as written any caller can cancel any order by guessing its id), a timestamp the proposal promises and no requirement delivers, a surface named in one scenario that exists nowhere in the spec, and a response body two people would implement differently.

It also spotted that an untestable requirement plus a coverage gate that only checks a requirement is *named* will produce a fake test — the same lesson Part 2 opens with, reached from the other direction. That connection is worth drawing explicitly.

Because the review is that thorough, **do not show it first.** Make them build their own list, then compare. The comparison is the exercise. The good question afterwards is: *it is advisory, so what did it not tell you?*

### Provenance, if anyone asks

Delta A is real output from the delta prompt. **Delta B was written by hand with its flaws planted** — an exercise needs a known answer, and a sound delta makes a poor thing to practise refusing. Both advisory reviews are real runs, and the review of delta B had no idea it was constructed. Say this plainly if asked; it is the one hand-written thing in `artifacts/`.

---

# Part 2 — the answers

## The warm-up: green pipeline, wrong product

`spec/catalog.md` REQ-CAT-3 requires search to match **SKU or name**, **case-insensitively**. `app/server.mjs:41` is:

```js
return all.filter((item) => item.name.includes(query));
```

Two separate defects on one line: it never reads `item.sku`, and `includes` is case-sensitive. Fixing the case still leaves the SKU half broken.

```bash
curl -s 'localhost:3000/api/items?q=mug'      # []
curl -s 'localhost:3000/api/items?q=BOOK-1'   # []  — exact case, still nothing
curl -s 'localhost:3000/api/items?q=Mug'      # the mug
```

**The part that matters more than the bug.** `test/catalog.test.js:28` covers REQ-CAT-3 and queries `?q=Mug` — capital M, the one casing the broken code handles. The test was written from the implementation, so it agrees with the implementation, passes forever, and reports nothing. Coverage is full. The pipeline is green. The product is wrong.

Expect someone to say "so delete the useless test". Good moment: it isn't useless, it's aimed at the code instead of the spec. That is the difference between a test suite and a specification.

If they run the verifier, it finds both halves, separates them, gives curl evidence, and flags the weak test unprompted. It also declines to file `GET /api/items/mug-1` returning 404 as a finding, because REQ-CAT-2 is silent on case — unspecified behaviour, not drift. Knowing what *not* to report is half of being a useful reviewer.

## The bug loop

`app/server.mjs` takes units out of stock **before** the last guard runs:

```js
if (qty > item.stock) return { ok: false, reason: 'insufficient_stock' };

item.stock -= qty;                                              // ← the write lands here

if (qty > MAX_UNITS_PER_ORDER) return { ok: false, reason: 'over_limit' };
```

It reads like a guard added later and appended in the wrong place, which is how this happens in real code.

- **The right fix** moves `item.stock -= qty` below every guard.
- **The tempting wrong fix** adds `item.stock += qty` before the `over_limit` return.

Both pass all 17 tests. Both are in `artifacts/expected/`. That is the whole debrief.

**Why the existing REQ-ORD-4 test passes:** it exercises the `insufficient_stock` path, and that guard sits *above* the write. So the requirement has a test, the test is honest, and the bug lives in the path the test doesn't walk. REQ-ORD-4 claims the invariant holds "for **every** rejection reason" — one path tested, four claimed.

### What to watch for

- **Polarity.** Some agents will assert `stock === before - 25`, which passes today and hides the bug. If someone's agent does this, stop the room and show it. It is the most valuable failure available.
- **How many tests it writes.** The reference run wrote three: the reported symptom, the invariant across every rejection reason, and the consequence — that stock lost to rejections starves a later valid order. That third one is "model the mechanism, not the symptom" in practice.
- **The fix shape.** `git diff app/server.mjs`, then ask the room which of the two fixes they got.

### Debrief script

Put `04-review.md` and `05-review-of-the-naive-fix.md` side by side. Same bug, same tests, both green, `APPROVE` versus `REQUEST CHANGES`.

Then read the reviewer's own caveat aloud, because it is the most credible line in the repo:

> "high on there being **no reproducible runtime defect today** — I checked, and say so plainly... The severity comes from the repo's stated rule about patch shape, not from a wrong response I can show you."

That is a reviewer separating "this is wrong" from "this will rot". Most human reviewers don't do that out loud.

The reviewer also found a real spec gap: when an order is both over the 20-unit cap and over available stock, `spec/orders.md` never says which `reason` wins. Nothing is broken today, and nothing pins it either. That finding routes to the spec, not the code — the second row of the table in `CONCEPT.md`, happening for real.

### Then close with the two paths

Put the table from the README on screen. Same loop, same gates, same standards; what differs is only what comes before the code. One question decided it, and the process sized itself.

---

## The 60-second experiment for the close

If you have time and a working CLI, this is the strongest closing demo. Add one line to `AGENTS.md`:

```markdown
- **Decide before you write.** A request that can still be rejected must not have changed any state. Validate fully, then mutate.
```

Reset, re-run `./run.sh prompts/reproduce.md issues/001-rejected-order-eats-stock.md` and `./run.sh prompts/fix.md`, and the naive fix stops appearing. Same prompt, same model, different outcome, because the standard was written down.

That is the answer to "do we need steering documents?" You don't need nine files of philosophy. You need the six rules your team actually argues about in review, in one file the agent reads. Everything else is a wiki page nobody opens.

## When things break

| What happens | What to say |
|---|---|
| A CLI won't authenticate | "Use `artifacts/`— you're doing the graded half anyway." |
| An agent produces a different diff | "Expected. The gate is deterministic, the worker isn't. Green verify is the criterion." |
| An agent edits the test to make it pass | Stop the room. Real failure mode, and `prompts/fix.md` forbids it by name. Best teaching moment available. |
| `npm run verify` is red before they start | Leftover edit. `git checkout app/ test/`. |
| The room finishes early | Point them at `prompts/build.md` and the open question in delta A: pick an answer for `max_price=0` and see what the build does with it. |
| Somebody asks how long the feature build took | Be honest: minutes, not seconds, and long enough that running it live in a 45-minute session is a bad bet. That is why the CI run was done beforehand. |

## Running the loop in CI — what's left to do

Two workflows are wired and both are **off until someone adds a secret**, which is deliberate: a repo that can open pull requests on its own should need a human to switch it on.

| Workflow | Trigger | What it does |
|---|---|---|
| `verify.yml` | every push and PR | The gate. Already running, ~11 seconds, no secret needed. |
| `bug-intake.yml` | an issue is opened or labelled | The bug path: classify, reproduce, fix, review, open a PR. |
| `feature-build.yml` | a delta lands on `main`, or manual | The feature path, starting *after* Gate 1 — because merging the delta is the approval. |

To switch the agent ones on, add your key once:

```bash
gh secret set ANTHROPIC_API_KEY --repo raunakkathuria/adlc
```

Then trigger the feature build deliberately, **well before the session**:

```bash
gh workflow run feature-build.yml --repo raunakkathuria/adlc
gh run watch --repo raunakkathuria/adlc
```

**Do not run this live in the room.** The local run of the same prompt took roughly 50 minutes. A feature build is minutes-to-tens-of-minutes work, and a spinner in front of an audience is the exact failure mode the rest of this design avoids. Run it beforehand, then walk the finished run and the pull request it opened. The Actions tab with a real green run is more convincing than watching one start.

If someone asks why the demo wasn't live: say that, plainly. It is a more useful answer than a staged one.

## Resetting between runs

```bash
git checkout main && git checkout -- app/ test/ spec/ && npm run verify
```

Fourteen tests, nine requirements, green. That is the shipping state, with both defects live.

`spec/` is in that list on purpose. If anyone ran `prompts/build.md`, it folded the delta into `spec/catalog.md` and **deleted** `spec/changes/filter-catalog-by-price/` — correct behaviour, and it consumes Part 1's starting state. Restoring `app/` and `test/` alone leaves the delta directory gone and Part 1 unrunnable.

## Where the artifacts came from

`expected/` and `unattended/` are captured output from running the prompts here with Claude Code headless, not written by hand. Terminal output, diffs, and failure messages are real.

To regenerate any of them:

```bash
./run.sh prompts/verify.md spec/catalog.md
```

Worth doing before you run the session, for two reasons: the output will differ from what's committed, which is honest and worth showing, and it confirms your setup works on the day.

Two notes on the committed runs. They predate the rename to `adlc`, so a few stack traces show the old directory name — left alone deliberately, because editing a real transcript to look tidy is exactly what this repo's provenance claim rules out. And `--allowedTools` needs the prompt on **stdin**, not as an argument; passed as an argument it swallows the prompt as a list of tool names.

# ADLC — the design

**Repo:** `github.com/raunakkathuria/adlc` · **Status:** built and running — the line ships its own changes · **Last updated:** 3 September 2026

Not a demo, not a POC: a production-grade assembly line for software development that any team can adopt with minimal setup, and a repo that is itself the first consumer — its own issues run the line, its Actions history is the public proof. The reference is an internal system running this shape at company scale; this is the same line with the org-scale plumbing removed and nothing proprietary left in.

**Engineering philosophy: KISS, YAGNI, DRY — always.** Every decision below was made by those three rules. No configuration file. No knobs nobody asked to turn. One definition of every station.

---

## 1. The line

```
issue opened ──► TRIAGE ──► [bug? REPRODUCE] ──► SPEC PR ──► GATE 1 (human approves) ──► BUILD ──► impl PR(s)
                   │              │                                                          │
                   ▼              ▼                                              VERIFY GATE · REVIEW · DRIFT · QUALITY
             close: not     close: not                                                       │
             actionable     reproducible                                         GATE 2 (human merges each impl PR)
                                                                                             │
                                                                          all merged ──► spec PR merges · archive · issue closes
```

Fully automated from the moment an issue lands. Two human decisions, both native GitHub reviews. Everything else is a station or a guardrail, and every guardrail is run by something that did not do the work.

### The decisions that shape it (locked)

1. **Everything is spec-driven.** Bug or feature, every actionable change produces an OpenSpec delta and passes Gate 1. No policy knob — the spec *is* the pipeline's unit of work. A bug's spec is short: the corrected behaviour as a scenario, evidenced by the failing test from the reproduce station.

2. **The spec is a separate PR, and it merges last.** One issue → one spec PR → N implementation PRs. The spec PR is the shared artifact every implementation is built from and verified against — this is what lets a single spec fan out to web, mobile, and api repos. Gate 1 is an **approving review** on the spec PR, not a merge. The spec PR stays open while implementations are built and merged (Gate 2, one human merge per impl PR). When the last linked implementation PR merges, the line merges the spec PR automatically and runs `openspec archive` — no third human decision, because both accountable decisions already happened. `main`'s spec only ever describes what shipped.

3. **On/off is one switch.** A credential secret present → the line runs unattended, end to end. Absent → every workflow runs, explains itself, and stops (documentation mode). Either credential counts: `ADLC_API_KEY` for API billing, or `ADLC_OAUTH_TOKEN` — the output of `claude setup-token` — for a Claude subscription. Both are named for this line rather than for a vendor, because the key also authenticates against a gateway; `scripts/run-station.sh` maps them to whatever the pinned CLI reads, and it is the only file that names those.

4. **Hardcoded sane defaults, documented, not configured.** Loop cap: a station's findings can bounce work back **twice**; the third failure parks the issue (`needs-human`) with a comment summarizing every attempt, linking every run. Machine-filed issues (from verifier/quality findings outside spec scope) carry `origin:adlc` and run the line at **depth 1**: issues *they* would file park for a human instead. Both are constants in the workflows with a comment saying why — a future config file must be argued for by a real adopter, not anticipated (YAGNI).

## 2. Architecture — the hub is the example

GitHub **reusable workflows** (`workflow_call`), hosted in this repo, consumed two ways:

- **This repo** calls them by local path (`uses: ./.github/workflows/...`) — making it the complete, living example.
- **Adopting teams** call them by pinned tag (`uses: raunakkathuria/adlc/.github/workflows/build.yml@v1`) from thin caller workflows (~15 lines each: trigger + permissions + one `uses:` + `secrets: inherit`).

Team setup, in full: copy the caller files, add one credential org secret (`ADLC_API_KEY` or `ADLC_OAUTH_TOKEN`), done. Prompts and scripts arrive inside each reusable job via a checkout of this repo at the pinned tag, so consumer repos carry zero copied logic (DRY across the whole ecosystem) and upgrade by bumping the tag. Semver tags + CHANGELOG on this repo. A documented copy-in "eject" path exists for teams whose policy forbids external reusable workflows — escape hatch, not the path.

### Production-grade posture (non-negotiable, all stations)

- Issue/PR bodies are **data**: written to files and passed as paths, never interpolated into shell — the prompt-injection surface.
- Agent steps run with allowlisted tools only; third-party actions pinned by SHA; least-privilege `permissions:` per job; `timeout-minutes` on every agent job.
- Per-issue `concurrency` groups — an edited or reopened issue cannot spawn parallel lines.
- The classifier **fails closed**: an unparseable model response never creates work.
- The line opens PRs and (only for the spec, only at the end) merges the one PR both gates already approved. It never merges an implementation PR.

## 3. The stations

All stations read prompts from `prompts/` — one plain-markdown file per station, CLI-agnostic (Claude Code pinned in CI, in `scripts/run-station.sh`, which is also the provider seam: `ADLC_BASE_URL` and `ADLC_MODEL` point the line at any Anthropic-compatible gateway — see [any-model.md](any-model.md)). Buildwright's discipline (`.buildwright/steering/philosophy.md` — which already codifies KISS, YAGNI, DRY, fail-fast, TDD) governs the build station. OpenSpec owns the spec layer.

### `intake.yml` — triage + validation

Trigger: `issues: [opened, reopened]`, or dispatched with an `issue_number` to re-run intake on an issue that is already open.

1. Label `state:triaging`. Classify (structured JSON, fail-closed): actionable? `type:bug|feature|chore|docs`?
2. **Not actionable** (question, duplicate, missing info, spam) → comment the reason, label `resolution:not-actionable`, close as *not planned*. Dedupe pass first: a match against an existing open issue links it instead; a match against a closed `resolution:not-reproducible` bug **reopens that issue** — recurrence is evidence, and the accumulated reports travel to the re-run.
3. **Bug** → reproduce station: the agent attempts a failing test that asserts the *correct* behaviour. Reproduced → the failing-test patch is attached to the run and linked on the issue; continue to spec. Not reproducible → full report on the issue (what was tried, environment, the test that unexpectedly passed), label `resolution:not-reproducible`, close as *not planned*. Reopening re-enters the line from triage.
4. **Actionable** → dispatch the spec station. Label `state:spec-draft`.

### `spec.yml` — the Planner

Trigger: dispatched by intake, dispatched by the verifier for a revision, or `/revise <what to change>` as an issue comment from someone with write access — the comment is both the trigger and the instruction, because the Planner reads the whole thread.

Writes `openspec/changes/<slug>/` (proposal, spec delta, design if needed, tasks) — **only** the change directory, never product code. Opens the **spec PR**, writes the `Relates to #N` trailer and the links block deterministically (workflow, not model). Two advisory review lenses (product, architect) post findings on the PR. Label `state:gate-1`.

```
<!-- adlc-links v1
spec_pr: <url>
openspec_change: openspec/changes/<slug>
implementation_pr: <url>          # repeatable; one line per impl PR as builds open them
-->
```

Later blocks win per field; `implementation_pr` accumulates. This block on the source issue is the only cross-station contract — every downstream station starts from the issue alone.

### Gate 1 — approve the intent

A human with write access submits an **approving review** on the spec PR. That review event (checked: approved state + approver permission + PR still contains only `openspec/changes/**`) triggers the build. The spec PR is **not merged** — it stays open as the shared reference. CODEOWNERS on `openspec/**` makes Gate 1 role-aware where teams want it.

### `build.yml` — the Executor

Trigger: the Gate 1 approval event. Branches from the spec PR head (the approved delta is the input), implements per buildwright discipline — tests first (red; a bug's attached reproduce patch is applied here), smallest green, refactor, docs, tick `tasks.md`. Never renegotiates the spec: gaps become findings routed to the Planner. Deterministic gate (`npm run verify`) must pass before any PR opens — red gate, no PR, report on the issue. Independent review (fresh session) lands in the PR body. Opens the **implementation PR**, appends `implementation_pr` to the links block, dispatches the verifier. Label `state:building` → `state:verifying`.

One repo today; the fan-out to N repos is a matrix over targets when a second repo exists — the links contract and finalize logic already handle N.

### `verifier.yml` — feature drift, independent

Trigger: dispatched with `issue_number` (also manually runnable). Reads the links block — its only input. Checks out the impl PR head, starts the app, and with **fresh context** (no session shared with Planner or Executor):

- **Spec intactness:** change directory present, every `tasks.md` box ticked, each requirement/scenario marked `satisfied | partial | missing` — after re-deriving expected behaviour from the spec *before* reading any code.
- **Drift both directions:** `missing` = required, not done; `extra` = done, no requirement asks for it. Extra routes to the spec — where the spec stayed silent, an implementation detail decided, and nobody chose it.
- **Live confirmation:** drives the running app; `FEATURE-IMPLEMENTED: YES` is earned from observed behaviour, never a paper tally.

Verdict trailers `SPEC-MATCH: COMPLETE|MISMATCH` + `FEATURE-IMPLEMENTED: YES|NO|N/A` as a comment review on the impl PR. Mismatches are never issues; fail routes to the **Planner** (spec gap comment on the issue), not the Executor. Confirmed bugs **outside spec scope** → deduped new issues, `origin:adlc` — which re-enter the line (depth 1).

### `quality.yml` — usability + accessibility

Trigger: dispatched by the verifier once the drift check passes, so Gate 2 sees the numbers · nightly against the default branch · on demand.

- **Deterministic:** Lighthouse accessibility and performance scores against thresholds set in the workflow — a breach fails the check.
- **Agentic — "don't make me think":** an agent fetches the running build's page, reads the served DOM, and drives the endpoints behind it, judging Krug-style heuristics: first-click clarity, labels that say what they do, feedback after actions, navigation that never strands. No browser drives it. That is one of the known gaps below. In-scope findings → PR review; out-of-scope confirmed problems → deduped `origin:adlc` issues.

### Gate 2 — ship it

A human merges each implementation PR, on green checks. Nothing else merges one, ever.

### `finalize.yml` — close the loop

Trigger: implementation PR merged. Reads the links block; if **all** `implementation_pr` entries are merged: merge the spec PR, run `openspec archive` (delta folds into the living spec), close the source issue with a summary, label `state:shipped`.

## 4. Labels — the factory floor display

Written only by the line, never by hand. Exactly one `state:*` at a time on the issue:

`state:triaging → state:spec-draft → state:gate-1 → state:building → state:verifying → state:quality → state:gate-2 → state:shipped`

Plus: `type:bug|feature|chore|docs` (from triage), `needs-human` (loop cap tripped — the parking comment is the handoff document), `resolution:not-actionable|not-reproducible` (closed verdicts), `origin:adlc` (machine-filed). The issue list *is* the dashboard; no other observability layer (YAGNI — a pipeline dashboard is what this becomes at org scale).

## 5. What was simplified from the internal system, and why it holds

| The internal system | Here | Why it holds |
|---|---|---|
| GitHub App + installation tokens + org rulesets | `GITHUB_TOKEN` + reusable workflows @tag | reusable workflows are GitHub's native cross-repo reuse; no App to install |
| Hub repos holding agents, queues, ADK runners | prompt files + agent CLI steps | fresh-context independence is the property; infrastructure isn't |
| Spec PR merges first (merge = Gate 1), impl follows | spec PR approved at Gate 1, merges **last** | one spec fans out to N impl PRs; `main` never carries an unshipped spec |
| LiteLLM proxy + model routing | one credential secret, plus two optional variables for a gateway | prompts stay CLI-agnostic, and `scripts/run-station.sh` is the only file naming a runner's variables |
| Vercel preview deploys | app runs in the runner | same property: verify/quality against the running PR head |
| A pipeline dashboard | labels + links block + run summaries | the issue thread is the dashboard |
| Figma visual-acceptance gate | out (YAGNI) | needs a design source; add when one exists |

### Known gaps, found by running it

The table above is what was simplified on purpose. These were found by putting a real issue through the line, and are open rather than decided. They are recorded here because **the line has nowhere else to keep them** — see the first one.

- **No backlog state. Filing an issue *is* starting the work.** `intake.yml` triggers on `issues: [opened]`, so an issue cannot be written down and deferred; triage runs immediately and closes anything that is not a single actionable change. `needs-human` parks machine-filed findings at depth 1, but a person cannot file-and-defer. This is not abstract: the attempt to record these very gaps as an issue was closed as not-planned, which is why they live in this file. For a team with a real backlog, decide this before adopting.
- **Nothing automated compares issue intent to delta scope.** The verifier checks spec against implementation, so a delta that under-specifies what the issue asked for passes it. Gate 1 and the two review lenses are the only guard; `prompts/spec.md`'s surface rule and the Product lens's "name the surface" question were added after a delta gave shoppers an API and no page.
- **Bot-opened PRs start no `pull_request` workflows**, so their `verify` run is held as `action_required` and the PR shows no check. Cosmetic: `build.yml` publishes its own `adlc/verify` commit status, and `finalize.yml` merges the spec PR or closes it as landed either way. It matters if an adopter makes either signal a *required* check, and the fix is not to swap one for the other: the `verify` check run is absent from the PRs the line opens, and the `adlc/verify` status is absent from the PRs a person opens, because `verify.yml` does not post it. Requiring either blocks the other kind. `callers/README.md` says so where an adopter will read it. The local driver inverts this exactly, and the pair is worth holding together: it pushes with the operator's own credentials, so `verify.yml` **does** run (`#101` carries `verify=pass` on both `push` and `pull_request`) — but the operator is then the PR's author, and GitHub refuses to let an author approve or request changes on their own PR. So a CI-opened PR can be approved and shows no check, and a locally-driven one shows checks and cannot be approved by the person who ran it. Gate 2 is unaffected either way, because it is a **merge** and not an approval. It bites only if an adopter makes an approving review a *required* check on implementation PRs: locally-driven work would then be unmergeable by the only person who can drive it. The driver's own review station is unaffected for a different reason — its findings land as a PR body or comment, never as a submitted review, so they never need approval rights.
- **Three stations the pipeline does not have yet**: a security-review gate, browser end-to-end checks in quality, and deploy. Each is independently shippable and each carries a real decision — whether a model may block a build, who owns the browser harness once there is one, and whether deploy belongs to the line at all. The reason browser checks are absent is *not* that they would be the repo's first dependency — `quality.yml` already fetches Lighthouse through `npx` and drives a real browser in CI, and `AGENTS.md`'s no-dependencies rule is scoped to the product, not to CI tooling. The honest reason is that nobody has built the station.
- **REQ-ORD-3 and the stock check disagreed for 27 days, and every test agreed with the code.** The requirement said an order over 20 units is rejected "regardless of stock", and its scenario said *when 21 units are ordered, the response is `422 {"reason":"over_limit"}`* — naming no SKU, so it quantified over every item. `app/server.mjs` checked stock first, so `PEN-1` (stock 8) answered `insufficient_stock` and the scenario's THEN was false for it. Both had been there since the first commit, `3a54e5d` on 8 August. It surfaced only because a fix elsewhere needed a case per rejection reason, and picking `MUG-1` for the `over_limit` case — one of the two SKUs where it is reachable — is the shape of walking past a contradiction. Routed to the Planner as #85 rather than settled at the keyboard, per `AGENTS.md`; the line closed it end to end, chose the reading where the cap wins, and caught a collateral break the change introduced in an unrelated REQ-ORD-9 test. Two things worth keeping from that run: the spec station's first attempt was refused by `openspec validate` for dropping an untouched scenario from a MODIFIED block — the gate held, and a re-run got it right — and the reproduce station had already committed to one reading of the ambiguity before Gate 1 ever saw it, which is worth watching when an issue is a genuine question rather than a defect.
- **A test can name a requirement and be unable to fail for it.** `req-coverage` reads the REQ id a test cites and nothing more — it says so itself. A test asserting that the post-order announcement matched `/3 items match/` was green forever, because the text was identical before and after the order it existed to detect. The gate cannot catch this by construction; the verifier did, by placing a real order and comparing the region's text either side of it. Treat a green coverage gate as "somebody wrote a test", never as "the behaviour is checked".
- **Two requirements can each be reasonable and jointly unsatisfiable.** A withdrawn delta's requirement (which claimed the id now held by REQ-CAT-7, since that delta never merged) asked for a concise announcement — how many items match, no per-item details — and its motivating case was a stock change, which alters neither the count nor anything the summary was allowed to carry. The contradiction survived two Gate 1 reviews and two review lenses, and only appeared when an implementation tried to satisfy both halves at once. `prompts/spec.md`'s "say how it composes" rule is about requirements meeting *existing* behaviour; nothing asks whether the requirements in one delta compose with each other.
- **Strict parsing of model output is where this line actually breaks.** Five separate failures, all the same shape: sound logic, and a reader too narrow about the *form* of what a station produced. A verdict whose trailers were indented read as no verdict, appended a MISMATCH, and sent a correct implementation back to the Planner. A findings line that was indented filed nothing, silently. A long `reason` truncated the JSON object it lived inside. Three of those prompts illustrated the very format their parser rejected. When adding a station, check its prompt's own example against its parser before anything else.
- **The recovery paths were the untested ones.** The happy path worked from the first run; everything that broke was the machinery for when something goes wrong — a station that had never executed (an `if` with no `fi`, which `actionlint` reported clean because shellcheck was absent), the build station unable to reuse its own PR on a rebuild, `type:*` and `resolution:*` labels accumulating instead of replacing, and an attempt budget spent by a line defect rather than by the work failing. Exercise the bounce-backs deliberately; they will not exercise themselves.
- **A guarantee does not follow its data, and a scope-out does not expire on its own.** Two shapes, both caught by the review lenses rather than by anything automatic. First: a delta wrote the search query into a new live region while `REQ-CAT-6` already required that same query be inert, and said nothing — the requirement was a mandatory read, nothing asked the Planner to carry it across. Second, subtler: the delta that hardened the empty-state message *did* enumerate the other rendering sites and scope them out, with a reason Gate 1 accepted — "their content comes from a fixed set of server-defined reasons, not from free-text user input". Sound then. It expired when a later delta made the item's own SKU the thing being routed through that message, and nothing asks whether an inherited exclusion still holds. `prompts/spec.md`'s rules 5 and 6 were extended for both. A lint over `app/` was considered and rejected: the confirmation banner is a two-hop sink, composed in `order()` and only becoming markup inside `note()`, where a rule keyed on `innerHTML` sees an opaque `${message}` — and `escapeHtml` is `s.replace`, so "wrap every interpolation" throws on every number. The honest limit is that neither rule finds a site the Planner has never been told about: it cannot read `app/`, and rule 6 catches the banner only because an earlier delta wrote the exclusion down.

- **A guard whose condition excluded the one case it most needed to cover.** `build.yml`'s "the line's own tools must be untouched" step was gated on `env.ADLC == '.adlc'`, and `.adlc` is only checked out when `github.repository != ADLC_REPO`. So for every adopter the guard ran, and when **adlc built adlc it was skipped entirely** — nothing stopped an Executor rewriting a station it was standing in, in the one repo where the stations live. Found by porting the guard to a local driver and asking why the CI version needed a condition at all. Now runs in both shapes. The shape of the bug is worth more than the fix: the condition was written to describe where the files *are*, and silently became a statement about when to bother checking.

- **Proof-of-red exists for bugs and not for features, and the review station cannot supply it.** A bug enters through `intake.yml`'s reproduce station, which proves the suite green, has an agent write a failing test, and ships `work/repro.patch` for `build.yml` to apply as the Executor's red test. A feature gets none of that: `prompts/build.md` rule 2 tells the Executor to watch its tests fail, and until now `## Output` only ever asked for the green run, so the evidence was never recorded anywhere. The obvious fix — have the code reviewer check the citation — is the wrong one, and a cross-vendor review of PR #101 demonstrated why: its single blocking finding was the missing citation, and the citation lives in the Executor's own prose, so a reviewer verifying it would inherit the author's framing of the whole change. `.buildwright/framework/tdd-evidence.md` calls itself judgment-class rather than a gate, which is consistent. So `## Output` now asks for the failing run and the human at Gate 2 reads it, and `prompts/review.md` says explicitly that proof-of-red is neither the reviewer's to check nor to request. **Open:** whether a deterministic version is worth building — a worktree at the base commit re-running the named tests. It was designed and then withdrawn as over-building: bugs are already covered, and it would have added two more machine keys to a convention where several are unread (below).

- **Half the machine-readable keys in the prompts were read by nothing.** `SPEC-MATCH`, `FEATURE-IMPLEMENTED` and `OUT-OF-SCOPE-FINDINGS` route real work. `QUALITY: PASS|FINDINGS` did not — and `prompts/quality.md` instructed the station to emit it as "the last line, exactly", which is the register of a contract. `APPROVE`/`REQUEST CHANGES` and `READY FOR GATE 1`/`NEEDS WORK` are also unparsed, but those prompts only ask for "one line … and why", which is a verdict for a human and promises nothing; they were left alone. `QUALITY:` was demoted to the same register, and `prompts/verify.md`'s claim that "a machine maps them to the PR review" was corrected — there is no `gh pr review` anywhere in the line; the verdict becomes a PR comment and a label transition. The rule this leaves behind: **an exact-shape instruction to a station is a promise, and the repo has to keep it.** Telling a model to emit a line nothing consumes trains it to produce ceremony, and the next reader cannot tell which keys are load-bearing.

- **The verdict parser takes the first match; the prompt asks for the last two lines.** `verifier.yml` reads `/^[ \t]*SPEC-MATCH:\s*(COMPLETE|MISMATCH)\s*$/m` without `/g`, so an earlier occurrence anywhere in the report wins. The prompt's own indented illustration is accidentally safe — it reads `COMPLETE|MISMATCH`, and the pipe fails the enum — but a report that mentions its own trailer in prose before emitting it would be read at that point instead. This is the sixth instance of the failure already recorded above as "strict parsing of model output is where this line actually breaks", and the first where the parser is too *loose* about position rather than too narrow about form.

- **The brake had no tests.** `scripts/attempts.mjs` decides whether a station tries again or parks for a human, and it was the only script in `scripts/` with no test file — `labels`, `links`, `file-findings`, `req-coverage` and `req-ids` all had one. Eleven cases now cover it, each a way to get the count silently wrong: a reset withdrawing what precedes it, only the *last* reset counting, one station consuming another's budget, another station's reset releasing this brake, the reset marker counting as an attempt (it shares a prefix with the attempt marker), and the off-by-one that makes the third attempt the one that parks. Another instance of "the recovery paths were the untested ones", and the least excusable, because the brake is what makes unattended operation safe to leave alone.

- **A rebuilt PR kept a review several builds out of date, and nothing noticed until a rebuild happened.** `build.yml` reuses an existing implementation PR by commenting, because `gh pr create` fails on a branch that already has one and an earlier run died there one step from the end. The local driver copied that faithfully. What neither did was replace the PR **body** — so the body keeps the *first* build's review while every later one accumulates as comments beneath it, and the body is what the Gate 2 reader looks at first. It surfaced the first time a change was actually rebuilt: PR #101's body still said "no independent review and no drift check ran" — true of the run that wrote it — while a comment below carried a later run's independent `APPROVE`. A PR contradicting itself about whether it had been reviewed is the worst possible artifact to hand a human gate. The local driver now edits the body as well as commenting; `build.yml` still does not, and that parity is recorded in `docs/before-production.md`. The general shape: a path that only executes on a *second* pass is untested by construction until something goes round twice.

- **A terse review is indistinguishable from a shallow one, and the prompt asks for terse.** `prompts/review.md` says "If the change is genuinely fine, say so in one line and stop. Do not manufacture findings to look thorough" — which is right, and the reviewer obeyed it. The artifact that reached Gate 2 was 75 bytes: `APPROVE — no actionable findings; npm run verify passes all 185 tests.` For a one-line change with six tests behind it that is probably the honest answer, and a cross-vendor reviewer reading a diff it did not write is exactly the check we wanted — but a reader cannot tell it apart from a skim, and "no findings" is the output a reviewer produces both when it looked hard and when it barely looked. The station already asks five questions in order; requiring a one-line answer to each, even when clean, would make the walk visible without inviting invented findings. **Open**, because it trades directly against the no-ceremony rule that produced the good behaviour in the first place — and because the same instruction is what stops a reviewer padding a report to look diligent.

- **Issues #53, #57 and #58 are closed unfixed**, and their detail lives only in those closed issues. #53 got 14 of 15 scenarios satisfied before stopping on the composition problem above; the ambiguity to settle first is whether "without reciting every displayed item's individual details" forbids naming the *one* item that changed. #57 (item SKU interpolated unescaped into `id`/`data-sku`) was fixed later, by REQ-CAT-10 and REQ-ORD-8 — the nightly quality run rediscovered it as #76 the day after it was closed unfixed, which is the clearest evidence in this repo that a standing quality station earns its keep. #58 (out-of-order search responses showing a stale result set) was fixed later, by REQ-CAT-8 — a stale response is now discarded on arrival. Its other half, a request per keystroke with no debounce, was ruled out deliberately rather than left undone: see REQ-CAT-7's scope note. The order-history surface — the same escaping gap on a third site — was scoped out of #76's delta with a stated reason, and out of the 09-02 delta before that. `prompts/spec.md`'s Rule 6 ("before you leave something out because an earlier change already left it out, read why") was added for exactly that pattern, but it is still unexercised: the surface was closed by hand as demo cleanup, not by a Planner reading the rule. #71 joins the list — the item list is rebuilt wholesale on each search, which can move a screen reader's place within it; the fix is to reuse a row that still matches, and proving that means asserting DOM node identity, which needs the browser checks this repo does not have.

## 6. Repo layout

```
adlc/
├── app/  test/                    # the product (tiny, zero-dependency) and its tests
├── openspec/                      # specs/ = living spec · changes/ = deltas in flight
├── .buildwright/                  # engineering discipline (KISS·YAGNI·DRY·TDD in steering/)
├── prompts/                       # one markdown file per station, CLI-agnostic
├── scripts/                       # run-station.sh (the provider seam) · links.mjs (the contract)
│                                   # req-coverage.mjs (the gate) · req-ids.mjs · lint-workflows.mjs · install-deps.sh
├── .github/workflows/
│   ├── verify.yml                 # deterministic gate, every push/PR — no model
│   ├── intake.yml  spec.yml  build.yml  verifier.yml  quality.yml  finalize.yml
│   └── callers/                   # the ~15-line files an adopting team copies
├── AGENTS.md                      # the standards; CLAUDE.md etc. are short pointers
└── README.md  CONCEPT.md  docs/   # adoption guide · architecture · this design
```

## 7. How it was built

Each phase landed working and demoable, and later phases never broke earlier ones. All five are done; the order is kept here because it is the part worth copying.

- **Phase 0 — foundation.** `openspec init` (specs and the gate moved into `openspec/specs/`), `buildwright init`, `verify.yml` carried over. Ended with a green gate reading OpenSpec and the loop runnable by hand.
- **Phase 1 — intake and spec.** `intake.yml`, `spec.yml`, the links contract, the label bootstrap. Ended with an issue (bug or feature) opening unattended into a validated, classified spec PR with advisory reviews on it.
- **Phase 2 — build.** The Gate 1 approval trigger, then `build.yml`. Ended with an approved spec PR producing an implementation PR, its review in the body, links complete.
- **Phase 3 — verifier.** Ended with a deliberately drifted implementation earning `SPEC-MATCH: MISMATCH` that named the requirement, a correct one earning `YES` from the running app, and an out-of-scope find filing an issue that re-entered the line.
- **Phase 4 — quality.** Ended with an implementation PR showing the drift verdict, the Lighthouse numbers, and usability findings before a human looked at it, and a threshold breach failing the check.
- **Phase 5 — finalize and adoption.** `finalize.yml`, the caller templates, the `v1` tag, the README rewritten around the line, the adoption guide. Ended with a stranger able to wire the line into their own repo.

## 8. Defaults

Loop cap **2** then park · machine-issue depth **1** · labels named as in §4 · marker `adlc-links v1` · agent CLI in CI: Claude Code via `claude -p`, pinned in `scripts/run-station.sh` and nowhere else (the plain CLI rather than the official action, which keeps the any-agent story honest) · Node 22 · spec branch `spec/<slug>`, implementation branch `impl/<slug>`.

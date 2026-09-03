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

3. **On/off is one switch.** A credential secret present → the line runs unattended, end to end. Absent → every workflow runs, explains itself, and stops (documentation mode). Either credential counts: `ANTHROPIC_API_KEY` for API billing, or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` for a Claude subscription. Nothing else to configure.

4. **Hardcoded sane defaults, documented, not configured.** Loop cap: a station's findings can bounce work back **twice**; the third failure parks the issue (`needs-human`) with a comment summarizing every attempt, linking every run. Machine-filed issues (from verifier/quality findings outside spec scope) carry `origin:adlc` and run the line at **depth 1**: issues *they* would file park for a human instead. Both are constants in the workflows with a comment saying why — a future config file must be argued for by a real adopter, not anticipated (YAGNI).

## 2. Architecture — the hub is the example

GitHub **reusable workflows** (`workflow_call`), hosted in this repo, consumed two ways:

- **This repo** calls them by local path (`uses: ./.github/workflows/...`) — making it the complete, living example.
- **Adopting teams** call them by pinned tag (`uses: raunakkathuria/adlc/.github/workflows/build.yml@v1`) from thin caller workflows (~15 lines each: trigger + permissions + one `uses:` + `secrets: inherit`).

Team setup, in full: copy the caller files, add one credential org secret (`ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`), done. Prompts and scripts arrive inside each reusable job via a checkout of this repo at the pinned tag, so consumer repos carry zero copied logic (DRY across the whole ecosystem) and upgrade by bumping the tag. Semver tags + CHANGELOG on this repo. A documented copy-in "eject" path exists for teams whose policy forbids external reusable workflows — escape hatch, not the path.

### Production-grade posture (non-negotiable, all stations)

- Issue/PR bodies are **data**: written to files and passed as paths, never interpolated into shell — the prompt-injection surface.
- Agent steps run with allowlisted tools only; third-party actions pinned by SHA; least-privilege `permissions:` per job; `timeout-minutes` on every agent job.
- Per-issue `concurrency` groups — an edited or reopened issue cannot spawn parallel lines.
- The classifier **fails closed**: an unparseable model response never creates work.
- The line opens PRs and (only for the spec, only at the end) merges the one PR both gates already approved. It never merges an implementation PR.

## 3. The stations

All stations read prompts from `prompts/` — one plain-markdown file per station, CLI-agnostic (Claude Code pinned in CI; swap is one line). Buildwright's discipline (`.buildwright/steering/philosophy.md` — which already codifies KISS, YAGNI, DRY, fail-fast, TDD) governs the build station. OpenSpec owns the spec layer.

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
| LiteLLM proxy + model routing | one credential secret | prompts stay CLI-agnostic; the swap is one line |
| Vercel preview deploys | app runs in the runner | same property: verify/quality against the running PR head |
| A pipeline dashboard | labels + links block + run summaries | the issue thread is the dashboard |
| Figma visual-acceptance gate | out (YAGNI) | needs a design source; add when one exists |

### Known gaps, found by running it

The table above is what was simplified on purpose. These were found by putting a real issue through the line, and are open rather than decided. They are recorded here because **the line has nowhere else to keep them** — see the first one.

- **No backlog state. Filing an issue *is* starting the work.** `intake.yml` triggers on `issues: [opened]`, so an issue cannot be written down and deferred; triage runs immediately and closes anything that is not a single actionable change. `needs-human` parks machine-filed findings at depth 1, but a person cannot file-and-defer. This is not abstract: the attempt to record these very gaps as an issue was closed as not-planned, which is why they live in this file. For a team with a real backlog, decide this before adopting.
- **Nothing automated compares issue intent to delta scope.** The verifier checks spec against implementation, so a delta that under-specifies what the issue asked for passes it. Gate 1 and the two review lenses are the only guard; `prompts/spec.md`'s surface rule and the Product lens's "name the surface" question were added after a delta gave shoppers an API and no page.
- **Bot-opened PRs start no `pull_request` workflows**, so their `verify` run is held as `action_required` and the PR shows no check. Cosmetic: `build.yml` publishes its own `adlc/verify` commit status, and `finalize.yml` merges the spec PR or closes it as landed either way. It matters only if an adopter makes the *workflow* a required check — require the status instead.
- **Three stations the pipeline does not have yet**: a security-review gate, browser end-to-end checks in quality, and deploy. Each is independently shippable and each carries a real decision — whether a model may block a build, whether the repo takes its first dependency, and whether deploy belongs to the line at all.
- **A test can name a requirement and be unable to fail for it.** `req-coverage` reads the REQ id a test cites and nothing more — it says so itself. A test asserting that the post-order announcement matched `/3 items match/` was green forever, because the text was identical before and after the order it existed to detect. The gate cannot catch this by construction; the verifier did, by placing a real order and comparing the region's text either side of it. Treat a green coverage gate as "somebody wrote a test", never as "the behaviour is checked".
- **Two requirements can each be reasonable and jointly unsatisfiable.** REQ-CAT-7 asked for a concise announcement — how many items match, no per-item details — and its motivating case was a stock change, which alters neither the count nor anything the summary was allowed to carry. The contradiction survived two Gate 1 reviews and two review lenses, and only appeared when an implementation tried to satisfy both halves at once. `prompts/spec.md`'s "say how it composes" rule is about requirements meeting *existing* behaviour; nothing asks whether the requirements in one delta compose with each other.
- **Strict parsing of model output is where this line actually breaks.** Five separate failures, all the same shape: sound logic, and a reader too narrow about the *form* of what a station produced. A verdict whose trailers were indented read as no verdict, appended a MISMATCH, and sent a correct implementation back to the Planner. A findings line that was indented filed nothing, silently. A long `reason` truncated the JSON object it lived inside. Three of those prompts illustrated the very format their parser rejected. When adding a station, check its prompt's own example against its parser before anything else.
- **The recovery paths were the untested ones.** The happy path worked from the first run; everything that broke was the machinery for when something goes wrong — a station that had never executed (an `if` with no `fi`, which `actionlint` reported clean because shellcheck was absent), the build station unable to reuse its own PR on a rebuild, `type:*` and `resolution:*` labels accumulating instead of replacing, and an attempt budget spent by a line defect rather than by the work failing. Exercise the bounce-backs deliberately; they will not exercise themselves.
- **Issues #53, #57 and #58 are closed unfixed**, and their detail lives only in those closed issues. #53 got 14 of 15 scenarios satisfied before stopping on the composition problem above; the ambiguity to settle first is whether "without reciting every displayed item's individual details" forbids naming the *one* item that changed. #57 (item SKU interpolated unescaped into `id`/`data-sku`) and #58 (no debounce or abort on the search fetch) are both real and both latent.

## 6. Repo layout

```
adlc/
├── app/  test/                    # the product (tiny, zero-dependency) and its tests
├── openspec/                      # specs/ = living spec · changes/ = deltas in flight
├── .buildwright/                  # engineering discipline (KISS·YAGNI·DRY·TDD in steering/)
├── prompts/                       # one markdown file per station, CLI-agnostic
├── scripts/                       # links.mjs (the contract) · req-coverage.mjs (the gate) · req-ids.mjs (id allocation) · lint-workflows.mjs
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

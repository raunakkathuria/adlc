# ADLC — production-grade open-source pipeline · design v2

**Repo:** `github.com/raunakkathuria/adlc` · **Status:** v2, decisions locked, awaiting go-ahead · **Date:** 2026-08-30

Not a demo, not a POC: a production-grade assembly line for software development that any team can adopt with minimal setup, and a repo that is itself the first consumer — its own issues run the line, its Actions history is the public proof. The internal Deriv system (core-automation + quality-automation) is the reference; this is the same line with the org-scale plumbing removed and nothing proprietary left in.

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

3. **On/off is one switch.** `ANTHROPIC_API_KEY` secret present → the line runs unattended, end to end. Absent → every workflow runs, explains itself, and stops (documentation mode). Nothing else to configure.

4. **Hardcoded sane defaults, documented, not configured.** Loop cap: a station's findings can bounce work back **twice**; the third failure parks the issue (`needs-human`) with a comment summarizing every attempt, linking every run. Machine-filed issues (from verifier/quality findings outside spec scope) carry `origin:adlc` and run the line at **depth 1**: issues *they* would file park for a human instead. Both are constants in the workflows with a comment saying why — a future config file must be argued for by a real adopter, not anticipated (YAGNI).

## 2. Architecture — the hub is the example

GitHub **reusable workflows** (`workflow_call`), hosted in this repo, consumed two ways:

- **This repo** calls them by local path (`uses: ./.github/workflows/...`) — making it the complete, living example.
- **Adopting teams** call them by pinned tag (`uses: raunakkathuria/adlc/.github/workflows/build.yml@v1`) from thin caller workflows (~15 lines each: trigger + permissions + one `uses:` + `secrets: inherit`).

Team setup, in full: copy the caller files, add the `ANTHROPIC_API_KEY` org secret, done. Prompts and scripts arrive inside each reusable job via a checkout of this repo at the pinned tag, so consumer repos carry zero copied logic (DRY across the whole ecosystem) and upgrade by bumping the tag. Semver tags + CHANGELOG on this repo. A documented copy-in "eject" path exists for teams whose policy forbids external reusable workflows — escape hatch, not the path.

### Production-grade posture (non-negotiable, all stations)

- Issue/PR bodies are **data**: written to files and passed as paths, never interpolated into shell — the prompt-injection surface.
- Agent steps run with allowlisted tools only; third-party actions pinned by SHA; least-privilege `permissions:` per job; `timeout-minutes` on every agent job.
- Per-issue `concurrency` groups — an edited or reopened issue cannot spawn parallel lines.
- The classifier **fails closed**: an unparseable model response never creates work.
- The line opens PRs and (only for the spec, only at the end) merges the one PR both gates already approved. It never merges an implementation PR.

## 3. The stations

All stations read prompts from `prompts/` — one plain-markdown file per station, CLI-agnostic (Claude Code pinned in CI; swap is one line). Buildwright's discipline (`.buildwright/steering/philosophy.md` — which already codifies KISS, YAGNI, DRY, fail-fast, TDD) governs the build station. OpenSpec owns the spec layer.

### `intake.yml` — triage + validation

Trigger: `issues: [opened, reopened]`.

1. Label `state:triaging`. Classify (structured JSON, fail-closed): actionable? `type:bug|feature|chore|docs`?
2. **Not actionable** (question, duplicate, missing info, spam) → comment the reason, label `resolution:not-actionable`, close as *not planned*. Dedupe pass first: a match against an existing open issue links it instead; a match against a closed `resolution:not-reproducible` bug **reopens that issue** — recurrence is evidence, and the accumulated reports travel to the re-run.
3. **Bug** → reproduce station: the agent attempts a failing test that asserts the *correct* behaviour. Reproduced → the failing-test patch is attached to the run and linked on the issue; continue to spec. Not reproducible → full report on the issue (what was tried, environment, the test that unexpectedly passed), label `resolution:not-reproducible`, close as *not planned*. Reopening re-enters the line from triage.
4. **Actionable** → dispatch the spec station. Label `state:spec-draft`.

### `spec.yml` — the Planner

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

Trigger: on the implementation PR (so Gate 2 sees the numbers) + nightly + on demand.

- **Deterministic:** axe-core + Lighthouse (accessibility and performance categories) against thresholds in the workflow — a breach fails the check.
- **Agentic — "don't make me think":** an agent drives the running PR build with Playwright and judges Krug-style heuristics: first-click clarity, labels that say what they do, feedback after actions, navigation that never strands. In-scope findings → PR review; out-of-scope confirmed problems → deduped `origin:adlc` issues.

### Gate 2 — ship it

A human merges each implementation PR, on green checks. Nothing else merges one, ever.

### `finalize.yml` — close the loop

Trigger: implementation PR merged. Reads the links block; if **all** `implementation_pr` entries are merged: merge the spec PR, run `openspec archive` (delta folds into the living spec), close the source issue with a summary, label `state:shipped`.

## 4. Labels — the factory floor display

Written only by the line, never by hand. Exactly one `state:*` at a time on the issue:

`state:triaging → state:spec-draft → state:gate-1 → state:building → state:verifying → state:quality → state:gate-2 → state:shipped`

Plus: `type:bug|feature|chore|docs` (from triage), `needs-human` (loop cap tripped — the parking comment is the handoff document), `resolution:not-actionable|not-reproducible` (closed verdicts), `origin:adlc` (machine-filed). The issue list *is* the dashboard; no other observability layer (YAGNI — Deriv's Supabase dashboard is what this becomes at org scale).

## 5. What was simplified from Deriv production, and why it holds

| Production (deriv-core) | Here | Why it holds |
|---|---|---|
| GitHub App + installation tokens + org rulesets | `GITHUB_TOKEN` + reusable workflows @tag | reusable workflows are GitHub's native cross-repo reuse; no App to install |
| Hub repos holding agents, queues, ADK runners | prompt files + agent CLI steps | fresh-context independence is the property; infrastructure isn't |
| Spec PR merges first (merge = Gate 1), impl follows | spec PR approved at Gate 1, merges **last** | one spec fans out to N impl PRs; `main` never carries an unshipped spec |
| LiteLLM proxy + model routing | one API key secret | prompts stay CLI-agnostic; the swap is one line |
| Vercel preview deploys | app runs in the runner | same property: verify/quality against the running PR head |
| Supabase pipeline dashboard | labels + links block + run summaries | the issue thread is the dashboard |
| Figma visual-acceptance gate | out (YAGNI) | needs a design source; add when one exists |

## 6. Repo layout

```
adlc/
├── app/  test/                    # the product (tiny, zero-dependency) and its tests
├── openspec/                      # specs/ = living spec · changes/ = deltas in flight
├── .buildwright/                  # engineering discipline (KISS·YAGNI·DRY·TDD in steering/)
├── prompts/                       # one markdown file per station, CLI-agnostic
├── scripts/                       # links.mjs (the contract) · req-coverage.mjs (the gate)
├── .github/workflows/
│   ├── verify.yml                 # deterministic gate, every push/PR — no model
│   ├── intake.yml  spec.yml  build.yml  verifier.yml  quality.yml  finalize.yml
│   └── callers/                   # the ~15-line files an adopting team copies
├── AGENTS.md                      # the standards; CLAUDE.md etc. are 3-line pointers
└── README.md  CONCEPT.md  docs/   # adoption guide · architecture · this design
```

## 7. Build order

Each phase lands working and demoable; later phases never break earlier ones.

- **Phase 0 — Foundation.** `openspec init` (migrate specs + gate to `openspec/specs/`), `buildwright init`, verify.yml carried over. Exit: green gate reading OpenSpec; loop runnable by hand.
- **Phase 1 — Intake + Spec.** `intake.yml` + `spec.yml` + links contract + label bootstrap. Exit: open an issue (bug or feature), get a validated, classified, spec PR with advisory reviews — unattended.
- **Phase 2 — Build.** Gate 1 approval trigger + `build.yml`. Exit: approve a spec PR, get an implementation PR with review in the body, links complete.
- **Phase 3 — Verifier.** Exit: a deliberately drifted implementation gets `SPEC-MATCH: MISMATCH` naming the requirement; a correct one earns `YES` from the running app; an out-of-scope find files an issue that re-enters the line.
- **Phase 4 — Quality.** Exit: impl PR shows drift verdict + axe/Lighthouse numbers + usability findings before a human looks; a threshold breach fails the check.
- **Phase 5 — Finalize + adoption.** `finalize.yml`, caller templates, v1 tag, README rewritten around the line with a committed reference run, docs/ adoption guide. Exit: a stranger can wire their repo in under ten minutes.

## 8. Defaults chosen (veto anytime)

Loop cap **2** then park · machine-issue depth **1** · labels named as in §4 · marker `adlc-links v1` · agent CLI in CI: Claude Code via `claude -p` (plain CLI over the official action — keeps the any-agent story honest) · Node 22 · spec PR branch `spec/<slug>`, impl branch `impl/<slug>` (single repo).

# AGENTS.md — how to work in this repo

This is the **only** instruction file here. `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/agents.mdc`, and `.github/copilot-instructions.md` are short pointers to this file, so every agent reads the same thing and there is nothing to keep in sync.

## What this is

An **assembly line for software development**: a GitHub issue goes in, a verified pull request comes out, and exactly two human decisions happen in between. The repo is both the line itself (reusable GitHub Actions workflows any repo can adopt) and its own first consumer — a small storefront (catalog and orders, in memory, zero dependencies) that ships through the line it demonstrates.

Engineering philosophy, always: **KISS, YAGNI, DRY** (see `.buildwright/steering/philosophy.md`). The app is deliberately tiny. The method is the deliverable.

## The spec is the source of truth

The living spec is [`openspec/specs/`](openspec/specs/) — one capability per directory ([`catalog/spec.md`](openspec/specs/catalog/spec.md), [`orders/spec.md`](openspec/specs/orders/spec.md)), managed with [OpenSpec](https://github.com/Fission-AI/OpenSpec). Requirements are numbered (`REQ-CAT-1`, `REQ-ORD-4`, …) and carry WHEN/THEN scenarios.

**A capability is a slice of the product, and the spec covers all of it** — the HTTP API *and* the page a person uses. Not a layer: there is no UI capability, because a requirement about what a shopper sees belongs with the behaviour it serves. In a larger org the API and the front end live in separate repos and each spec covers its own surface; here they are one repo, so one capability file covers both. A change that gives a user something must say what they see, not only what an endpoint returns — `npm run req-ids` guards id allocation across deltas in flight, but nothing but the spec guards this.

**If the code and the spec disagree, the code is wrong.** Fix the code, not the spec.

**Every change is spec-driven — bugs included.** A change starts as a delta in `openspec/changes/<slug>/` (proposal, spec delta, tasks), opened as a **spec PR**. A bug's delta is short: the corrected behaviour as a scenario, evidenced by a failing test from the reproduce station.

## The line

```
issue opened → triage → [bug? reproduce] → spec PR → GATE 1 (human approves) → build → impl PR(s)
                                                                                    ↓
                                                     verify gate · review · drift verifier · quality
                                                                                    ↓
                                                          GATE 2 (human merges each impl PR)
                                                                                    ↓
                                            all merged → spec PR merges · archive · issue closes
```

Fully automated from the moment an issue lands (when a credential secret is set — `ADLC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`; without either, every workflow explains itself and stops). Labels are written only by the line and show which station the work is at: one `state:*` at a time.

**The spec PR merges last.** Gate 1 is an *approving review* on the spec PR, not a merge — the PR stays open as the shared artifact every implementation is built from and verified against (one spec can fan out to several implementation PRs). When the last linked implementation PR merges, the line merges the spec PR and runs `openspec archive`. `main`'s spec only ever describes what shipped.

## The gate

```bash
npm run verify     # node --test  +  requirement coverage
```

Deterministic. No model in it. It must be green before you say you are done, and it runs in under a second, so run it often.

`npm run req-coverage` checks that every requirement in `openspec/specs/` is named by at least one test. It cannot check whether that test asserts the *right* thing — only that somebody wrote one. A requirement in an `openspec/changes/` delta is **known but not owed**: a test may name it — that is what makes an implementation PR's new tests legal — but it only starts owing one when that delta's `tasks.md` is **fully ticked**. A spec PR is therefore never red for describing work nobody has built, while a build that ticks every box and forgets the test is — and because the gate runs before the implementation PR opens, that costs no PR and no attempt. Archiving into the living spec makes the requirement owe a test permanently, like every other.

## Rules that must hold

- **Money is an integer in minor units.** `price` and `total` are cents. Never a float.
- **Every test names its requirement.** `test('REQ-ORD-3: ...')` — that string is what the coverage gate reads. A test that names no requirement is invisible to the gate.
- **Tests go through the API.** Use `withServer` from `test/helpers.mjs` and talk HTTP, the way the browser does. A test that reaches past the interface can pass while the product is broken.
- **Red before green.** A behaviour change starts with a test that fails for the right reason: write the test, watch it fail, then make it pass, then tidy. Never write the fix first and the test afterwards to match it — that is how tests end up agreeing with the code instead of with the product.
- **Smallest change that holds.** Fix the cause, not the symptom. If a one-line patch makes the test green but leaves the mechanism that produced the bug in place, it is the wrong patch.
- **Reject loudly.** Every rejection returns a status and a `reason`. No silent failures, no partial success.
- **No dependencies in the product.** Node's standard library only — `node:http`, `node:test`, `node:assert`.
- **A reproduction asserts the correct behaviour**, so it fails on today's broken build and passes once the bug is fixed. This is the single easiest thing to get backwards; [`prompts/reproduce.md`](prompts/reproduce.md) explains it at length.
- **Never renegotiate the spec while building.** A gap or contradiction found mid-build is a finding routed to the Planner, not a licence to improvise.

## Stations and roles

Each station is one prompt file with a fresh context, because a check that shares the context of the work it is checking is not a check.

| Role | Station | Prompt | Produces |
|---|---|---|---|
| — | Triage | [`prompts/triage.md`](prompts/triage.md) | actionable? `type:*`? — structured JSON, fails closed |
| **Executor** | Reproduce (bugs) | [`prompts/reproduce.md`](prompts/reproduce.md) | a **failing** test proving the bug is real — or a close-as-not-reproducible report |
| **Planner** | Spec | [`prompts/spec.md`](prompts/spec.md) | `openspec/changes/<slug>/` — the spec PR for Gate 1 |
| — | Spec review | [`prompts/spec-review.md`](prompts/spec-review.md) | two advisory lenses on the delta, before the human decides |
| **Executor** | Build | [`prompts/build.md`](prompts/build.md) | the approved delta implemented, tests first, `tasks.md` ticked |
| — | Review | [`prompts/review.md`](prompts/review.md) | independent findings on the diff, in the PR body |
| **Verifier** | Drift | [`prompts/verify.md`](prompts/verify.md) | drift both directions — missing *and* extra — plus `SPEC-MATCH` / `FEATURE-IMPLEMENTED` verdicts |
| — | Quality | [`prompts/quality.md`](prompts/quality.md) | usability ("don't make me think") and accessibility findings on the running app |

Run any station locally with `./run.sh prompts/<name>.md [target]` — the workflows in `.github/workflows/` append the identical target sentence, so a station sees the same text whether a person or CI invoked it. CI pins Claude Code in [`scripts/run-station.sh`](scripts/run-station.sh), which is also the provider seam: `ADLC_BASE_URL` and `ADLC_MODEL` point the line at any Anthropic-compatible gateway ([docs/any-model.md](docs/any-model.md)).

**Isolation is the design principle.** Planner and Executor share the same business context but never a session, so a plan cannot leak its assumptions into the build. The Verifier shares neither: it re-derives expected behaviour from the spec alone before it reads any code. Same reason a factory's quality inspector does not report to the line supervisor.

The Verifier's verdict routes the work — pass → Gate 2; fail → **back to the Planner**, not the Executor: if the spec was silent or wrong, more code will not fix it. A human asks for the same thing by commenting **`/revise <what to change>`** on the issue: the comment is both the trigger and the instruction, because the Planner reads the whole thread. It needs write access, and it revises the open spec PR rather than opening a second one. Findings outside the change's scope become new issues (labeled `origin:adlc`), which re-enter the line at triage.

## The two human gates

1. **Gate 1 — approve the intent.** A human with write access submits an approving review on the spec PR, while it contains only `openspec/changes/**`. An agent never approves a spec.
2. **Gate 2 — ship it.** A human merges each implementation PR, on green checks. The line opens implementation PRs; it never merges one.

Everything between the gates is the line's to run.

## Git

Conventional commits (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`), atomic, and stage only the files you changed — never `git add -A`. Spec branches are `spec/<slug>`; implementation branches are `impl/<slug>`.

**Merge commits only — squash and rebase are disabled on this repo, deliberately.** The line's bookkeeping depends on the spec PR's commits reaching `main` *inside* the implementation PR, after which GitHub marks the spec PR merged and `finalize` has nothing left to do. Squash and rebase both rewrite commit identity, so the spec branch stops being an ancestor of `main`: the delta then arrives twice by two different routes and the implementation PR conflicts add/add against files identical to its own. That is not a discipline to remember — the setting enforces it.

# AGENTS.md — how to work in this repo

This is the **only** instruction file here. `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/agents.mdc`, and `.github/copilot-instructions.md` are three-line pointers to this file, so every agent reads the same thing and there is nothing to keep in sync.

## What this is

A small storefront — a catalog and orders, in memory, zero dependencies — used to demonstrate a delivery loop where the spec is the source of truth and humans hold exactly two gates. The app is deliberately tiny. The method is the deliverable.

## The spec is the source of truth

[`spec/catalog.md`](spec/catalog.md) and [`spec/orders.md`](spec/orders.md) describe the behaviour this product owes its users, as numbered requirements (`REQ-CAT-1`, `REQ-ORD-4`, …) with WHEN/THEN scenarios.

**If the code and the spec disagree, the code is wrong.** Fix the code, not the spec.

A change to *behaviour* changes the spec first — a delta in `spec/changes/<name>/`, reviewed and merged by a human. That is gate 1. A change a rebuild from the spec alone would not lose — a bug fix, a refactor — needs no delta. The routing question is exactly that one: **would a rebuild from the spec alone lose this change?**

## The gate

```bash
npm run verify     # node --test  +  requirement coverage
```

Deterministic. No model in it. It must be green before you say you are done, and it runs in about a tenth of a second, so run it often.

`npm run req-coverage` checks that every requirement in `spec/` is named by at least one test. It cannot check whether that test asserts the *right* thing — only that somebody wrote one.

## Rules that must hold

- **Money is an integer in minor units.** `price` and `total` are cents. Never a float.
- **Every test names its requirement.** `test('REQ-ORD-3: ...')` — that string is what the coverage gate reads. A test that names no requirement is invisible to the gate.
- **Tests go through the API.** Use `withServer` from `test/helpers.mjs` and talk HTTP, the way the browser does. A test that reaches past the interface can pass while the product is broken.
- **Red before green.** A behaviour change starts with a test that fails for the right reason: write the test, watch it fail, then make it pass, then tidy. Never write the fix first and the test afterwards to match it — that is how the tests end up agreeing with the code instead of with the product.
- **Smallest change that holds.** Fix the cause, not the symptom. If a one-line patch makes the test green but leaves the mechanism that produced the bug in place, it is the wrong patch.
- **Reject loudly.** Every rejection returns a status and a `reason`. No silent failures, no partial success.
- **No dependencies.** Node's standard library only — `node:http`, `node:test`, `node:assert`. A new package means somebody at a workshop waits for an install.
- **A reproduction asserts the correct behaviour**, so it fails on today's broken build and passes once the bug is fixed. This is the single easiest thing to get backwards; [`prompts/reproduce.md`](prompts/reproduce.md) explains it at length.

## The loop

Each step is a separate prompt with a fresh context, because a check that shares the context of the work it is checking is not a check.

| Step | Prompt | What it produces |
|---|---|---|
| Classify | [`prompts/triage.md`](prompts/triage.md) | which process path an issue follows |
| Verify against spec | [`prompts/verify.md`](prompts/verify.md) | drift between spec and code |
| Reproduce | [`prompts/reproduce.md`](prompts/reproduce.md) | a **failing** test that proves the bug is real |
| Fix | [`prompts/fix.md`](prompts/fix.md) | the smallest change that turns it green |
| Review | [`prompts/review.md`](prompts/review.md) | findings on the fix — design, not just behaviour |

Run one with `./run.sh prompts/<name>.md`, which dispatches to whichever agent CLI you have.

## The two human gates

1. **Spec approval** — a human merges the spec delta. An agent never approves a spec.
2. **Production deploy** — a human ships it, on green gates.

Everything in between is the agent's to run.

## Git

Conventional commits (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`), atomic, and stage only the files you changed — never `git add -A`.

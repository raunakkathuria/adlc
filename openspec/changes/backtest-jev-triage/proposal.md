# Backtest Jev for typed issue triage

## Why now

Triage's JSON-then-prose contract has already parked correct verdicts in production: at least three verdicts were reached correctly but never applied, because the generated JSON was truncated before its closing brace. The current mitigation — keep free text outside the object — shrinks the blast radius, but the underlying shape is unchanged: a closed-set decision, expressed as generated text, reparsed by hand-written code. Before touching the live triage path, we need real accuracy data: does a model built to answer closed-set questions (Jev) actually call these already-decided historical issues correctly, and does its own confidence track being right or wrong? This delta specs that measurement tool, not the production switch — the issue is explicit that live routing does not change in this change.

## What changes for the user

The person operating this line (a maintainer, not a shopper) gains a repeatable backtest tool. Pointed at a reviewed set of past issues — each carrying the living spec and existing-issue state as it stood when that issue arrived — the tool asks Jev the same two independent questions intake would ask (`route`, `existing_issue_match`), combines the two answers using the policy already documented for production (open match → duplicate, not-reproducible match → recurrence, shipped match → already done, closed-not-planned doesn't block, otherwise `route` decides), and records the result. It retries a transient failure and parks — never guesses — a terminal one. Once every fixture has been scored, it produces one report: accuracy segmented by route, duplicate outcome, not-actionable reason, confidence band, latency and token cost; false-closure and false-forward-routing counts kept separate; two proposed confidence limits, closure's higher than forwarding's; and an explicit go or no-go call.

No shopper-facing behaviour changes anywhere in this delta. No live issue is relabeled, closed, reopened, or dispatched by this tool — that boundary is itself a requirement (`REQ-BKT-6`) written into this delta, not an incidental property of how the experiment happens to be run.

## New capability: `triage-backtest`

This doesn't fit under `catalog` or `orders` — it never touches the storefront. It also isn't a spec for the triage station's own judgment call: that decision is a model's, not a deterministic rule `npm run verify` can check, which is why `prompts/triage.md` carries triage's policy today and no spec file does. What's new and deterministic is the harness around that judgment call — building the request, combining two independent answers by a documented policy, retrying or parking on failure, and reporting — and that's what this capability covers. It stays worth having past this one backtest: if a later change ever puts Jev behind triage's live routing, this is the harness that would keep scoring it in shadow mode.

## Out of scope

- Replacing the reviewer, verifier, quality, reproduce, spec, or build agents.
- Replacing deterministic labels, attempt caps, validation, tests, or workflow gates.
- Choosing or enforcing a production confidence threshold. This delta records confidence per answer and has the report *propose* a derived pair of limits (`REQ-BKT-7`); wiring either number into a live decision is a later change.
- Everything under "Rollout if the backtest passes" in the issue — shadow mode, comparing against live triage, the feature flag, and removing the first-line JSON contract. Each is a separate change, gated on this backtest's go/no-go outcome.
- Modifying `prompts/triage.md` or `.github/workflows/intake.yml`. The current triage path stays in sole, unmodified control of live issues during the backtest.
- A UI or dashboard for the report. The report is a document a human reads, not a page anyone operates.

## Open question

Where does the report live, and in what form? The issue lists what it must contain (`REQ-BKT-7`) but not whether the tool itself writes a structured file (so a test can assert its required sections are present), or whether the tool only emits raw per-fixture results and a human writes the report from them. This delta assumes the former — `REQ-BKT-7` is written as a testable contract on a file the tool produces — but a human should confirm that's the intended deliverable before Gate 1, since the alternative changes what "the report" means for `tasks.md`'s verification step.

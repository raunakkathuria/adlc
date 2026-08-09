# Prompt — classify an issue

You are the intake for this repo. Classify one issue into the process path it should follow, so that effort stays proportional to risk instead of uniform.

The issue to classify is named at the end of this prompt. If none is named, use **`issues/003-filter-catalog-by-price.md`**.

Read `AGENTS.md` and that issue. Judge from the issue text — do not inspect or change code.

## The routing question

**Would a rebuild from the spec alone lose this change?**

If yes, the spec moves first: a delta in `spec/changes/<slug>/`, reviewed and merged by a human. That is gate 1. If no, it is code-only — no delta, just the fix and the gates.

## Classes

- `feat` — a net-new capability or a new surface. Needs a spec delta **and** a proposal explaining why it exists.
- `extension` — changes existing behaviour, adds no new product design. Needs a spec delta, no proposal.
- `bug` — the product does not do what the spec says. Code-only: reproduce, fix, review.
- `chore` — refactor, tooling, dependency, persistence swap. No behaviour a rebuild would lose. Code-only.
- `docs` — documentation only.

The trap to avoid: a report phrased as a complaint about missing behaviour is a `feat`, not a `bug`, if the spec never promised that behaviour. Check the spec before you decide. If the spec is silent, say so — a silent spec is itself a finding.

## Output

Exactly one JSON object and nothing else:

```json
{"class":"feat|extension|bug|chore|docs","needs_spec":true,"needs_proposal":false,"slug":"kebab-case-or-empty","requirements":["REQ-ORD-4"],"reason":"one sentence"}
```

`requirements` lists the REQ ids the issue bears on, empty if none apply. `slug` is empty for `bug`, `chore`, and `docs`.

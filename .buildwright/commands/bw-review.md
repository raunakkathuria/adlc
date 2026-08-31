---
name: bw-review
version: 0.0.19
description: Independent code + security review of a PR or the current changes. Adopts the staff-engineer and security-engineer personas; reports findings, does not modify code. Reused by /bw-work and /bw-ship.
---

# /bw-review — independent code + security review

Run a **review-only** pass — code **and** security — over a set of changes, without implementing or
shipping anything. Use it to review an existing PR (yours, a teammate's, or another agent's) or your
working changes before `/bw-ship`. It is the single home for the review logic that `/bw-work` and
`/bw-ship` delegate to (DRY).

**Independent by construction:** run it with fresh context — you are the reviewer, not the
implementer. Review only what changed; verify each issue is real and introduced by these changes.

**Judgment-class, report-only.** It never edits code and never merges. Findings are advice for a
human: a false positive is cleared by a logged override (`.buildwright/framework/findings.md`), and a
"before-production" concession is recorded there too. It is not a deterministic gate.

## Invocation

```
/bw-review                      # review the local diff (branch vs main, or working tree)
/bw-review <pr-number|pr-url>    # review a GitHub PR by its diff
/bw-review --comment            # (with a PR) post findings as PR review comments instead of only printing
```

## Phase 1: Resolve the target (what to review)

- **A PR** (number/URL given): fetch its diff and metadata —
  ```bash
  gh pr diff <pr>                       # the unified diff
  gh pr view <pr> --json title,body,files
  ```
  Optionally check it out (`gh pr checkout <pr>`) if running tools that need the tree.
- **Local changes** (no argument): the branch's diff against the base, else the working tree —
  ```bash
  git diff --name-only main...HEAD || git diff --name-only HEAD
  git diff main...HEAD               || git diff HEAD
  ```

Review **only** the changed lines and their blast radius — never the whole repo.

## Phase 2: Security review (Security Engineer persona)

Adopt `.buildwright/agents/security-engineer.md` (or `~/.claude/agents/security-engineer.md` for a
global install without a project `.buildwright/`).

- **Automated scans** (skip gracefully if a tool is absent): dependency vulnerabilities
  (`npm audit` / `cargo audit` / `pip-audit` / `go list -m -json all | nancy sleuth` …); secrets
  (API keys, tokens, private keys); SAST (`semgrep --config p/owasp-top-ten .`).
- **Manual, phased:** repository context → comparative analysis (does the change follow or weaken
  existing controls?) → OWASP Top 10 (A01–A10) over the changed code. Watch financial-code risks
  (floating point for money).
- **Critical vulnerability → stop and report** (no auto-fix; needs human judgment).

## Phase 3: Code review (Staff Engineer persona)

Adopt `.buildwright/agents/staff-engineer.md` (or the global path as above).

- **Phased:** repository context → comparative analysis (pattern fit; reuse over reinvention;
  DRY/YAGNI) → issue assessment. For each candidate issue, verify it is real and **introduced** by
  these changes; assign confidence and **report only ≥ 80**.
- Cover the persona's "In Code" checklist — logic errors, edge cases, error handling, complexity,
  missing validation, missing tests/docs, and (per `framework/tdd-evidence.md`) **new/changed tests
  with no cited red** unless declared characterization guards.

## Phase 4: Report

Emit one consolidated result — security then code — each with a verdict and findings
(severity · file:line · why it matters · suggested fix · confidence). With `--comment` on a PR, post
them as review comments; otherwise print them. State clearly:

- **PASS** — no blocking findings; safe to proceed / merge (a human still merges).
- **BLOCKED** — blocking security or code findings; route back to the implementer, or clear a genuine
  false positive with a logged override (`framework/findings.md`).

Never modify code and never merge — this command only reviews.

---
name: bw-ship
version: 0.0.19
description: Run full quality pipeline (verify → review) then commit, push, and create PR. Fails fast if any step fails.
arguments:
  - name: message
    description: Commit message (conventional format). Required if there are uncommitted changes.
    required: false
---

## Ship Pipeline

This command runs the full quality pipeline before shipping.

Failure handling follows the single autonomy behaviour in
`.buildwright/framework/autonomy.md` (context-inferred — no mode flag). Any
"acceptable for staging, fix before production" decision surfaced during review
is recorded per `.buildwright/framework/findings.md` (before-production class) so
it is not lost at release time.

```
┌─────────────────────────────────────────────────────────────┐
│                      SHIP PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. VERIFY (quick checks) ← fix & re-run                    │
│     └─ typecheck → lint → test → build                     │
│              │                                              │
│              ▼ PASS? Continue : Retry/STOP                  │
│                                                             │
│  2. REVIEW (/bw-review: security + code) ← No retry         │
│     └─ deps → secrets → OWASP → logic → patterns → quality │
│              │                                              │
│              ▼ PASS? Continue : STOP                        │
│                                                             │
│  3. RELEASE                                                 │
│     └─ commit → push → create PR                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Gate reuse (avoid redundant re-runs)

Steps 1–2 (Verify, Review) are the same gates `/bw-work` and
`/bw-verify` already run. When `/bw-ship` is chained after them in the same run,
re-running on unchanged code is pure waste. Before each gate, check the current
state:

```bash
git rev-parse HEAD
git status --porcelain
```

If this exact gate already passed **earlier in this run** at the same `HEAD` with
an identical working tree — e.g. `/bw-work` Phases 6–7 or `/bw-verify` just ran
it — **skip it and carry the prior result forward**, marking that step's box
`↺ REUSED (passed at <sha>)`. Run the gate normally when:

- the working tree changed since it last passed (`git status --porcelain` differs),
- you cannot confirm a prior pass in this run (e.g. `/bw-ship` invoked standalone
  after manual edits, or in a fresh session), or
- the gate previously failed.

When in doubt, run it — reuse is an optimization, never a reason to ship
unverified code.

---

## Step 1: Verify (Quick Checks) — fix and re-run until passing

Apply **Gate reuse** above before running.

Before verifying, confirm documentation reflects the changes being shipped.
Update affected README, docs, command text, API docs, examples, or CHANGELOG.
If no docs need updating, record why in the final report. Documentation is part
of done.

Run quick verification checks:

```bash
# Type check
# Lint
# Test
# Build
```

**If fails → Fix and re-run. Keep going while you are making progress.**
**If the same error repeats, or there is no diagnosable fix → Not making progress — handle failure (see below).**
**Do not loop indefinitely. When a gate stalls → Handle failure:**

Handle failure per the **Failure Handling** section below (context-inferred).

```
╔═══════════════════════════════════════════════════════════════╗
║  STEP 1: VERIFY                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Type Check:  ✅/❌                                            ║
║  Lint:        ✅/❌                                            ║
║  Tests:       ✅/❌                                            ║
║  Build:       ✅/❌                                            ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: PASS / RETRY / FAIL                                  ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Step 2: Review (security + code) — No retry (needs human judgment)

Run **`/bw-review`** over the diff being shipped — invoke the real command
(host-native command invocation, per `.buildwright/framework/capability.md`); do
not re-enact it from memory. It is the single home for the review logic (DRY),
adopting the security-engineer and staff-engineer personas and reporting both
security and code findings:

- **Security:** dependency vulnerabilities, secrets, OWASP Top 10, financial-code
  risks (each scan skipped gracefully when its tool is absent).
- **Code:** logic errors, edge cases, error handling, pattern fit, complexity,
  missing tests/docs, and un-cited red per `framework/tdd-evidence.md`
  (confidence ≥ 80).

Scope is the diff being shipped:

```bash
git diff main...HEAD   # or: git diff HEAD  (no main branch)
```

**No retry.** Security and code findings need human judgment. If `/bw-review`
reports blocking findings, **STOP** and handle it per the **Failure Handling**
section below (context-inferred); clear a genuine false positive with a logged
override (`.buildwright/framework/findings.md`). Where a host cannot invoke
`/bw-review` faithfully, fall back to adopting
`.buildwright/agents/{security-engineer,staff-engineer}.md` inline over the diff.

```
╔═══════════════════════════════════════════════════════════════╗
║  STEP 2: REVIEW (/bw-review)                                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Security (deps · secrets · OWASP):  ✅/❌                     ║
║  Code (logic · errors · patterns):   ✅/❌                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: PASS / BLOCKED                                       ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Step 3: Release

All checks passed. Now ship:

### 3.1 Stage Changes
```bash
git add [specific files you changed]  # NEVER git add -A
```

### 3.2 Commit
```bash
# Use provided message or generate from changes
git commit -m "$ARGUMENTS.message"
```

If no message provided and there are changes, generate a conventional commit message based on the changes.

### 3.3 Check for a remote

Push and PR both require a configured remote. Check first:

```bash
git remote
```

**If no remote is configured** (empty output), you cannot push or open a PR.
This is not a failure — the work is committed and verified locally. Stop here
and report the **No-remote outcome** (see below): the work is preserved on the
feature branch as a local commit, and the human can add a remote and push when
ready. Do **not** treat this as a `[FAILED]` ship.

### 3.4 Push
```bash
# Push to remote (only if a remote exists)
git push origin HEAD
```

### 3.5 Create PR
```bash
# Create the change request via your forge CLI
gh pr create --fill        # GitHub
# glab mr create --fill    # GitLab
```

If no forge CLI is available, provide the change-request (PR/MR) creation URL.

### No-remote outcome

```
╔═══════════════════════════════════════════════════════════════╗
║                  SHIPPED LOCALLY (no remote)                  ║
╠═══════════════════════════════════════════════════════════════╣
║  ✅ Verify / Review:  PASSED                                  ║
║  ✅ Commit:   [commit hash]                                   ║
║  ⏭ Push/PR:  SKIPPED — no git remote configured              ║
╠═══════════════════════════════════════════════════════════════╣
║  Next: add a remote (`git remote add origin <url>`),          ║
║  then `git push -u origin HEAD` and open a PR.                ║
╚═══════════════════════════════════════════════════════════════╝
```

Exit zero — quality passed and the commit is safe on the branch.

---

## Final Report

```
╔═══════════════════════════════════════════════════════════════╗
║                        SHIP COMPLETE                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✅ Verify:    PASSED                                         ║
║  ✅ Review:    PASSED                                         ║
║  ✅ Docs:      UPDATED / NOT APPLICABLE                       ║
║  ✅ Release:   SHIPPED                                        ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Commit:  [commit hash]                                       ║
║  Branch:  [branch name]                                       ║
║  PR:      [PR URL]                                            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Quality gates will run in CI.                                ║
║  PR ready for team review when all gates pass.                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Failure Handling

Infer the execution context per `.buildwright/framework/autonomy.md` — there is
no mode flag, and that doc is the single source for how interactivity is
detected and how each context behaves. The boxes and the failure-summary
template below are the `/bw-ship`-specific presentation of that behaviour.

### Interactive (a TTY is attached, no CI signal)

STOP and show the blocker:

```
╔═══════════════════════════════════════════════════════════════╗
║                      SHIP BLOCKED                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ❌ Failed at: [STEP NAME]                                    ║
║                                                               ║
║  Reason:                                                      ║
║  [Specific failure details]                                   ║
║                                                               ║
║  To fix:                                                      ║
║  [Actionable remediation steps]                               ║
║                                                               ║
║  After fixing, run /bw-ship again.                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### Unattended (`CI` / `GITHUB_ACTIONS` set, or no TTY)

Preserve completed work, surface the failure, and exit non-zero:

1. Stage and commit all completed work to the feature branch.
2. Check for a remote (`git remote`):
   - **Remote exists**: push the branch, then open a PR whose title is prefixed
     `[FAILED]` and whose body uses the failure summary template below.
   - **No remote**: skip push and PR — they are impossible. Print the failure
     summary (filled from the template) to the run output so the failure is
     still visible in logs. The completed work remains as a local commit.
3. Exit with a non-zero code so CI/CD registers the failure.

### Failure summary template

Use this for the `[FAILED]` PR body (or the printed summary when no remote exists):

```markdown
## BUILDWRIGHT: Pipeline Failed

**Feature:** [name]
**Failed at:** [Verify / Review]
**Reason:** [Progress stalled / Critical vulnerability / Changes requested]

### Pipeline Status
| Step | Status | Details |
|------|--------|---------|
| Verify | [pass/fail] | [details] |
| Review | [pass/fail/skipped] | [details] |

### Completed Work
- [completed milestones/steps]

### Failure Details
- [error summary, specific findings, or review feedback]

### Skipped
- [steps blocked by the failure]

### To Resume
Fix the issue on this branch, then re-run the relevant command.
```

---

## Multi-Agent Safety

- Only commit files you modified
- Never use `git stash`
- Pull before push if needed
- Use atomic commits

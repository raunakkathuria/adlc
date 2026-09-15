# Before production

Decisions that are fine while the local driver is one hand-run command on one
machine, and must be resolved before it is trusted to run unattended or on a
repo you do not own.

## The self-build guard is off in CI

- **Ships now:** `local/build.mjs` guards `prompts`, `scripts`, `local`,
  `.github` and `package.json` against edits by the Executor.
- **Before production:** `build.yml`'s equivalent guard is gated on
  `env.ADLC == '.adlc'`, and `.adlc` is only checked out when
  `github.repository != ADLC_REPO`. **When adlc builds adlc, the CI guard does
  not run at all.** That is a gap in the line itself, independent of this
  driver, and it should be fixed upstream in `build.yml`.
- **Why now is OK:** locally driven builds carry the guard; a person triggers
  each run and reads the diff at Gate 2.

## The guard reads the working tree, not the commit

- **Ships now:** `git status --porcelain` over the guarded paths, checked after
  the Executor finishes.
- **Before production:** an Executor that *commits* its own edits to
  `prompts/` or `.github/` passes the guard. Compare the diff against the base
  commit rather than the working tree.
- **Why now is OK:** committing requires arbitrary execution, which
  `Bash(node:*)` already grants. The guard raises the cost of an accident, and
  is not a sandbox. Gate 2 is still a human reading a diff.

## No independent review on locally driven builds

- **Ships now:** the PR body carries the Executor's own report, labelled as a
  self-report, and the issue goes to `state:gate-2`.
- **Before production:** run `prompts/review.md` through the same `AGENT_CMD`
  seam **with a different vendor than the build used**, so the reviewer never
  saw the builder's session. That is the whole point of the driver and is the
  next milestone.
- **Why now is OK:** v1 deliberately proves the dispatch choreography first,
  and the PR body does not pretend a review happened.

## A re-run destroys an unfinished worktree

- **Ships now:** `git worktree remove --force` wipes
  `~/.adlc/worktrees/<slug>` at the start of every run.
- **Before production:** refuse to clobber a worktree with uncommitted changes
  unless asked, once more than one person or process can trigger a build.
- **Why now is OK:** one operator, one run at a time, and each build starts
  from the approved commit by design.

## No reproduce patch for bugs

- **Ships now:** for a bug that came through the reproduce station, the
  Executor writes its red test from the spec.
- **Before production:** read `repro_run` from the links block and apply the
  recorded patch, as `build.yml` does.
- **Why now is OK:** it is `build.yml`'s own documented degrade path, and the
  spec still describes the failing behaviour.

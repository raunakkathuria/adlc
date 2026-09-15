# Before production

Decisions that are fine while the local driver is one hand-run command on one
machine, and must be resolved before it is trusted to run unattended or on a
repo you do not own.

## ~~The self-build guard is off in CI~~ — fixed

`build.yml`'s guard was gated on `env.ADLC == '.adlc'`, so it never ran when
adlc built adlc. Now fixed in both drivers: CI checks the whole `.adlc`
checkout for an adopter and `prompts scripts local .github` for the line
itself; `local/build.mjs` does the same through `GUARDED_PATHS`.

## The gate's own definition is only guarded locally

- **Ships now:** `local/build.mjs` reads `scripts.verify` from `package.json`
  before and after the Executor and refuses to open a PR if it moved — a build
  that rewrites its own gate clears a gate that checks nothing.
- **Before production:** `build.yml` has no equivalent. `package.json` cannot
  simply be added to its path guard, because the reinstall-after-manifest-change
  step exists precisely so a delta *can* change the manifest. CI needs the same
  before/after comparison of the `verify` script.
- **Why now is OK:** the risk needs an Executor that both rewrites the gate and
  gets past a human reading the diff at Gate 2. Locally it is closed already.

## The guard reads the working tree, not the commit

- **Ships now:** `git status --porcelain` over the guarded paths, checked after
  the Executor finishes.
- **Before production:** an Executor that *commits* its own edits to
  `prompts/` or `.github/` passes the guard. Compare the diff against the base
  commit rather than the working tree.
- **Why now is OK:** committing requires arbitrary execution, which
  `Bash(node:*)` already grants. The guard raises the cost of an accident, and
  is not a sandbox. Gate 2 is still a human reading a diff.

## ~~No independent review on locally driven builds~~ — done

`prompts/review.md` now runs as a station, in a fresh session, by a vendor the
driver **requires** to differ from the builder's, and its findings are the PR
body. The driver refuses to start if it cannot show the two vendors differ, and
parks rather than opening a PR if the reviewer produces no verdict.

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

## `build.yml` still leaves a stale review in a rebuilt PR's body

- **Ships now:** `local/build.mjs` replaces the PR body as well as commenting
  when it reuses an existing implementation PR, so the body always carries the
  current run's review.
- **Before production:** `build.yml` only comments. A CI rebuild therefore keeps
  the first build's review as the body — which a Gate 2 reader takes as current —
  with later reviews accumulating as comments beneath it. Same one-line fix:
  `gh pr edit` alongside the existing `gh pr comment`.
- **Why now is OK:** the rebuild path needs a spec revision after an
  implementation PR is already open, which is rare, and the newest review is
  always present as the last comment.

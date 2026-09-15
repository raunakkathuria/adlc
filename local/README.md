# `local/` — the line, driven from your machine

**This is not a second line. It is a second driver for the same one.**

The stations live in `prompts/`, the state machine in `scripts/`, and the two human gates in the
labels on an issue. None of that is in here. What is in here is *dispatch*: the job
`.github/workflows/` does in CI — watch for a trigger, check a gate deterministically, move a
label, open a PR — done on a laptop instead.

Why bother: Actions authenticates the agent CLI from a secret and bills API tokens. If you are
already logged into `claude` or `codex` on your machine, those are seats you have already paid for.
That is the whole of it.

```bash
node local/build.mjs 42        # 42 = the approved spec PR number
```

## Two drivers, one state machine

|  | `.github/workflows/` | `local/` |
|---|---|---|
| Stations wired up | all six | **build and review only** |
| Trigger | GitHub events | you, by hand |
| Pays with | `ADLC_API_KEY` / `ADLC_OAUTH_TOKEN` | your CLI's own login |
| Repos | any adopter, via `callers/` | the one you are standing in |
| Reviewer's vendor | same CLI as the builder | **required to differ** |
| Runs unattended | yes | no — one run, then it exits |

Both write the same `state:*` labels, respect the same attempt caps, and read and write the same
links block. **The label is the claim, so do not run both drivers on one repo.** If a local run
goes wrong, re-enable CI and re-approve the spec PR: the work goes back to Actions with nothing
lost.

## The build station

A twin of `build.yml`, deliberately — the parts other code parses are copied, not reinterpreted:

- **Gate 1's fine print**, re-checked locally: the PR is open, its head is `spec/<slug>`, the slug
  is a safe name, it touches **only** `openspec/changes/`, its body records `Relates to #N`, the
  approver has **write access**, and the approval is on the **current head** (a `/revise` landing
  after an approval must not be built unapproved).
- The implementation is cut from the **approved commit**, not the branch tip, then `main` is merged
  in. It stays a merge: squash or rebase would break the ancestry Gate 2 relies on to mark the spec
  PR merged.
- `npm run verify` **before** the Executor as well as after. A base that is already red — `main`
  was red, or the merge produced it — would otherwise be blamed on a build that did nothing wrong,
  parking the issue and spending an attempt. If it is red the attempt is reset, because it never
  happened.
- The commit message and PR trailers Gate 1 and GitHub grep for; an existing open PR for the branch
  is reused rather than failing.
- Work happens in a git worktree under `~/.adlc/worktrees/<slug>`, never the checkout you are
  editing in another window.

## The review station

The reason to run this locally at all. `prompts/review.md` — the same station `build.yml` runs, not
a second definition — in a fresh session against the unstaged diff, **by a vendor that did not
build the change**:

```bash
AGENT_CMD='claude -p …'  REVIEW_CMD='codex exec --sandbox read-only'  node local/build.mjs 42
```

Its findings become the PR body. **The driver refuses to start if both stations resolve to the same
vendor** — a reviewer sharing the builder's vendor shares its blind spots, and a second vendor is
free when both are subscriptions you already hold. That is enforced, not left to memory:
`vendorOf()` compares the binary, so a full path and a bare name are the same vendor.

The reviewer never reads the Executor's own report. `prompts/review.md` says so, and the reason is
that an author's account of their change hands over its framing of what was hard, what was
deliberate, and what was "out of scope". The Executor's report stays in the worktree at
`work/build.md` for whoever wants it.

## What it does not do

- **No spec station.** The spec PR still comes from `spec.yml` or from you. Gate 1 is unchanged.
- **No verifier.** `verifier.yml` starts only on `workflow_dispatch` and nothing dispatches it here,
  so the issue goes to `state:gate-2` and **not** `state:verifying` — a label claiming a drift check
  nobody is running would be worse than no label. The PR body says so as well.
- **No quality or finalize.**
- **No reproduce patch.** For a bug that came through the reproduce station, the Executor writes its
  red test from the spec rather than applying the recorded patch.
- **No daemon, no polling, no config file, no multi-repo.** One run, one repo, by hand. A poll loop
  needs crash recovery, lock files and concurrency control, and none of that earns its keep until
  hand-running this is proven and annoying — at which point it is a `for` loop.

## Choosing the CLI

`AGENT_CMD` picks the builder and `REVIEW_CMD` the reviewer — `AGENT_CMD` is the same variable
`run.sh` already uses. The prompt arrives on **stdin**, so any CLI that reads stdin works:

```bash
AGENT_CMD='codex exec --sandbox workspace-write' node local/build.mjs 42
```

A harness that wants the prompt as an *argument* works too, because the command is evaluated by a
shell:

```bash
AGENT_CMD='some-other-harness --headless "$(cat)"' node local/build.mjs 42
```

Unset, the builder is `claude -p` with `build.yml`'s allowlist and the reviewer is
`codex exec --sandbox read-only`.

`stderr` is inherited rather than merged, which matters: `codex exec` puts its transcript on stderr
and only the final message on stdout, so the captured report is a review and not a file dump.

## Things that will surprise you

- **The default allowlist is not a sandbox.** `Bash(node:*)` is a full shell. It is the same list
  `build.yml` uses, and running a logged-in CLI on your own machine is the point — but if you want
  the agent contained, `codex exec --sandbox workspace-write` sandboxes and the default does not.
- **You cannot approve the PR it opens.** It pushes with your credentials, so you are the PR's
  author and GitHub will not let an author approve their own PR. This does not block anything —
  Gate 2 is a **merge**, not an approval — but it is the mirror image of CI, whose bot-opened PRs
  can be approved yet start no `verify` run. See `docs/design.md`.
- **Approving a spec PR fires CI.** `build.yml` triggers on `pull_request_review`, so if you approve
  a spec PR intending to build it locally, disable that workflow first or both drivers will race the
  same issue:
  ```bash
  gh workflow disable build.yml
  gh pr review <spec-pr> --approve
  node local/build.mjs <spec-pr>
  gh workflow enable build.yml
  ```
  Re-running the driver on an already-approved PR submits no review, so it does not need this.
- **The attempt cap is shared with CI.** Two automated round-trips per station per issue, then it
  parks — counted on the issue itself, so local runs and CI runs draw on the same budget.

## Naming

Three things in this repo are called some form of *verify*, and none of them is this: `verify.yml`
is the deterministic gate with no model in it, `verifier.yml` is the independent drift station, and
`npm run verify` is the command both run. The station in here is **review**.

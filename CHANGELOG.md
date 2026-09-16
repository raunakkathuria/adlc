# Changelog

Notable changes to the line. Adopting repos consume the stations by tag, so a version here is what a caller pins.

Semantic versioning, read from the adopter's side: a major bump means a caller file or a repo setting has to change, a minor bump adds a station or an input, a patch fixes a station without changing how it is called. The moving `v1` tag always points at the newest `v1.x.y`.

## Unreleased

### Fixed

- **`build.yml`'s "line's own tools must be untouched" guard never ran when adlc built adlc.** The
  step was gated on `env.ADLC == '.adlc'`, and `.adlc` is only checked out for an adopter repo — so
  on this repo the guard was skipped entirely and nothing stopped an Executor rewriting a station
  it was standing in. It now runs in both shapes: the whole `.adlc` checkout for an adopter, and
  `prompts scripts local .github` for the line itself. `package.json` is deliberately not guarded,
  because a delta may legitimately change the manifest — that is what the reinstall step is for.

### Changed

- **`prompts/review.md`: the reviewer must not read the Executor's own report.** `work/build.md`
  sits in the workspace and the review station's allowlist can open it. An author's account of
  their own change is the one input that makes a reviewer agree with it — it hands over the
  framing of what was hard, what was deliberate and what was "out of scope". The reviewer reads
  the diff and the spec.

### Fixed

- **A second cross-vendor review, of the first round of fixes, found the fixes had broken the
  driver outright.** A helper was renamed and one call site missed, so every successful build threw
  `ReferenceError` after pushing its branch and before opening its PR — with all 231 tests green,
  because they cover exported pure functions and never the orchestration between them. The
  reviewer's vendor is now resolved once, beside the check that proves it exists.
  - The verdict check accepted any occurrence of the words: `"do not APPROVE"`, a reviewer echoing
    its own instructions, and two contradictory verdicts all passed. It now requires exactly one
    anchored verdict line, the shape `verifier.yml` already uses.
  - `build.yml` implements both promises the shared prompts make — citations lifted into the commit
    and the verdict enforced before a PR — because a prompt that promises what its driver does not
    do is the failure this line keeps finding in itself.
  - The commit message travels as a file (`git commit -F`), removing the argv-limit failure class
    rather than capping it, and dropping the leading whitespace the old inline heredoc baked into
    every CI commit message.
  - Parking is once-only, and the boundary no longer claims no PR was opened — it also catches
    failures after one exists.
  - The vendor check requires exactly one vendor per station; an ambiguous command is refused.

- **Six findings from an independent cross-vendor review of the driver** (Codex reviewing Claude's
  code), each verified before acting on it:
  - **Git identity was configured after the merge that needs it.** `git merge` creates a commit, so
    on a machine with no global `user.name`/`user.email` it failed "Committer identity unknown" —
    and the driver reported that as a merge conflict. `build.yml` has always set identity first.
    The merge failure now carries git's own stdout and stderr, so a non-conflict is not dressed up
    as one.
  - **Failures could strand an issue at `state:building`.** The tools guard and the gate-definition
    guard exited without parking, and fetch, worktree creation, install, commit, push, links and the
    final label were uncaught. One boundary now parks anything unhandled once the issue is claimed.
  - **The proof of red was written and thrown away.** The Executor's failing output went to
    `work/build.md`, which lives in a throwaway worktree, is excluded from the commit and absent
    from the PR body — and the reviewer is forbidden to read it, so no human ever saw it. The
    Executor now emits `Red:`/`Characterization:` lines in `tdd-evidence.md`'s existing format and
    the driver lifts them into the commit message. Facts travel; narrative does not.
  - **An empty review passed as an independent review.** A reviewer exiting 0 having printed nothing
    yielded a PR body claiming it was reviewed. A report must now carry an `APPROVE` or
    `REQUEST CHANGES` verdict or the work parks.
  - **The different-vendor rule was bypassable.** Reading the first word made
    `npx @anthropic-ai/claude-code` look like "npx" — so claude could review claude — while
    `bash -lc '…'` collapsed genuinely different vendors together. The check now scans the whole
    command for a known vendor and refuses a command it cannot identify.
  - `docs/before-production.md` claimed local builds ship without independent review, which this
    branch implemented. A declared-deferrals list that is wrong is worse than none.

### Added

- `local/build.mjs` — the build station driven from your machine rather than from Actions, so it
  runs on a coding CLI you are already logged into instead of billing tokens against a secret. A
  twin of `build.yml` for the build station: the same Gate 1 fine print — including the approver
  having write access — the same implementation branch cut from the **approved** commit and merged
  with `main`, the same `npm run verify` gate before any PR, the same commit and PR trailers, the
  same attempt caps and links block. The work happens in a worktree under `~/.adlc/worktrees/`,
  never in your checkout.
  - `AGENT_CMD` selects the CLI, the same variable `run.sh` already uses; the prompt arrives on
    stdin, so nothing depends on slash-command expansion. Unset, it uses `claude -p` with
    `build.yml`'s tool allowlist.
  - One repo, one run, by hand. No daemon, no polling, no config file — a poll loop needs crash
    recovery, locks and concurrency control, and none of that earns its keep before hand-running
    this is proven.
  - Runs the gate **before** the Executor as well as after, and resets the attempt if it is
    already red: a red base is not the build's fault and must not park the issue or burn a try.
  - Guards the line's own `prompts/`, `scripts/`, `local/` and `.github/`. `package.json` is left
    alone so a legitimate manifest change still works; what is guarded instead is the gate's own
    definition — the `verify` script is compared before and after, because a build that rewrites
    it clears a gate that no longer checks anything.
  - **The review station runs too, with a different vendor than built the change** — the reason
    this runs locally at all. `REVIEW_CMD` runs `prompts/review.md` (the same station `build.yml`
    runs) in a fresh session against the unstaged diff, and its findings become the PR body. The
    driver refuses to start when both stations resolve to the same vendor: a reviewer sharing the
    builder's vendor shares its blind spots, and a second vendor is free when both are
    subscriptions already paid for. Defaults: builder `claude -p`, reviewer
    `codex exec --sandbox read-only`.
  - stderr is inherited rather than merged, because `codex exec` puts its transcript there and
    only the final message on stdout — so `tee` captures a review and not a file dump. No
    transcript parsing, no vendor-specific JSON.
  - Still not wired up locally, and the PR body says so rather than implying parity: no verifier
    dispatch (the issue goes to `state:gate-2`, not the `state:verifying` label that would claim a
    drift check nobody is running) and no reproduce patch applied for bugs. The spec, verifier,
    quality and finalize stations are unchanged in Actions.
  - Model output travels as a file to `--body-file`, and the agent streams through `tee` with
    stdout inherited, matching the workflows — nothing buffers an unbounded report in memory or
    passes it as an argv.

## v1.0.0 — 5 September 2026

The first tagged line: six reusable stations, two human gates, and the kit for wiring it into another repo.

### The stations

- `intake.yml` — triage, fail-closed, then the reproduce station that turns a bug report into a failing test
- `spec.yml` — the Planner drafts the delta and opens the spec PR; two advisory lenses review it
- `build.yml` — the Executor builds the approved delta, tests first, and opens no PR until the deterministic gate is green
- `verifier.yml` — the independent drift check, reporting missing *and* extra behaviour after re-deriving the feature from the spec
- `quality.yml` — Lighthouse thresholds, then the agentic usability and accessibility pass
- `finalize.yml` — folds the delta into the living spec and closes the issue once every implementation PR has merged

### Adopting

- Six thin callers in `.github/workflows/callers/`, pinned at `@v1` — you own no station logic
- Either `ADLC_API_KEY` or `ADLC_OAUTH_TOKEN` turns the line on; with neither, every workflow runs, explains itself, and stops. `ADLC_OAUTH_TOKEN` holds the output of `claude setup-token`; both are named for the line rather than for a vendor, and `scripts/run-station.sh` maps them to whatever the pinned CLI reads
- `ADLC_BASE_URL` and `ADLC_MODEL` repository variables point the line at any endpoint speaking the Anthropic messages API — LiteLLM fronting OpenAI, Gemini or Bedrock, or a model on your own hardware. Neither prompts nor workflows change; `scripts/run-station.sh` is the only file naming what the pinned CLI reads. Validated end to end against Gemini 2.5 Flash and gpt-5. See [docs/any-model.md](docs/any-model.md)
- Two `workflow_call` inputs on **verifier** and **quality**, `start_command` and `health_url`, because your app is not this repo's app
- Your dependencies are installed for you: `npm ci` where there is a lockfile, `npm install` where there is not
- A copy-in path for repos whose policy forbids calling external workflows

### Known gaps

Recorded in [docs/design.md](docs/design.md#known-gaps-found-by-running-it), and found by running the line rather than by reviewing it: there is no backlog state, nothing automated compares an issue's intent to the delta's scope, and three stations do not exist yet — security review, browser end-to-end checks, and deploy. The missing browser checks are the reason one accessibility finding (#71) is recorded rather than fixed.

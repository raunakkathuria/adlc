# Changelog

Notable changes to the line. Adopting repos consume the stations by tag, so a version here is what a caller pins.

Semantic versioning, read from the adopter's side: a major bump means a caller file or a repo setting has to change, a minor bump adds a station or an input, a patch fixes a station without changing how it is called. The moving `v1` tag always points at the newest `v1.x.y`.

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

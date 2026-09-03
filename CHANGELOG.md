# Changelog

Notable changes to the line. Adopting repos consume the stations by tag, so a version here is what a caller pins.

Semantic versioning, read from the adopter's side: a major bump means a caller file or a repo setting has to change, a minor bump adds a station or an input, a patch fixes a station without changing how it is called. The moving `v1` tag always points at the newest `v1.x.y`.

## v1.0.0 — 3 September 2026

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
- A copy-in path for repos whose policy forbids calling external workflows

### Known gaps

Recorded in [docs/design.md](docs/design.md#known-gaps-found-by-running-it), and found by running the line rather than by reviewing it: there is no backlog state, nothing automated compares an issue's intent to the delta's scope, and three stations do not exist yet — security review, browser end-to-end checks, and deploy.

# Tech

Node.js, no framework, no build step. ESM throughout (`.mjs` for scripts, `.js`
for tests). No dependencies — `package.json` has no `dependencies` or
`devDependencies` block, and `prompts/build.md` rule 6 forbids adding any.

## Commands

| Gate | Command | Notes |
|---|---|---|
| Test | `npm test` | `node --test 'test/*.test.js'` — the built-in runner |
| Verify | `npm run verify` | `lint` + `npm test` + `req-coverage`. **This is the deterministic gate the line runs.** |
| Coverage | `npm run req-coverage` | Every `REQ-*` in `openspec/specs/` must be named by a test, and every `REQ-*` a test claims must exist |
| Typecheck | SKIP | Plain JS, no TypeScript |
| Lint | `npm run lint` | `oxlint` via `npx --yes`, config in `.oxlintrc.json`, scoped to `local/ scripts/ test/`. **`no-undef` only** — it is here for dangling references, not style. Inside `npm run verify`, so it parks a build in both drivers. Separately, `npm run lint-workflows` validates the shell inside `.github/workflows/*.yml` |
| Build | SKIP | No build step |

## Testing conventions

- `node:test` + `node:assert/strict`. No test framework, no mocking library —
  **this repo mocks nothing.**
- The pattern for anything that shells out: **export the pure decision function
  and test that with plain data**; leave the `gh`/`git` call itself untested.
  `scripts/labels.mjs` exports `exclusive()`; `test/labels.test.js` calls it
  with arrays. Follow this.
- Tests of the line's own tooling (`labels`, `links`, `file-findings`,
  `req-coverage`, `callers`) carry no `REQ-*` id and are not expected to —
  `req-coverage` only requires that every requirement *in the spec* has a test.
- Fixtures live in `test/fixtures/`.
- Test titles state the behaviour, not the function name.

## Layout

- `app/`, `test/` — the demo storefront the line operates on
- `prompts/` — station prompts, deliberately vendor-neutral
- `scripts/` — the line's deterministic tooling (labels, attempts, links, coverage)
- `local/` — the local driver
- `.github/workflows/` — the CI driver
- `openspec/` — living spec and in-flight deltas, for the storefront only

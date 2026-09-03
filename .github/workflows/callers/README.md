# Adopt the line in your repo

Copy these six files into your repository's `.github/workflows/` directory (drop them in
as-is — the filenames matter, because the stations dispatch each other by filename), add one
Actions secret, and the line is on. Either credential works: `ANTHROPIC_API_KEY` for API
billing, or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` if you are on a Claude
subscription. Set both and the API key wins — that is the CLI's own precedence, not a rule this
line invents. Delete the secret and it is off — every workflow then explains itself and stops.

Each caller is a thin trigger that runs the real station from this repository at a pinned
tag. Upgrading the line is bumping `@v1` — you own no station logic.

Recommended repo settings (production hardening):

- Branch protection on your default branch. On GitHub Free this covers public repos only —
  a private repo needs Pro or above. Gate 2 holds without it either way, because no station
  ever merges an implementation PR; branch protection is the belt to that pair of braces.
- "Dismiss stale approvals" ON: a spec revision after verifier findings then re-requires
  Gate 1, which is exactly right. Reviewing at Gate 1 and want the delta changed first?
  Comment `/revise <what to change>` on the issue — that revises the open spec PR in place.
- CODEOWNERS on `openspec/**` if you want Gate 1 role-aware.
- Allow GitHub Actions to create pull requests (Settings → Actions → General).
- **Merge commits only** — turn off "Allow squash merging" and "Allow rebase merging"
  (Settings → General → Pull Requests). The line needs the spec PR's commits to reach your
  default branch *inside* the implementation PR; squash and rebase rewrite commit identity, so
  the spec branch stops being an ancestor and the two arrive as an add/add conflict instead.
- Prefer `ANTHROPIC_API_KEY` on a dedicated service account over a personal
  `CLAUDE_CODE_OAUTH_TOKEN`: the OAuth token is account-level, and every agent step's
  environment is readable by the tools that step allows. Same exposure path either way —
  different blast radius.

Your repo also needs: `openspec init` run once (the living spec in `openspec/specs/`), a
deterministic `npm run verify`, and prompts appended per station are read from this repo —
your product code never hosts the line's logic.

Two of the stations run your app rather than reading it, and your app is not this repo's app.
Set `start_command` and `health_url` on the **verifier** and **quality** callers to whatever
starts yours and whatever answers 200 once it is up; the station derives the base URL it hands
the agent from `health_url`, so there is no third value to set. Leave them out and the stations
try `node app/server.mjs` on `http://localhost:3000/api/items`, which is this repo's own app —
on yours the station fails with `The app did not come up.` and the line stops at
`state:verifying`.

Your dependencies are installed for you. The line runs `npm ci` where you have a lockfile and
`npm install` where you do not, before it runs your gate or starts your app — so a repo with
dependencies is not a special case.

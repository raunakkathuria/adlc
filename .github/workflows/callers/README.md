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
- Prefer `ANTHROPIC_API_KEY` on a dedicated service account over a personal
  `CLAUDE_CODE_OAUTH_TOKEN`: the OAuth token is account-level, and every agent step's
  environment is readable by the tools that step allows. Same exposure path either way —
  different blast radius.

Your repo also needs: `openspec init` run once (the living spec in `openspec/specs/`), a
deterministic `npm run verify`, and prompts appended per station are read from this repo —
your product code never hosts the line's logic.

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

- Branch protection on your default branch; nothing on the line ever merges an
  implementation PR — Gate 2 is a person, keep it that way.
- "Dismiss stale approvals" ON: a spec revision after verifier findings then re-requires
  Gate 1, which is exactly right.
- CODEOWNERS on `openspec/**` if you want Gate 1 role-aware.
- Allow GitHub Actions to create pull requests (Settings → Actions → General).

Your repo also needs: `openspec init` run once (the living spec in `openspec/specs/`), a
deterministic `npm run verify`, and prompts appended per station are read from this repo —
your product code never hosts the line's logic.

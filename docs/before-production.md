# Before production

Decisions that are fine for this repo (a workshop line, a demo storefront) but that an adopter
running the line on real work should resolve first. Format and rules: `.buildwright/framework/findings.md`.

## Agent-step credential blast radius

- **Ships now (workshop/demo):** every agent step receives both credentials as env vars, so a
  `CLAUDE_CODE_OAUTH_TOKEN` — an account-level subscription token — is readable by any subprocess
  the agent starts, including the `Bash(node:*)` / `Bash(npm:*)` tools some stations allow.
- **Before production:** prefer `ANTHROPIC_API_KEY` scoped to a dedicated service account, so a
  station that misbehaves cannot act as a person's whole Claude account. If the OAuth token is the
  only option, issue it from an account that owns nothing else.
- **Why the workshop is OK:** the exposure class is unchanged from the API key this replaces — same
  env placement, same allowlisted tools, same `.adlc/` tamper check — and the line runs on a demo
  repo. The difference is the *value* of the credential, not a new way to reach it.

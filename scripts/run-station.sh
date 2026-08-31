#!/usr/bin/env bash
# Run one station prompt through the agent CLI, unattended.
#
#   run-station.sh <prompt-file> <allowed-tools> [target-line]...
#
# The prompt file is the station's single definition — the same file a person runs locally with
# ./run.sh. This wrapper only appends the target lines (which issue, which change, which URL
# this run is about) and pins the tool allowlist. Target lines name FILES, never inline content:
# issue bodies are data on disk, not text in a shell command.
#
# The CLI is pinned here (Claude Code) for reproducible CI runs. The prompts are plain markdown
# with no vendor in them — swapping the runner is this one file.

set -euo pipefail

PROMPT="$1"
TOOLS="$2"
shift 2

# Either credential switches the line on, so both arrive as env vars — and a secret the repo does
# not have arrives as the empty string: present, but useless. Claude Code tries ANTHROPIC_API_KEY
# first, so an empty one would shadow a valid OAuth token. Unset is the only way to say "not this
# credential".
[ -n "${ANTHROPIC_API_KEY:-}" ] || unset ANTHROPIC_API_KEY
[ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] || unset CLAUDE_CODE_OAUTH_TOKEN

{
  cat "$PROMPT"
  if [ "$#" -gt 0 ]; then
    printf '\n'
    for line in "$@"; do
      printf '\n%s\n' "$line"
    done
  fi
} | claude -p --allowedTools "$TOOLS"

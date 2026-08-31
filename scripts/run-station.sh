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

{
  cat "$PROMPT"
  if [ "$#" -gt 0 ]; then
    printf '\n'
    for line in "$@"; do
      printf '\n%s\n' "$line"
    done
  fi
} | claude -p --allowedTools "$TOOLS"

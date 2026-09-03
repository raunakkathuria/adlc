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
#
# Another model, without touching a prompt or a workflow: point ADLC_BASE_URL at any gateway that
# speaks the Anthropic messages API (LiteLLM fronting OpenAI, Gemini, Bedrock, vLLM, a local model)
# and name that gateway's model in ADLC_MODEL. The credential secret then authenticates against the
# gateway rather than against Anthropic. docs/any-model.md has the worked setup.

set -euo pipefail

PROMPT="$1"
TOOLS="$2"
shift 2

# The provider seam, and the only place the runner's own variable names appear. ADLC_* is what the
# workflows pass; ANTHROPIC_* is what this particular CLI reads — its wire protocol, not a statement
# about which company serves the model.
if [ -n "${ADLC_BASE_URL:-}" ]; then export ANTHROPIC_BASE_URL="$ADLC_BASE_URL"; fi
if [ -n "${ADLC_MODEL:-}" ]; then export ANTHROPIC_MODEL="$ADLC_MODEL"; fi
if [ -n "${ADLC_API_KEY:-}" ]; then export ANTHROPIC_API_KEY="$ADLC_API_KEY"; fi

# A secret the repo does not have arrives as the empty string: present, but useless. The CLI tries
# the API key before the OAuth token, so an empty key would shadow a valid token — unset is the only
# way to say "not this credential". Nothing above exports an empty ADLC_API_KEY, so in CI this only
# has to clear what the surrounding environment brought; locally it leaves a real ambient key alone,
# which is how a station runs by hand with no ADLC_* set at all.
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then unset ANTHROPIC_API_KEY; fi
if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then unset CLAUDE_CODE_OAUTH_TOKEN; fi

{
  cat "$PROMPT"
  if [ "$#" -gt 0 ]; then
    printf '\n'
    for line in "$@"; do
      printf '\n%s\n' "$line"
    done
  fi
} | claude -p --allowedTools "$TOOLS"${ADLC_MODEL:+ --model "$ADLC_MODEL"}

#!/usr/bin/env bash
# Run one of the prompts in prompts/ with whichever agent CLI you have.
#
#   ./run.sh prompts/triage.md issues/003-filter-catalog-by-price.md   run it on a target
#   ./run.sh prompts/reproduce.md                                      no target — the prompt's default
#   ./run.sh --print prompts/verify.md openspec/specs/catalog/spec.md                 print it, paste it anywhere
#   AGENT_CMD='my-cli --headless' ./run.sh prompts/build.md
#
# The second argument is optional and is appended to the prompt as one line naming the target.
# Most stations need one — which issue to classify, which delta to build, which spec to verify —
# and each prompt states its own default for when you leave it off.
#
# CLI flags move between versions. If the invocation below is wrong for yours, set AGENT_CMD —
# the prompt is piped to it on stdin — or use --print and paste. The prompts are plain markdown;
# nothing here depends on a particular tool.

set -euo pipefail
cd "$(dirname "$0")"

print_only=0
if [ "${1:-}" = "--print" ] || [ "${1:-}" = "-n" ]; then
  print_only=1
  shift
fi

prompt_file="${1:-}"
if [ -z "$prompt_file" ]; then
  echo "usage: ./run.sh [--print] prompts/<name>.md [target]" >&2
  echo >&2
  echo "  target is optional — the issue, delta or spec this run is about." >&2
  echo "  Leave it off and the prompt uses its own stated default." >&2
  echo >&2
  echo "available prompts:" >&2
  for p in prompts/*.md; do echo "  $p" >&2; done
  exit 2
fi

if [ ! -f "$prompt_file" ]; then
  echo "no such prompt: $prompt_file" >&2
  exit 2
fi

prompt="$(cat "$prompt_file")"

# The target, if given, is appended as one line. One mechanism for every station, so nothing
# has to be templated into the prompts themselves.
target="${2:-}"
if [ -n "$target" ]; then
  if [ ! -e "$target" ]; then
    echo "no such target: $target" >&2
    exit 2
  fi
  prompt="$(printf '%s\n\nThe target for this run is `%s`.\n' "$prompt" "$target")"
fi

if [ "$print_only" -eq 1 ]; then
  printf '%s\n' "$prompt"
  exit 0
fi

if [ -n "${AGENT_CMD:-}" ]; then
  echo "→ $AGENT_CMD   (from \$AGENT_CMD, prompt on stdin)"
  printf '%s\n' "$prompt" | eval "$AGENT_CMD"
elif command -v claude >/dev/null 2>&1; then
  echo "→ claude"
  claude --permission-mode acceptEdits "$prompt"
elif command -v codex >/dev/null 2>&1; then
  echo "→ codex exec"
  codex exec "$prompt"
elif command -v gemini >/dev/null 2>&1; then
  echo "→ gemini"
  gemini --yolo --prompt "$prompt"
elif command -v cursor-agent >/dev/null 2>&1; then
  echo "→ cursor-agent"
  cursor-agent --force --print "$prompt"
elif command -v opencode >/dev/null 2>&1; then
  echo "→ opencode run"
  opencode run "$prompt"
else
  cat >&2 <<'EOF'
No agent CLI on PATH (looked for claude, codex, gemini, cursor-agent, opencode).

That's fine — every exercise works without one:

  • read the reference run for this step in artifacts/
  • or print the prompt and paste it into whatever you use:

      ./run.sh --print prompts/<name>.md
EOF
  exit 1
fi

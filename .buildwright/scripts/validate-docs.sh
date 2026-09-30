#!/usr/bin/env bash
# validate-docs.sh — checks that every bw-* command is documented in
# README.md and clawhub/buildwright/SKILL.md, and that every framework doc is
# listed in AGENTS.md, README.md, and clawhub/buildwright/SKILL.md.
# Run automatically by sync-agents.sh after each sync.
# Exit code 1 if any commands or framework docs are missing from documentation.

set -euo pipefail

COMMANDS_DIR=".buildwright/commands"
FRAMEWORK_DIR=".buildwright/framework"
README_MD="README.md"
AGENTS_MD="AGENTS.md"
CLAWHUB_SKILL="clawhub/buildwright/SKILL.md"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

if [ ! -d "$COMMANDS_DIR" ]; then
  echo "  validate-docs: $COMMANDS_DIR not found, skipping"
  exit 0
fi

# Only the Buildwright framework repo (which has cli/) documents commands and
# framework docs in these files. In a consuming project they belong to the
# host — skip.
if [ ! -d "cli" ]; then
  exit 0
fi

missing=0

for file in "$COMMANDS_DIR"/bw-*.md; do
  [ -f "$file" ] || continue

  # Extract name from YAML frontmatter
  basename=$(basename "$file")
  name=$(awk '/^---/{f=!f;next} f && /^name:/{print $2;exit}' "$file" 2>/dev/null | tr -d '\r')

  if [ -z "$name" ]; then
    echo -e "  ${YELLOW}validate-docs: $basename has no 'name' in frontmatter — skipping${RESET}"
    continue
  fi

  cmd="/$name"

  # An absent target is skipped, never reported as a pass — a ✓ for a file that
  # was never opened is a gate that has stopped biting.
  for target in "$README_MD" "$CLAWHUB_SKILL"; do
    [ -f "$target" ] || continue
    if ! grep -q "$cmd" "$target" 2>/dev/null; then
      echo -e "  ${RED}${BOLD}validate-docs: $cmd missing from $target${RESET}"
      missing=$((missing + 1))
    else
      echo -e "  ${GREEN}validate-docs: $cmd ($target) ✓${RESET}"
    fi
  done
done

for file in "$FRAMEWORK_DIR"/*.md; do
  [ -f "$file" ] || continue
  doc=$(basename "$file")

  for target in "$AGENTS_MD" "$README_MD" "$CLAWHUB_SKILL"; do
    [ -f "$target" ] || continue
    if ! grep -qF "$doc" "$target" 2>/dev/null; then
      echo -e "  ${RED}${BOLD}validate-docs: $doc missing from $target${RESET}"
      missing=$((missing + 1))
    else
      echo -e "  ${GREEN}validate-docs: $doc ($target) ✓${RESET}"
    fi
  done
done

if [ "$missing" -gt 0 ]; then
  echo ""
  echo -e "  ${RED}${BOLD}validate-docs: $missing documentation gap(s) found.${RESET}"
  echo -e "  Update the listed docs, then re-run the sync."
  exit 1
fi

#!/usr/bin/env bash
# validate-docs.sh — checks that every bw-* command is documented in README.md
# Run automatically by sync-agents.sh after each sync.
# Exit code 1 if any commands are missing from documentation.

set -euo pipefail

COMMANDS_DIR=".buildwright/commands"
README_MD="README.md"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

if [ ! -d "$COMMANDS_DIR" ]; then
  echo "  validate-docs: $COMMANDS_DIR not found, skipping"
  exit 0
fi

# Only the Buildwright framework repo (which has cli/) documents commands in
# its README. In a consuming project the README belongs to the host — skip.
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

  if [ -f "$README_MD" ] && ! grep -q "$cmd" "$README_MD" 2>/dev/null; then
    echo -e "  ${RED}${BOLD}validate-docs: $cmd missing from README.md${RESET}"
    missing=$((missing + 1))
  else
    echo -e "  ${GREEN}validate-docs: $cmd ✓${RESET}"
  fi
done

if [ "$missing" -gt 0 ]; then
  echo ""
  echo -e "  ${RED}${BOLD}validate-docs: $missing documentation gap(s) found.${RESET}"
  echo -e "  Update README.md, then re-run the sync."
  exit 1
fi

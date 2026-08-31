#!/bin/bash
# Buildwright hook installer
# Copies .buildwright/scripts/hooks/* to .git/hooks/ and makes them executable.
# Idempotent — safe to run multiple times.

set -e

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Not inside a git repository — skipping hook installation."
  echo "Run 'git init && bash .buildwright/scripts/install-hooks.sh' to enable auto-sync hooks."
  exit 0
fi

HOOKS_SRC="$(cd "$(dirname "$0")/hooks" && pwd)"
HOOKS_DEST="$(git rev-parse --show-toplevel)/.git/hooks"

if [ ! -d "$HOOKS_SRC" ]; then
  echo "Error: hooks source directory not found at $HOOKS_SRC" >&2
  exit 1
fi

if [ ! -d "$HOOKS_DEST" ]; then
  echo "Error: .git/hooks directory not found. Are you inside a git repo?" >&2
  exit 1
fi

for hook in "$HOOKS_SRC"/*; do
  name="$(basename "$hook")"
  dest="$HOOKS_DEST/$name"
  cp "$hook" "$dest"
  chmod +x "$dest"
  echo "  Installed: .git/hooks/$name"
done

echo "Buildwright hooks installed successfully."

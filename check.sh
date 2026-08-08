#!/usr/bin/env bash
# Pre-flight for the workshop. Installs nothing, changes nothing.

set -uo pipefail
cd "$(dirname "$0")"

fail=0

echo "ai-sdlc-workshop — pre-flight"
echo

if command -v node >/dev/null 2>&1; then
  version="$(node --version)"
  major="${version#v}"; major="${major%%.*}"
  if [ "$major" -ge 22 ]; then
    echo "  ✓ node $version"
  else
    echo "  ✗ node $version — this repo needs Node 22 or newer"
    fail=1
  fi
else
  echo "  ✗ node not found — install Node 22 or newer"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  if npm run verify --silent >/dev/null 2>&1; then
    echo "  ✓ npm run verify is green"
  else
    echo "  ✗ npm run verify failed — unexpected on a fresh clone. Run it directly to see why."
    fail=1
  fi
fi

found=""
for cli in claude codex gemini cursor-agent opencode; do
  if command -v "$cli" >/dev/null 2>&1; then
    found="$found $cli"
  fi
done

if [ -n "$found" ]; then
  first="${found# }"; first="${first%% *}"
  echo "  ✓ agent CLI:$found  → run.sh will use $first"
else
  echo "  · no agent CLI found. That's fine, it's optional — every exercise"
  echo "    works from the reference runs in artifacts/."
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "Ready. Open README.md and start at exercise 1."
else
  echo "Come anyway — the exercises work from artifacts/ without a working setup."
fi
exit "$fail"

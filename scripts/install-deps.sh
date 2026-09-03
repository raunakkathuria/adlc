#!/usr/bin/env bash
# Install the consuming repo's dependencies, before the line runs its gate or starts its app.
#
# This repo's product has none — `verify.yml` says so, deliberately — which is exactly why nothing
# needed this until someone else adopted the line and their first build died on "Cannot find
# module". The line runs an adopter's `npm test` and `npm run verify` and starts their app; all
# three need their dependencies present.
#
# `npm ci` is the reproducible install, but it requires a lockfile. Without one there is nothing to
# be reproducible about, so fall back — and pass --no-package-lock there, because writing a lockfile
# into the working tree would show up as a stray file to the spec station's guard and get staged by
# the build station's commit.
set -euo pipefail

if [ ! -f package.json ]; then
  echo "No package.json — nothing to install."
  exit 0
fi

if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  # `npm ci` refuses a lockfile that no longer matches package.json, which is exactly what an
  # Executor that adds a dependency without regenerating the lock produces. Falling back is the
  # recovery, and `npm install` updates the lock so the change ships with it rather than without.
  npm ci --no-audit --no-fund || {
    echo "::warning::npm ci refused the lockfile — it is out of sync with package.json. Falling back to npm install, which updates it."
    npm install --no-audit --no-fund
  }
else
  npm install --no-audit --no-fund --no-package-lock
fi

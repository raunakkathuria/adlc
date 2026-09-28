// Stage what the gate verified, and nothing that is the run's own scratch — one rule, both drivers.
//
// build.yml and local/build.mjs each staged the implementation with their own `git add`, and the
// copies had already drifted: CI left out work/, .adlc/ and node_modules/, the local driver only
// work/ and node_modules/. This is the one place that decides it now.
//
//   node scripts/stage-verified.mjs          stages the repository in the current directory

import { execFileSync } from 'node:child_process';

/** The run's own scratch: never part of an implementation, whether or not a repo ignores it. */
export const SCRATCH = ['work', '.adlc', 'node_modules'];

/**
 * Stage everything in `cwd` that the gate verified, and none of the scratch.
 *
 * Add everything, then take the scratch back out. Excluding it in the `add` itself
 * (`git add -A -- . ':!work'`) looks equivalent and is not: git refuses a pathspec that names an
 * ignored path and exits 1 — so it broke the moment this repo ignored work/, and in any adopter
 * whose ignored node_modules/ exists. `git reset` on a path that is not there is harmless.
 */
export function stageVerified(cwd) {
  // .adlc/ is a nested checkout, so the add briefly records it as an embedded repository; the reset
  // takes it straight back out, and the hint about it is only noise in the log.
  execFileSync('git', ['-c', 'advice.addEmbeddedRepo=false', 'add', '-A'], { cwd, stdio: 'pipe' });
  execFileSync('git', ['reset', '-q', '--', ...SCRATCH], { cwd, stdio: 'pipe' });
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) stageVerified(process.cwd());

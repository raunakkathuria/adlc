// A script started through a symlink must still run — the gate's scripts above all.
//
// Every script with a CLI guarded it with `import.meta.url === new URL(`file://${process.argv[1]}`).href`.
// import.meta.url is the module's real path; process.argv[1] is the path it was started by. Started
// through a symlink — macOS's /tmp and /var are both one — the two differ, the guard read false, and
// the script did nothing and exited 0. So req-coverage reported success without checking coverage,
// and review-verdict passed an empty review. Found by review of #114, on scripts/stage-verified.mjs.
// No caller in the line started a script that way yet; these tests are what keep it that way.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tempDir } from './temp-dir.mjs';

const root = join(import.meta.dirname, '..');
// The repository, reached through a symlink, the way an absolute path through /tmp reaches it.
const linked = join(tempDir('adlc-link-'), 'repo');
symlinkSync(root, linked);
const run = (script, ...args) => spawnSync('node', [join(linked, 'scripts', script), ...args], { cwd: root, encoding: 'utf8' });

test('main module: the coverage gate still checks coverage when started through a symlink', () => {
  const result = run('req-coverage.mjs');
  assert.match(result.stdout, /req-coverage: \d+ requirements/, 'it must actually run, not exit 0 having done nothing');
});

test('main module: an empty review is still refused when the verdict reader is started through a symlink', () => {
  const empty = join(tempDir('adlc-review-'), 'review.md');
  writeFileSync(empty, '');
  assert.equal(run('review-verdict.mjs', empty).status, 1, 'no verdict must fail, not pass as reviewed');
});

test('main module: the gate still runs when node keeps the symlink as the main path', () => {
  // With --preserve-symlinks-main (as a flag or in NODE_OPTIONS), import.meta.url is the symlink path,
  // not the real one — so a check that resolved only argv[1] read "not main" and did nothing.
  const result = spawnSync('node', ['--preserve-symlinks-main', join(linked, 'scripts', 'req-coverage.mjs')], { cwd: root, encoding: 'utf8' });
  assert.match(result.stdout, /req-coverage: \d+ requirements/);
});

test('main module: no script decides it is the main module by comparing raw paths any more', () => {
  const OLD = 'file://${process.argv[1]}';
  const files = [
    ...readdirSync(join(root, 'scripts')).filter((f) => f.endsWith('.mjs')).map((f) => `scripts/${f}`),
    ...readdirSync(join(root, 'local')).filter((f) => f.endsWith('.mjs')).map((f) => `local/${f}`),
  ].filter((f) => f !== 'scripts/is-main.mjs');
  const still = files.filter((f) => readFileSync(join(root, f), 'utf8').includes(OLD));
  assert.deepEqual(still, [], 'these still compare import.meta.url to an unresolved argv[1]; use scripts/is-main.mjs');
});

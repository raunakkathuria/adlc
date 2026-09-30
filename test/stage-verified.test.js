// Contract tests for staging the implementation — run against real git, in a scratch repository.
//
// Both drivers staged with `git add -A -- . ':!work' …`. Once this repo's .gitignore listed work/
// (4b423f8), git refused that pathspec — "The following paths are ignored by one of your .gitignore
// files" — and exited 1, so a green, reviewed build could not open its pull request (run
// 36384259133, #108). The same happens in any adopter repo whose ignored node_modules/ exists.
// Git's behaviour is the point, so these tests use git itself rather than a description of it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { stageVerified } from '../scripts/stage-verified.mjs';
import { tempDir } from './temp-dir.mjs';

// A repository with a committed product, then an Executor's change and every kind of scratch.
function workspace(gitignore) {
  const dir = tempDir('adlc-stage-');
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'test');
  writeFileSync(join(dir, '.gitignore'), gitignore);
  mkdirSync(join(dir, 'app'));
  writeFileSync(join(dir, 'app', 'index.html'), 'before\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  // The implementation: a changed file, a new file, and one whose folder happens to be named work.
  writeFileSync(join(dir, 'app', 'index.html'), 'after\n');
  writeFileSync(join(dir, 'app', 'new.js'), 'x\n');
  mkdirSync(join(dir, 'app', 'work'));
  writeFileSync(join(dir, 'app', 'work', 'real.js'), 'x\n');
  // The run's scratch: station output, installed dependencies, the line's own checkout.
  mkdirSync(join(dir, 'work'));
  writeFileSync(join(dir, 'work', 'build.md'), 'report\n');
  mkdirSync(join(dir, 'node_modules', 'dep'), { recursive: true });
  writeFileSync(join(dir, 'node_modules', 'dep', 'index.js'), 'x\n');
  // .adlc/ is an actions/checkout of the line — a repository with a commit, nested in this one.
  const adlc = join(dir, '.adlc');
  mkdirSync(adlc);
  const inAdlc = (...a) => execFileSync('git', a, { cwd: adlc, encoding: 'utf8' });
  inAdlc('init', '-q');
  writeFileSync(join(adlc, 'prompt.md'), 'x\n');
  inAdlc('add', '-A');
  inAdlc('-c', 'user.email=t@example.com', '-c', 'user.name=test', 'commit', '-q', '-m', 'line');
  return { dir, staged: () => git('diff', '--cached', '--name-only').split('\n').filter(Boolean).sort() };
}

const IMPLEMENTATION = ['app/index.html', 'app/new.js', 'app/work/real.js'];

test('staging: this repo, where /work/ and node_modules/ are ignored, stages the implementation', () => {
  const ws = workspace('/work/\nnode_modules/\n');
  stageVerified(ws.dir);
  assert.deepEqual(ws.staged(), IMPLEMENTATION);
});

test('staging: an adopter that ignores only node_modules/ still leaves every piece of scratch out', () => {
  const ws = workspace('node_modules/\n');
  stageVerified(ws.dir);
  assert.deepEqual(ws.staged(), IMPLEMENTATION);
});

test('staging: an adopter that ignores nothing still leaves every piece of scratch out', () => {
  const ws = workspace('');
  stageVerified(ws.dir);
  assert.deepEqual(ws.staged(), IMPLEMENTATION);
});

test("staging: this repo ignores only its top-level work/, never a product folder named work", () => {
  // `work/` in .gitignore matches a folder of that name at ANY depth, so app/work/ or docs/work/
  // would never be committed by either driver — silently. The scratch is the top-level folder.
  const ignored = (path) => {
    try { execFileSync('git', ['check-ignore', '-q', path], { cwd: join(import.meta.dirname, '..') }); return true; } catch { return false; }
  };
  assert.equal(ignored('work/build.md'), true, 'the station scratch is ignored');
  assert.equal(ignored('app/work/real.js'), false, 'a product folder named work is not');
});

test('staging: both drivers stage through this one rule, and neither excludes in the add', () => {
  // The two copies had drifted (CI left out .adlc/, the local driver did not) and broke together.
  const read = (path) => readFileSync(join(import.meta.dirname, '..', path), 'utf8');
  assert.match(read('.github/workflows/build.yml'), /node "\$ADLC\/scripts\/stage-verified\.mjs"/);
  assert.match(read('local/build.mjs'), /stageVerified\(tree\)/);
  for (const driver of ['.github/workflows/build.yml', 'local/build.mjs']) {
    assert.doesNotMatch(read(driver), /':!/, `${driver} excludes paths in a pathspec, which git refuses for ignored ones`);
  }
});

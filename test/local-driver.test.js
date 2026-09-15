// Contract tests for the local driver.
//
// local/build.mjs is a twin of .github/workflows/build.yml: the same Gate 1 fine print, the same
// branch choreography, the same PR conventions. A twin that drifts is worse than no twin — the
// strings asserted here are parsed by OTHER code (Gate 1 greps the PR body for "Relates to #N",
// GitHub closes the issue from "Closes #N", links.mjs keys off the same issue number), so they
// are contracts, not formatting.
//
// Following test/labels.test.js: the decision is a pure function called with plain data, and the
// gh call that produces that data is not tested. This repo mocks nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gate1, commitMessage, prBody, prepareImplBranch, GUARDED_PATHS, verifyScript, vendorOf } from '../local/build.mjs';

// A spec PR as `gh pr view --json state,headRefName,files,body` returns it.
const specPr = (over = {}) => ({
  state: 'OPEN',
  headRefName: 'spec/filter-catalog-by-price',
  files: [{ path: 'openspec/changes/filter-catalog-by-price/proposal.md' }],
  body: 'A spec delta.\n\nRelates to #4',
  ...over,
});

const SHA = 'a'.repeat(40);

// The last approving review, as gate1 receives it: which commit, and whether that person may write.
const approval = (over = {}) => ({ sha: SHA, login: 'a-maintainer', permission: 'write', ...over });

// --- Gate 1 fine print ---------------------------------------------------------------------------

test('gate1: an approved spec PR at its approved head is buildable', () => {
  const r = gate1(specPr(), approval(), SHA);
  assert.equal(r.ok, true);
  assert.equal(r.issue, '4');
  assert.equal(r.slug, 'filter-catalog-by-price');
});

test('gate1: a closed spec PR is not buildable', () => {
  const r = gate1(specPr({ state: 'MERGED' }), approval(), SHA);
  assert.equal(r.ok, false);
  assert.match(r.why, /not open/i);
});

test('gate1: only a spec/ branch is buildable — an impl branch is not a spec PR', () => {
  const r = gate1(specPr({ headRefName: 'impl/filter-catalog-by-price' }), approval(), SHA);
  assert.equal(r.ok, false);
  assert.match(r.why, /spec branch/i);
});

test('gate1: a slug that is not a safe change name is refused', () => {
  // The slug becomes a branch name and a path segment; "../" must never survive that.
  const r = gate1(specPr({ headRefName: 'spec/../../etc/passwd' }), approval(), SHA);
  assert.equal(r.ok, false);
  assert.match(r.why, /valid change slug/i);
});

test('gate1: a PR touching anything outside openspec/changes/ is not a pure spec PR', () => {
  // Gate 1 approves intent, not code. Code riding in on a spec PR would be built unreviewed.
  const pr = specPr();
  pr.files.push({ path: 'app/server.mjs' });
  const r = gate1(pr, approval(), SHA);
  assert.equal(r.ok, false);
  assert.match(r.why, /outside openspec\/changes/i);
});

test('gate1: a spec PR that records no source issue is refused', () => {
  // Every downstream station starts from the issue; without it the work is unroutable.
  const r = gate1(specPr({ body: 'A spec delta with no trailer.' }), approval(), SHA);
  assert.equal(r.ok, false);
  assert.match(r.why, /Relates-to/i);
});

test('gate1: Gate 1 approves a commit, so an approval behind the head is refused', () => {
  // /revise pushes to the same spec branch. Without this the tip moves under the build and
  // an unapproved delta gets implemented.
  const r = gate1(specPr(), approval(), 'b'.repeat(40));
  assert.equal(r.ok, false);
  assert.match(r.why, /approval is on/i);
});

test('gate1: a spec PR with no approving review at all is refused', () => {
  const r = gate1(specPr(), null, 'b'.repeat(40));
  assert.equal(r.ok, false);
  assert.match(r.why, /no approving review/i);
});

test('gate1: an approval from someone who cannot write to the repo is not Gate 1', () => {
  // This repo is public: anyone can submit an approving review. Without this check a drive-by
  // approval from a throwaway account starts a build on the operator's machine.
  const r = gate1(specPr(), approval({ permission: 'read' }), SHA);
  assert.equal(r.ok, false);
  assert.match(r.why, /write access/i);
});

test('gate1: every write-capable role a maintainer can hold is accepted', () => {
  for (const permission of ['admin', 'write', 'maintain']) {
    assert.equal(gate1(specPr(), approval({ permission }), SHA).ok, true, permission);
  }
});

// --- The strings other code parses ----------------------------------------------------------------

test('commitMessage: names the change and relates it to the source issue', () => {
  const m = commitMessage('filter-catalog-by-price', '4');
  assert.match(m, /^impl: filter-catalog-by-price/);
  assert.match(m, /Relates to #4/);
});

test('prBody: carries the trailers GitHub and Gate 1 read', () => {
  const b = prBody('the review findings', '4', 'codex');
  assert.match(b, /the review findings/);
  assert.match(b, /Closes #4/);
  assert.match(b, /Relates to #4/);
});

test('prBody: names the vendor that reviewed it, so the reader can see it was not the builder', () => {
  const b = prBody('findings', '4', 'codex');
  assert.match(b, /codex/);
  assert.match(b, /did not build this change/i);
});

test('prBody: still says plainly that no drift check ran', () => {
  // verifier.yml starts only on workflow_dispatch and nothing dispatches it here. Claiming a
  // review happened is now true; claiming drift was checked would not be.
  assert.match(prBody('findings', '4', 'codex'), /no drift check/i);
});

test('prBody: a huge report is truncated, because GitHub refuses a body over 65536 characters', () => {
  // Otherwise the branch pushes, then `gh pr create` 422s and the issue is stranded.
  const b = prBody('x'.repeat(200_000), '4', 'codex');
  assert.ok(b.length < 65_536, `body was ${b.length} characters`);
  assert.match(b, /Closes #4/, 'the trailers survive the truncation');
});

test('the tools guard covers the line\'s own machinery', () => {
  // .github/ matters because a workflow runs with the line's credentials once merged.
  for (const path of ['prompts', 'scripts', 'local', '.github']) {
    assert.ok(GUARDED_PATHS.includes(path), `${path} must stay guarded`);
  }
});

test('the tools guard deliberately leaves package.json alone', () => {
  // Freezing the whole manifest would block a legitimate dependency change and make the
  // reinstall-after-manifest-change step unreachable. The gate's definition is guarded instead,
  // by verifyScript — see below.
  assert.ok(!GUARDED_PATHS.includes('package.json'));
});

test('verifyScript: reads the command the deterministic gate actually runs', () => {
  // Compared before and after the build: an Executor that rewrites this clears a gate that no
  // longer checks anything.
  assert.equal(
    verifyScript('{"scripts":{"verify":"npm test --silent && npm run req-coverage --silent"}}'),
    'npm test --silent && npm run req-coverage --silent',
  );
});

test('verifyScript: a rewritten gate does not compare equal to the original', () => {
  const before = verifyScript(JSON.stringify({ scripts: { verify: 'npm test && npm run req-coverage' } }));
  const after = verifyScript(JSON.stringify({ scripts: { verify: 'true' } }));
  assert.notEqual(after, before, 'a self-clearing gate must be detectable');
});

test('verifyScript: a missing script or unparseable manifest reads as null, not a crash', () => {
  // Null on both sides compares equal, so a repo with no verify script is not falsely accused.
  assert.equal(verifyScript('{"scripts":{}}'), null);
  assert.equal(verifyScript('{}'), null);
  assert.equal(verifyScript('not json at all'), null);
});

// --- The reviewer must not be the builder ---------------------------------------------------------

test('vendorOf: reads the binary out of a station command', () => {
  assert.equal(vendorOf('claude -p --allowedTools "Read,Edit"'), 'claude');
  assert.equal(vendorOf('codex exec --sandbox read-only'), 'codex');
  assert.equal(vendorOf('cursor-agent --force --print'), 'cursor-agent');
});

test('vendorOf: an absolute path still names the vendor', () => {
  // AGENT_CMD may well be a full path; the rule compares vendors, not command strings.
  assert.equal(vendorOf('/Users/someone/.local/bin/claude -p'), 'claude');
});

test('vendorOf: the same vendor invoked differently is still the same vendor', () => {
  // This is the case the rule exists to catch — two claude commands that look unalike.
  assert.equal(
    vendorOf('claude -p --allowedTools "Read"'),
    vendorOf('claude -p --output-format json --model opus'),
  );
});

test('vendorOf: two different vendors do not collide', () => {
  assert.notEqual(vendorOf('claude -p'), vendorOf('codex exec'));
});

test('vendorOf: nothing at all reads as no vendor rather than throwing', () => {
  assert.equal(vendorOf(''), '');
  assert.equal(vendorOf(undefined), '');
});

// --- The branch choreography, against real git ----------------------------------------------------

test('prepareImplBranch: the implementation is cut from the APPROVED commit and merges main', () => {
  // Not the branch tip: a revision pushed after the approval must not ride in. And it must be a
  // MERGE, not a rebase or squash — Gate 2 marks the spec PR merged by ancestry.
  const dir = mkdtempSync(join(tmpdir(), 'adlc-impl-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();

  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'test');
  writeFileSync(join(dir, 'base.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');

  // The spec branch, approved at its first commit...
  git('checkout', '-qb', 'spec/thing');
  writeFileSync(join(dir, 'delta.txt'), 'delta\n');
  git('add', '-A');
  git('commit', '-qm', 'the approved delta');
  const approved = git('rev-parse', 'HEAD');

  // ...then revised afterwards. This commit is NOT approved and must not be built.
  writeFileSync(join(dir, 'delta.txt'), 'revised\n');
  git('add', '-A');
  git('commit', '-qm', 'a revision nobody approved');

  // main moves on too, and is what origin/main points at.
  git('checkout', '-q', 'main');
  writeFileSync(join(dir, 'tooling.txt'), 'newer tooling\n');
  git('add', '-A');
  git('commit', '-qm', 'main moves on');
  const mainSha = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/main', mainSha);

  prepareImplBranch(dir, 'thing', approved);

  assert.equal(git('rev-parse', '--abbrev-ref', 'HEAD'), 'impl/thing');
  const parents = git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ');
  assert.equal(parents.length, 3, 'a merge commit, so Gate 2 can mark the spec PR merged by ancestry');
  assert.equal(parents[1], approved, 'built from the approved commit, not the branch tip');
  assert.equal(parents[2], mainSha, 'with current main merged in');
  assert.equal(git('show', 'HEAD:delta.txt').trim(), 'delta', 'the unapproved revision did not ride in');
});

test('prepareImplBranch: a delta that conflicts with main parks instead of guessing a resolution', () => {
  // The line never resolves a conflict on its own — a wrong guess ships as an approved delta.
  // The message asserted here is what park() puts on the issue for the human who has to fix it.
  const dir = mkdtempSync(join(tmpdir(), 'adlc-conflict-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();

  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'test');
  writeFileSync(join(dir, 'shared.txt'), 'original\n');
  git('add', '-A');
  git('commit', '-qm', 'base');

  git('checkout', '-qb', 'spec/thing');
  writeFileSync(join(dir, 'shared.txt'), 'the delta edited this line\n');
  git('add', '-A');
  git('commit', '-qm', 'the approved delta');
  const approved = git('rev-parse', 'HEAD');

  git('checkout', '-q', 'main');
  writeFileSync(join(dir, 'shared.txt'), 'main edited the same line\n');
  git('add', '-A');
  git('commit', '-qm', 'main edits the same line');
  git('update-ref', 'refs/remotes/origin/main', git('rev-parse', 'HEAD'));

  assert.throws(
    () => prepareImplBranch(dir, 'thing', approved),
    /conflicts with origin\/main/,
  );
  // The failed merge must be backed out, or the worktree is left mid-conflict.
  assert.equal(git('ls-files', '--unmerged'), '', 'the merge was aborted, not left mid-conflict');
});

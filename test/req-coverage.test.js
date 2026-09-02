// Contract tests for the coverage gate's own arithmetic.
//
// Deliberately uses ids that do NOT match the REQ-<AREA>-<n> shape: this file is itself scanned
// by the gate, and a real-looking id here would be read as a requirement a test claims.
// Same reason test/links.test.js names no requirement.

import test from 'node:test';
import assert from 'node:assert/strict';
import { audit, tasksComplete, summarise, collect } from '../scripts/req-coverage.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const sets = ({ specified = [], known = [], tested = [] }) => ({
  specified: new Set(specified),
  known: new Set([...specified, ...known]), // the living spec is always known
  tested: new Set(tested),
});

test('coverage: a living-spec requirement with no test is uncovered', () => {
  const { uncovered } = audit(sets({ specified: ['LIVING-1'] }));
  assert.deepEqual(uncovered, ['LIVING-1']);
});

test('coverage: an in-flight delta requirement does not owe a test yet', () => {
  // The spec PR's whole content is the delta; its tests arrive with the implementation.
  const { uncovered, unknown } = audit(sets({ known: ['DELTA-1'] }));
  assert.deepEqual(uncovered, [], 'a delta-only requirement must not fail the gate');
  assert.deepEqual(unknown, []);
});

test('coverage: a test may cite an in-flight delta requirement', () => {
  const { unknown } = audit(sets({ known: ['DELTA-1'], tested: ['DELTA-1'] }));
  assert.deepEqual(unknown, [], 'the implementation PR names the delta it implements');
});

test('coverage: a test citing a requirement nobody specified is unknown', () => {
  const { unknown } = audit(sets({ specified: ['LIVING-1'], tested: ['LIVING-1', 'GHOST-1'] }));
  assert.deepEqual(unknown, ['GHOST-1']);
});

test('coverage: once archived into the living spec, the requirement owes a test', () => {
  const { uncovered } = audit(sets({ specified: ['DELTA-1'] }));
  assert.deepEqual(uncovered, ['DELTA-1'], 'finalize moving it into openspec/specs/ makes it owed');
});

// --- When a delta starts owing its tests -------------------------------------------------------
// A spec PR is nothing but the delta, so nothing is owed. Once the build has ticked every box,
// the work is claimed done and the tests must exist. This is the same condition the verifier
// requires for SPEC-MATCH: COMPLETE (prompts/verify.md), read deterministically and earlier.

test('coverage: a delta with nothing ticked owes no tests — the spec PR case', () => {
  assert.equal(tasksComplete('- [ ] 1.1 write the test\n- [ ] 1.2 make it pass\n'), false);
});

test('coverage: a partially ticked delta owes no tests — mid-build', () => {
  assert.equal(tasksComplete('- [x] 1.1 write the test\n- [ ] 1.2 make it pass\n'), false);
});

test('coverage: a fully ticked delta owes its tests', () => {
  assert.equal(tasksComplete('- [x] 1.1 write the test\n- [x] 1.2 make it pass\n'), true);
});

test('coverage: an uppercase tick counts as ticked', () => {
  // Not recognising `- [X]` would silently drop enforcement, which is the wrong way to be wrong.
  assert.equal(tasksComplete('- [X] 1.1 write the test\n- [x] 1.2 make it pass\n'), true);
});

test('coverage: indented, nested and asterisk-bulleted boxes count too', () => {
  assert.equal(tasksComplete('- [x] 1 parent\n  - [ ] 1.1 child\n'), false);
  assert.equal(tasksComplete('- [x] 1 parent\n  - [x] 1.1 child\n'), true);
  assert.equal(tasksComplete('* [x] 1.1 done\n* [ ] 1.2 not\n'), false);
});

test('coverage: a tasks file with no checkboxes owes nothing', () => {
  assert.equal(tasksComplete('all done, trust me\n'), false);
  assert.equal(tasksComplete(''), false);
});

// --- What the summary line claims ---------------------------------------------------------------
// It used to print the living-spec count, so a delta that was owed AND covered was reported as
// "9 requirements, all covered; 1 in flight" when ten had in fact been enforced.

test('coverage: the summary counts what was enforced, not just the living spec', () => {
  const line = summarise({ owed: new Set(['LIVING-1', 'DELTA-1']), inFlight: new Set() });
  assert.match(line, /2 requirements/);
  assert.doesNotMatch(line, /in flight/);
});

test('coverage: a requirement owing nothing yet is reported as in flight, not counted', () => {
  const line = summarise({ owed: new Set(['LIVING-1']), inFlight: new Set(['DELTA-1']) });
  assert.match(line, /1 requirement, all covered; 1 in flight/);
});

test('coverage: owed and in-flight are reported together when both exist', () => {
  const line = summarise({ owed: new Set(['LIVING-1', 'DELTA-1']), inFlight: new Set(['DELTA-2']) });
  assert.match(line, /2 requirements, all covered; 1 in flight/);
});

// --- collect() reads the tree it is pointed at -------------------------------------------------
// The `root` option exists so a consumer repo can run these scripts from its .adlc/ checkout and
// still audit its OWN spec. It was added and hand-verified once; this is the automated version,
// because a hand-verified option is an untested one.

const HERE = dirname(fileURLToPath(import.meta.url));
const TREE = join(HERE, 'fixtures/tree');
// Expected ids live in fixtures, not here: this file is scanned by the gate, so an id written
// in it reads as an id a test claims. The gate caught exactly that mistake while this was drafted.
const T = JSON.parse(readFileSync(join(HERE, 'fixtures/tree.expected.json'), 'utf8'));

test('coverage: collect reads the root it is given, not the one the script lives in', async () => {
  const found = await collect('openspec/specs', /^spec\.md$/, { recursive: true, root: TREE });
  assert.deepEqual([...found.keys()].sort(), T.ids);
});

test('coverage: collect obeys its filename pattern', async () => {
  // notes.md in the same directory names an id and must be ignored.
  const found = await collect('openspec/specs', /^spec\.md$/, { recursive: true, root: TREE });
  assert.ok(!found.has(T.notInSpecMd), 'only spec.md files are specification');
});

test('coverage: collect records where each id was found, relative to that root', async () => {
  const found = await collect('openspec/specs', /^spec\.md$/, { recursive: true, root: TREE });
  assert.deepEqual([...found.get(T.ordersId)], [T.ordersPath]);
});

// Contract tests for the coverage gate's own arithmetic.
//
// Deliberately uses ids that do NOT match the REQ-<AREA>-<n> shape: this file is itself scanned
// by the gate, and a real-looking id here would be read as a requirement a test claims.
// Same reason test/links.test.js names no requirement.

import test from 'node:test';
import assert from 'node:assert/strict';
import { audit } from '../scripts/req-coverage.mjs';

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

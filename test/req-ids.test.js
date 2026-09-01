// Contract tests for requirement-id allocation.
//
// Two Planners cannot see each other: each reads the living spec and picks "the next free
// number", so concurrent deltas raced for the same id (PR #21 claimed one PR #11 had already
// taken). This is the deterministic guard that makes that impossible to merge.
//
// Fixtures with realistic REQ ids live in test/fixtures/, not in this file: the coverage gate
// scans test/*.test.js for ids a test claims, and an id written here would read as such a claim.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSections, auditIds } from '../scripts/req-ids.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DELTA = readFileSync(join(HERE, 'fixtures/delta-sections.md'), 'utf8');
// Expected ids live beside the sample, for the same reason the sample does.
const EXPECTED = JSON.parse(readFileSync(join(HERE, 'fixtures/delta-sections.expected.json'), 'utf8'));

test('req-ids: a delta parses into its ADDED, MODIFIED and REMOVED ids', () => {
  const { added, modified, removed } = parseSections(DELTA);
  assert.deepEqual([...added], EXPECTED.added);
  assert.deepEqual([...modified], EXPECTED.modified);
  assert.deepEqual([...removed], EXPECTED.removed);
});

test('req-ids: adding an id the living spec already has is a collision', () => {
  const { collisions } = auditIds({
    living: new Set(['A-1']),
    deltas: [{ slug: 'one', added: new Set(['A-1']), modified: new Set(), removed: new Set() }],
  });
  assert.equal(collisions.length, 1);
  assert.match(collisions[0], /A-1/);
  assert.match(collisions[0], /one/);
});

test('req-ids: two deltas adding the same id collide — the case that shipped', () => {
  const { collisions } = auditIds({
    living: new Set(),
    deltas: [
      { slug: 'price-filter', added: new Set(['A-4']), modified: new Set(), removed: new Set() },
      { slug: 'label-input', added: new Set(['A-4']), modified: new Set(), removed: new Set() },
    ],
  });
  assert.equal(collisions.length, 1);
  assert.match(collisions[0], /price-filter/);
  assert.match(collisions[0], /label-input/);
});

test('req-ids: MODIFIED legitimately reuses a living id — never a collision', () => {
  const { collisions, unknown } = auditIds({
    living: new Set(['A-1']),
    deltas: [{ slug: 'one', added: new Set(), modified: new Set(['A-1']), removed: new Set() }],
  });
  assert.deepEqual(collisions, []);
  assert.deepEqual(unknown, []);
});

test('req-ids: modifying or removing an id nobody specified is unknown', () => {
  const { unknown } = auditIds({
    living: new Set(['A-1']),
    deltas: [{ slug: 'one', added: new Set(), modified: new Set(['GHOST-1']), removed: new Set(['GONE-1']) }],
  });
  assert.deepEqual(unknown.length, 2);
  assert.match(unknown.join(' '), /GHOST-1/);
  assert.match(unknown.join(' '), /GONE-1/);
});

test('req-ids: two deltas adding different ids is the normal, quiet case', () => {
  const { collisions, unknown } = auditIds({
    living: new Set(['A-1']),
    deltas: [
      { slug: 'one', added: new Set(['A-2']), modified: new Set(), removed: new Set() },
      { slug: 'two', added: new Set(['A-3']), modified: new Set(), removed: new Set() },
    ],
  });
  assert.deepEqual(collisions, []);
  assert.deepEqual(unknown, []);
});

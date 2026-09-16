// Contract tests for the proof-of-red citations.
//
// The rule lives in scripts/ because both drivers read it; these live beside it for the same reason
// test/review-verdict.test.js sits beside its own rule. The Executor's failing output used to land
// in work/build.md, which is in a throwaway worktree, excluded from the commit and absent from the
// PR body — written, then discarded. These lines are what reach the commit instead.

import test from 'node:test';
import assert from 'node:assert/strict';
import { redCitations } from '../scripts/red-citations.mjs';

test('redCitations: lifts the citation lines tdd-evidence.md asks for', () => {
  const report = [
    'I did the thing.',
    'Red: REQ-ORD-12 a scarcer item is hinted by its own stock — expected max="8", got "20"',
    'Characterization: REQ-ORD-12 an item exactly at the cap — green either way, boundary guard',
    'Then I made it pass.',
  ].join('\n');
  assert.deepEqual(redCitations(report), [
    'Red: REQ-ORD-12 a scarcer item is hinted by its own stock — expected max="8", got "20"',
    'Characterization: REQ-ORD-12 an item exactly at the cap — green either way, boundary guard',
  ]);
});

test('redCitations: leading whitespace is tolerated, as every other parser here does', () => {
  // Three outages in this repo came from a parser too narrow about indentation.
  assert.deepEqual(redCitations('    Red: a test — expected x, got y'), ['Red: a test — expected x, got y']);
});

test('redCitations: trailing whitespace is stripped, so both drivers agree', () => {
  // The shell copy in build.yml stripped only the leading indent, so a line with trailing spaces
  // reached the two commit messages differently. One reader, one answer.
  assert.deepEqual(redCitations('Red: a test — expected x, got y   '), ['Red: a test — expected x, got y']);
});

test('redCitations: prose that merely mentions red is not a citation', () => {
  // The word has to start the line, or a narrative sentence becomes evidence.
  assert.deepEqual(redCitations('I watched it go Red: briefly, then fixed it'), []);
});

test('redCitations: a report with no citations yields none rather than throwing', () => {
  // Normal for a docs or chore delta, which changes no behaviour and owes no red.
  assert.deepEqual(redCitations('nothing to declare'), []);
  assert.deepEqual(redCitations(''), []);
  assert.deepEqual(redCitations(undefined), []);
});

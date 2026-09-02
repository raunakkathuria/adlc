// Contract tests for the label board.
//
// Labels are the dashboard, so a stale one is a lie about where the work is. Two real ones:
// re-triaging an issue ADDED a second type:* instead of replacing the first (#13 ended up both
// type:bug and type:feature), and needs-human was never cleared when the line resumed, so an
// issue sat at state:spec-draft while still flagged as parked.

import test from 'node:test';
import assert from 'node:assert/strict';
import { exclusive } from '../scripts/labels.mjs';

test('labels: setting a state removes the previous one', () => {
  const { add, remove } = exclusive(['state:triaging', 'origin:adlc'], 'state:spec-draft', 'state:');
  assert.equal(add, 'state:spec-draft');
  assert.deepEqual(remove, ['state:triaging']);
});

test('labels: setting a state clears needs-human — the line is working again', () => {
  const { remove } = exclusive(['state:triaging', 'needs-human'], 'state:spec-draft', 'state:', ['needs-human']);
  assert.deepEqual(remove.sort(), ['needs-human', 'state:triaging']);
});

test('labels: re-triaging replaces the type, never accumulates one', () => {
  const { add, remove } = exclusive(['type:bug', 'state:triaging'], 'type:feature', 'type:');
  assert.equal(add, 'type:feature');
  assert.deepEqual(remove, ['type:bug'], 'the earlier verdict is withdrawn, not kept alongside');
});

test('labels: setting the label already held removes nothing', () => {
  const { remove } = exclusive(['state:gate-1', 'type:feature'], 'state:gate-1', 'state:');
  assert.deepEqual(remove, []);
});

test('labels: unrelated families are untouched', () => {
  const { remove } = exclusive(['type:bug', 'origin:adlc', 'state:triaging'], 'state:building', 'state:');
  assert.deepEqual(remove, ['state:triaging']);
});

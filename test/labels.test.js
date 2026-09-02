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

// --- A terminal verdict is stale the moment the line resumes -------------------------------------
// resolution:* records how an issue ENDED. #29 was closed not-actionable, reopened, and reached
// state:spec-draft still wearing that label — the board claiming both "being drafted" and
// "closed: too thin to act on". Same family as needs-human, same cure.

test('labels: setting a state clears a resolution — the issue is being worked again', () => {
  const { remove } = exclusive(
    ['state:triaging', 'resolution:not-actionable', 'type:feature'],
    'state:spec-draft', 'state:', ['needs-human'], ['resolution:'],
  );
  assert.deepEqual(remove.sort(), ['resolution:not-actionable', 'state:triaging']);
});

test('labels: not-reproducible clears too — reopening it is the retry it invites', () => {
  const { remove } = exclusive(
    ['state:triaging', 'resolution:not-reproducible'],
    'state:spec-draft', 'state:', ['needs-human'], ['resolution:'],
  );
  assert.ok(remove.includes('resolution:not-reproducible'));
});

test('labels: a park and a verdict clear together, and nothing else does', () => {
  const { remove } = exclusive(
    ['state:triaging', 'needs-human', 'resolution:not-actionable', 'type:bug', 'origin:adlc'],
    'state:building', 'state:', ['needs-human'], ['resolution:'],
  );
  assert.deepEqual(remove.sort(), ['needs-human', 'resolution:not-actionable', 'state:triaging']);
});

test('labels: setting a type leaves state, park and verdict alone', () => {
  const { remove } = exclusive(['type:bug', 'state:triaging', 'needs-human'], 'type:feature', 'type:');
  assert.deepEqual(remove, ['type:bug'], 'type is its own family and minds its own business');
});

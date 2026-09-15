// Contract tests for the brake.
//
// attempts.mjs is what stops the line grinding on a problem it cannot solve: two automated
// round-trips per station, then a person. It had no tests at all, which is a strange place for
// this repo to have a blind spot — the count is the difference between "try again" and "park",
// and every one of the cases below is a way to get it silently wrong.
//
// Following test/labels.test.js: the decision is a pure function called with plain data, and the
// `gh` call that fetches the comments is not tested.

import test from 'node:test';
import assert from 'node:assert/strict';
import { attemptsSince, MAX_ATTEMPTS } from '../scripts/attempts.mjs';

const attempt = (station) => `<!-- adlc-attempt ${station} -->\nAutomated ${station} attempt 1 of 2.`;
const reset = (station) => `<!-- adlc-attempts-reset ${station} -->\nThe ${station} attempt count starts fresh from here.`;

test('attempts: an issue with no comments has made no attempts', () => {
  assert.equal(attemptsSince([], 'build'), 0);
});

test('attempts: each marker for the station counts once', () => {
  assert.equal(attemptsSince([attempt('build'), attempt('build')], 'build'), 2);
});

test('attempts: ordinary comments are not attempts', () => {
  const bodies = ['Looks good to me', attempt('build'), 'bumping this'];
  assert.equal(attemptsSince(bodies, 'build'), 1);
});

test('attempts: a reset withdraws everything before it', () => {
  // A park posts a reset so the next human-initiated cycle starts clean — a brake that could
  // never be released would be a dead end, not a brake.
  const bodies = [attempt('build'), attempt('build'), reset('build'), attempt('build')];
  assert.equal(attemptsSince(bodies, 'build'), 1);
});

test('attempts: only the LAST reset counts, not the first', () => {
  const bodies = [reset('build'), attempt('build'), reset('build'), attempt('build')];
  assert.equal(attemptsSince(bodies, 'build'), 1, 'counting from the first reset would double it');
});

test('attempts: a reset with nothing after it leaves a clean slate', () => {
  assert.equal(attemptsSince([attempt('build'), reset('build')], 'build'), 0);
});

test('attempts: one station cannot consume another station\'s budget', () => {
  // The verifier bouncing work back twice must not park the build station.
  const bodies = [attempt('verifier'), attempt('verifier'), attempt('build')];
  assert.equal(attemptsSince(bodies, 'build'), 1);
  assert.equal(attemptsSince(bodies, 'verifier'), 2);
});

test('attempts: another station\'s reset does not release this station\'s brake', () => {
  const bodies = [attempt('build'), reset('verifier'), attempt('build')];
  assert.equal(attemptsSince(bodies, 'build'), 2, 'a verifier reset must not clear build attempts');
});

test('attempts: a reset marker is not itself counted as an attempt', () => {
  // `<!-- adlc-attempt build -->` and `<!-- adlc-attempts-reset build -->` share a prefix. If the
  // substring test ever collided, every park would post its own next attempt.
  assert.equal(attemptsSince([reset('build')], 'build'), 0);
});

test('attempts: a station whose name prefixes another is counted separately', () => {
  const bodies = [attempt('build'), attempt('build-extra')];
  assert.equal(attemptsSince(bodies, 'build'), 1);
  assert.equal(attemptsSince(bodies, 'build-extra'), 1);
});

test('attempts: the cap allows two automated round-trips, and the third parks', () => {
  // `record` exits 1 when the new count EXCEEDS the cap, so attempt 3 is the one that parks.
  assert.equal(MAX_ATTEMPTS, 2);
  const bodies = [attempt('build'), attempt('build')];
  assert.equal(attemptsSince(bodies, 'build') + 1 > MAX_ATTEMPTS, true, 'the third attempt parks');
  assert.equal(attemptsSince([attempt('build')], 'build') + 1 > MAX_ATTEMPTS, false, 'the second does not');
});

// Contract tests for the review verdict.
//
// One implementation, two drivers. This rule was written twice — once in JS for local/build.mjs and
// once in shell for build.yml — and the copies disagreed within the hour: `APPROVED — looks good`
// passed CI and parked locally. A rule stated once in a shared prompt must be implemented once too,
// which is why this lives in scripts/ beside labels.mjs and attempts.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewVerdict } from '../scripts/review-verdict.mjs';

test('verdict: a verdict on its own line is the verdict', () => {
  // Both real verdicts this line has seen from a reviewer, verbatim.
  assert.equal(reviewVerdict('No findings.\n\nAPPROVE — no actionable findings; `npm run verify` passes.'), 'APPROVE');
  assert.equal(reviewVerdict('1. **High** ...\n\nREQUEST CHANGES — the driver can fail.'), 'REQUEST CHANGES');
});

test('verdict: an indented verdict still counts', () => {
  assert.equal(reviewVerdict('findings\n\n    APPROVE — fine.'), 'APPROVE');
});

test('verdict: a grammatical variant is still a decision', () => {
  // "APPROVED" is what a reviewer plausibly writes. Parking a green build over a trailing D would
  // be a maddening failure, and the line anchor already does the real work.
  assert.equal(reviewVerdict('APPROVED — looks good to me.'), 'APPROVE');
});

test('verdict: a verdict word inside a sentence is not a verdict', () => {
  for (const text of [
    'I could not complete the review; do not APPROVE',
    'I was told to end with APPROVE or REQUEST CHANGES. Notes: looks fine.',
    'I would REQUEST CHANGES if the tests were missing, but they are not.',
  ]) assert.equal(reviewVerdict(text), null, text);
});

test('verdict: a line naming both verdicts is undecided, not approval', () => {
  // Only the first anchored token used to be captured, so this read as APPROVE.
  assert.equal(reviewVerdict('APPROVE / REQUEST CHANGES — undecided'), null);
});

test('verdict: an ambiguous line poisons the report, even with a clean verdict after it', () => {
  // Skipping the ambiguous line and taking the next clean one read this as APPROVE. A reviewer
  // that wrote both on one line did not reach a decision, and a later line does not undo that.
  assert.equal(reviewVerdict('APPROVE / REQUEST CHANGES — undecided\nAPPROVE — final'), null);
});

test('verdict: two contradictory verdict lines are no verdict', () => {
  assert.equal(reviewVerdict('APPROVE — looks fine.\n\nREQUEST CHANGES — on reflection, no.'), null);
});

test('verdict: the same verdict restated is still one decision', () => {
  // codex prints its final message twice in some modes.
  assert.equal(reviewVerdict('APPROVE — fine.\n\nAPPROVE — fine.'), 'APPROVE');
});

test('verdict: nothing at all is not a review', () => {
  assert.equal(reviewVerdict(''), null);
  assert.equal(reviewVerdict('   \n \n'), null);
  assert.equal(reviewVerdict('(the station produced no output)'), null);
});

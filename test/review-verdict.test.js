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

test('verdict: markdown around the decision is formatting, not a different decision', () => {
  // Both verbatim. The bold one parked a green build for #108 (run 36370074384) as "no verdict".
  // The backtick one is PR #79's, from before this reader existed — and it is the very form
  // prompts/review.md illustrates the line in.
  assert.equal(reviewVerdict('**APPROVE** — the fix removes the actual cause (the `items.length === 0` branch conflating "empty query" with "no-results query" in one message).'), 'APPROVE');
  assert.equal(reviewVerdict('`REQUEST CHANGES` — finding 1 is a live, undisclosed instance of the same bug.'), 'REQUEST CHANGES');
  assert.equal(reviewVerdict('__APPROVE__ — fine.'), 'APPROVE');
});

test('verdict: markdown does not turn prose into a decision', () => {
  for (const text of ['**Do not APPROVE** — the gate is red.', '*I would REQUEST CHANGES if the tests were missing.*']) {
    assert.equal(reviewVerdict(text), null, text);
  }
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

test('verdict: a reason may discuss the other verdict without invalidating the decision', () => {
  // Round four's fix scanned the WHOLE line for both tokens, which rejected legitimate reviews —
  // including, pointedly, a review discussing this parser. The decision is the field before the
  // dash; what the reason says about grammar is not a second decision.
  assert.equal(reviewVerdict('APPROVE — nothing here warrants REQUEST CHANGES.'), 'APPROVE');
  assert.equal(
    reviewVerdict('REQUEST CHANGES — the parser accepts APPROVE / REQUEST CHANGES as approval.'),
    'REQUEST CHANGES',
  );
});

test('verdict: a sentence that opens with a verdict word is prose, not a second verdict', () => {
  // From the report that parked #108's second green build (run 36394430702), verbatim except that its
  // requirement ids are elided — req-coverage reads an id in a test file as a claim. The first line
  // read as REQUEST CHANGES, the second as APPROVE, and two different verdicts are no verdict. The
  // decision is the field before the dash, and here it is a sentence, not a verdict.
  const report = [
    'Diff is minimal and scoped exactly as tasks.md describes. Review complete.',
    '',
    '**REQUEST CHANGES is not warranted — findings below are minor/informational only.**',
    '',
    '**Finding 1** · low severity · `test/catalog.test.js` (and spec) · Missing test for an explicit spec scenario · confidence: high',
    '',
    'APPROVE — the change fixes the actual conditional that produced the bug, matches the amended and new requirement wording exactly.',
  ].join('\n');
  assert.equal(reviewVerdict(report), 'APPROVE');
});

test('verdict: a verdict word followed by another word is a sentence, not a decision', () => {
  // The cost, stated rather than hidden: a report whose ONLY verdict line is a sentence — the verdict
  // followed by a word, like "APPROVE with nits" — reads as no verdict and parks. No real review in
  // this repo's history has done that.
  for (const prose of [
    'REQUEST CHANGES is not warranted — minor findings only.',
    'APPROVE with nits — see below.',
    'REQUEST CHANGES because the test never fails.',
  ]) assert.equal(reviewVerdict(prose), null, prose);
});

test('verdict: the decision field is the verdict alone, markdown and a trailing mark aside', () => {
  // Every real review is this shape: the word, optional bold or backticks, then a dash.
  for (const [verdict, expected] of [
    ['APPROVE', 'APPROVE'],
    ['APPROVE.', 'APPROVE'],
    ['APPROVED — fine.', 'APPROVE'],
    ['**REQUEST CHANGES** — not because the implementation is wrong.', 'REQUEST CHANGES'],
    ['`APPROVE` — x', 'APPROVE'],
    ['**APPROVE — x**', 'APPROVE'],
    ['__APPROVE__ — fine.', 'APPROVE'],
    ['APPROVE — no blocking findings.', 'APPROVE'],
    ['APPROVE - no blocking findings.', 'APPROVE'],
  ]) assert.equal(reviewVerdict(verdict), expected, verdict);
});

test('verdict: punctuation before the next word is still prose, not a second verdict', () => {
  // Skipping only a verdict word followed by a letter left the same disclaimer a verdict once a
  // period, colon, comma, or parenthesis sat in between. Beside a real approval that is two
  // verdicts, and the build parks. Alone, the same line would open a pull request.
  const approve = 'APPROVE — the change fixes the bug.';
  for (const prose of [
    'REQUEST CHANGES. This is not warranted — findings below are minor.',
    '**REQUEST CHANGES.** Not warranted — findings are minor.',
    'REQUEST CHANGES: not warranted — findings are minor.',
    'REQUEST CHANGES, however, is not warranted — findings are minor.',
    'REQUEST CHANGES; this is not warranted — findings are minor.',
    'REQUEST CHANGES (not warranted) — findings are minor.',
    'REQUEST CHANGES -- not warranted, findings are minor.',
    'APPROVE. No blocking findings.',
    'APPROVE, no blocking findings.',
    'APPROVE (no blocking findings)',
    '**APPROVE**. The change is minimal.',
    'APPROVE ✅',
    'APPROVE; the change is minimal.',
  ]) {
    assert.equal(reviewVerdict(prose), null, prose);
    assert.equal(reviewVerdict(`${prose}\n${approve}`), 'APPROVE', prose);
  }
});

test('verdict: a line that names both is undecided even when it reads like a sentence', () => {
  // The sentence rule runs after the undecided rule, so this still poisons the clean line after it.
  assert.equal(reviewVerdict('APPROVE or REQUEST CHANGES — undecided\nAPPROVE — final'), null);
});

test('verdict: an ambiguous DECISION field is still no decision', () => {
  // Both verdicts before the dash: the reviewer did not choose.
  assert.equal(reviewVerdict('APPROVE / REQUEST CHANGES — undecided'), null);
  assert.equal(reviewVerdict('APPROVE or REQUEST CHANGES: cannot tell'), null);
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

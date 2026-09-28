// Contract tests for the verifier's verdict trailers.
//
// The trailers route the work: COMPLETE goes on to quality, anything else goes back to the Planner.
// Missing trailers fail closed as MISMATCH, so a reader too narrow about the FORM of a verdict sends
// a sound implementation back to the spec and costs a Gate 1 round. These tests pin what counts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { trailers } from '../scripts/verifier-verdict.mjs';

test('verifier verdict: plain trailers are the verdict', () => {
  assert.deepEqual(trailers('report\n\nSPEC-MATCH: COMPLETE\nFEATURE-IMPLEMENTED: YES\n'),
    { match: 'COMPLETE', implemented: 'YES' });
  assert.deepEqual(trailers('SPEC-MATCH: MISMATCH\nFEATURE-IMPLEMENTED: N/A'),
    { match: 'MISMATCH', implemented: 'N/A' });
});

test('verifier verdict: indented trailers still count — the prompt shows them indented', () => {
  assert.deepEqual(trailers('report\n\n    SPEC-MATCH: COMPLETE\n    FEATURE-IMPLEMENTED: NO\n'),
    { match: 'COMPLETE', implemented: 'NO' });
});

test('verifier verdict: markdown around a trailer is formatting, not a different verdict', () => {
  // The review verdict parked a green build over `**APPROVE**` (run 36370074384). Here the same
  // miss would be worse: it fails closed as MISMATCH and sends sound work back to the Planner.
  for (const text of [
    '**SPEC-MATCH: COMPLETE**\n**FEATURE-IMPLEMENTED: YES**',
    '**SPEC-MATCH:** COMPLETE\n**FEATURE-IMPLEMENTED:** YES',
    '`SPEC-MATCH: COMPLETE`\n`FEATURE-IMPLEMENTED: YES`',
  ]) assert.deepEqual(trailers(text), { match: 'COMPLETE', implemented: 'YES' }, text);
});

test('verifier verdict: markdown does not change which verdict was given', () => {
  assert.deepEqual(trailers('**SPEC-MATCH: MISMATCH**\n**FEATURE-IMPLEMENTED: N/A**'),
    { match: 'MISMATCH', implemented: 'N/A' });
  assert.deepEqual(trailers('**I cannot write SPEC-MATCH: COMPLETE yet.**'), { match: null, implemented: null });
});

test('verifier verdict: the last trailer is the verdict, not an earlier mention', () => {
  // The prompt asks for the trailers as the report's last two lines. Reading the first match let an
  // earlier line decide — and once markdown is formatting, a quoted `SPEC-MATCH: COMPLETE` early in
  // the report would beat an honest final MISMATCH and send drifted work on to quality. Both
  // independent reviewers of the markdown change probed exactly these shapes.
  for (const early of ['**SPEC-MATCH: COMPLETE**', '`SPEC-MATCH: COMPLETE`', '* SPEC-MATCH: COMPLETE', 'SPEC-MATCH: COMPLETE']) {
    const report = `Would need:\n\n${early}\n\nbut\n\nSPEC-MATCH: MISMATCH\nFEATURE-IMPLEMENTED: YES`;
    assert.deepEqual(trailers(report), { match: 'MISMATCH', implemented: 'YES' }, early);
  }
  assert.deepEqual(trailers('`FEATURE-IMPLEMENTED: YES` if it ran.\n\nSPEC-MATCH: COMPLETE\nFEATURE-IMPLEMENTED: NO'),
    { match: 'COMPLETE', implemented: 'NO' });
});

test('verifier verdict: a trailer never spans two lines', () => {
  assert.deepEqual(trailers('SPEC-MATCH:\nCOMPLETE\nFEATURE-IMPLEMENTED:\nYES'), { match: null, implemented: null });
});

test('verifier verdict: any spacing within the line still reads, as it did before', () => {
  // Narrowing `\s*` to stop a trailer crossing a line break must not also narrow what counts as a
  // space on the line — a non-breaking space read as COMPLETE before, and CRLF endings still must.
  assert.deepEqual(trailers('SPEC-MATCH: COMPLETE \nFEATURE-IMPLEMENTED: YES'), { match: 'COMPLETE', implemented: 'YES' });
  assert.deepEqual(trailers('SPEC-MATCH: COMPLETE \r\nFEATURE-IMPLEMENTED: YES\r\n'), { match: 'COMPLETE', implemented: 'YES' });
});

test('verifier verdict: the prompt\'s own template line is not a verdict', () => {
  // A report that echoes its instructions has not decided anything.
  assert.deepEqual(trailers('SPEC-MATCH: COMPLETE|MISMATCH\nFEATURE-IMPLEMENTED: YES|NO|N/A'),
    { match: null, implemented: null });
});

test('verifier verdict: a trailer inside a sentence is not a verdict', () => {
  assert.deepEqual(trailers('I cannot write SPEC-MATCH: COMPLETE until the app starts.'),
    { match: null, implemented: null });
});

test('verifier verdict: no trailers at all is no verdict', () => {
  assert.deepEqual(trailers(''), { match: null, implemented: null });
  assert.deepEqual(trailers(undefined), { match: null, implemented: null });
});

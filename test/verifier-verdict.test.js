// Contract tests for the verifier's verdict trailers.
//
// The trailers route the work: COMPLETE with YES or N/A goes on to quality. MISMATCH, or
// FEATURE-IMPLEMENTED: NO, goes back to the Planner. A missing SPEC-MATCH fails closed as MISMATCH;
// a SPEC-MATCH with no readable FEATURE-IMPLEMENTED fails closed as NO. A reader too narrow about
// the FORM of a verdict sends a sound implementation back to the spec. These tests pin what counts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { trailers } from '../scripts/verifier-verdict.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tempDir } from './temp-dir.mjs';

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

test('verifier verdict: a reason after the value is still that verdict', () => {
  // prompts/verify.md now asks the verifier to argue an N/A. A reason on the trailer line, the
  // shape every other verdict in this repo uses, was not read — and a missing FEATURE-IMPLEMENTED
  // is now NO, so "N/A — the empty catalogue is unreachable" would go back to the Planner.
  assert.deepEqual(
    trailers('SPEC-MATCH: COMPLETE\nFEATURE-IMPLEMENTED: N/A — the empty catalogue is unreachable'),
    { match: 'COMPLETE', implemented: 'N/A' },
  );
  assert.deepEqual(
    trailers('SPEC-MATCH: COMPLETE\nFEATURE-IMPLEMENTED: N/A - the empty catalogue is unreachable'),
    { match: 'COMPLETE', implemented: 'N/A' },
  );
  assert.deepEqual(
    trailers('SPEC-MATCH: COMPLETE — every scenario is satisfied\nFEATURE-IMPLEMENTED: YES — observed working'),
    { match: 'COMPLETE', implemented: 'YES' },
  );
  assert.deepEqual(
    trailers('SPEC-MATCH: MISMATCH\nFEATURE-IMPLEMENTED: NO — the reachable part was not driven'),
    { match: 'MISMATCH', implemented: 'NO' },
  );
  // Words with no dash are not a reason. The template line and a sentence stay unread.
  assert.deepEqual(trailers('FEATURE-IMPLEMENTED: N/A because the catalogue is seeded'), { match: null, implemented: null });
});

test('verifier verdict: a reasoned N/A is not rewritten as NO', () => {
  const report = join(tempDir('adlc-verdict-'), 'verifier.md');
  writeFileSync(report, 'SPEC-MATCH: COMPLETE\nFEATURE-IMPLEMENTED: N/A — the empty catalogue is unreachable\n');
  const out = execFileSync('node', [join(import.meta.dirname, '..', 'scripts', 'verifier-verdict.mjs'), report], { encoding: 'utf8' });
  assert.match(out, /^match=COMPLETE$/m);
  assert.match(out, /^implemented=N\/A$/m);
  assert.doesNotMatch(readFileSync(report, 'utf8'), /no FEATURE-IMPLEMENTED trailer/);
});

test('verifier verdict: a report with SPEC-MATCH but no FEATURE-IMPLEMENTED fails closed, as NO', () => {
  // A missing trailer used to default to N/A, which routes on to quality. N/A now also means
  // "not observed, and here is why", so a report that simply dropped the line would pass as a
  // reasoned N/A with no reason. It routes back instead, and the report says why.
  const report = join(tempDir('adlc-verdict-'), 'verifier.md');
  writeFileSync(report, 'every scenario satisfied\n\nSPEC-MATCH: COMPLETE\n');
  const out = execFileSync('node', [join(import.meta.dirname, '..', 'scripts', 'verifier-verdict.mjs'), report], { encoding: 'utf8' });
  assert.match(out, /^implemented=NO$/m);
  assert.match(readFileSync(report, 'utf8'), /no FEATURE-IMPLEMENTED trailer/);
});

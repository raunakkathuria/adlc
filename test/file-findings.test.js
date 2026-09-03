// Contract tests for the out-of-scope findings line.
//
// prompts/verify.md illustrates this line indented, and the parser required it flush left. An
// indented line matched nothing, so the station reported "nothing to file" and dropped every
// finding it had just made — silently, which is the worst way for a fail-closed path to behave.
// The same mismatch between an indented illustration and an anchored parser sent a sound
// implementation back to the Planner: see the SPEC-MATCH trailers in verifier.yml.

import test from 'node:test';
import assert from 'node:assert/strict';
import { findingsLine } from '../scripts/file-findings.mjs';

const payload = (line) => JSON.parse(line.slice(line.indexOf(':') + 1).trim());

test('findings: an indented line is found — the shape the prompt illustrates', () => {
  const line = findingsLine('## Report\n\n    OUT-OF-SCOPE-FINDINGS: [{"title":"t","body":"b"}]\n');
  assert.ok(line, 'an indented line must not read as no findings at all');
  assert.deepEqual(payload(line), [{ title: 't', body: 'b' }]);
});

test('findings: a flush-left line is found too', () => {
  const line = findingsLine('OUT-OF-SCOPE-FINDINGS: [{"title":"t","body":"b"}]\n');
  assert.deepEqual(payload(line), [{ title: 't', body: 'b' }]);
});

test('findings: an empty array is a real answer — the verifier found nothing out of scope', () => {
  assert.deepEqual(payload(findingsLine('OUT-OF-SCOPE-FINDINGS: []\n')), []);
});

test('findings: no line at all is distinguishable from an empty one', () => {
  assert.equal(findingsLine('## Report\n\nnothing machine-readable here\n'), undefined);
});

test('findings: the payload is sliced at the colon, so an indent cannot skew it', () => {
  const line = findingsLine('\t  OUT-OF-SCOPE-FINDINGS: [{"title":"tabbed"}]\n');
  assert.deepEqual(payload(line), [{ title: 'tabbed' }]);
});

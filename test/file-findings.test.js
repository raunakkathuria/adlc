// Contract tests for the out-of-scope findings line.
//
// prompts/verify.md illustrates this line indented, and the parser required it flush left. An
// indented line matched nothing, so the station reported "nothing to file" and dropped every
// finding it had just made — silently, which is the worst way for a fail-closed path to behave.
// The same mismatch between an indented illustration and an anchored parser sent a sound
// implementation back to the Planner: see the SPEC-MATCH trailers in scripts/verifier-verdict.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { findingsLine, payloadOf } from '../scripts/file-findings.mjs';

const payload = payloadOf; // the CLI's own parse, so the tests read what gets filed

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

test('findings: emphasis on either side of the marker\'s colon still finds the line', () => {
  for (const text of ['**OUT-OF-SCOPE-FINDINGS**: []', '**OUT-OF-SCOPE-FINDINGS:** []', '`OUT-OF-SCOPE-FINDINGS:` []']) {
    assert.deepEqual(payload(findingsLine(`## Report\n\n${text}\n`)), [], text);
  }
});

test('findings: a bold label before the marker is prose, not the findings line', () => {
  assert.equal(findingsLine('**Note:** OUT-OF-SCOPE-FINDINGS: [] was left empty\n'), undefined);
});

test('findings: the last findings line is the one read, so an echo or a mention cannot shadow it', () => {
  // Widening what counts as the line made the first-match rule dangerous: an echoed prompt example in
  // backticks, or prose opening with the marker in code, would win over the real line at the end —
  // filing a "..." issue, or filing nothing. The same lesson the verifier trailers taught.
  const real = 'OUT-OF-SCOPE-FINDINGS: [{"title":"real","body":"b"}]';
  for (const early of [
    '`OUT-OF-SCOPE-FINDINGS: [{"title":"...","body":"what you observed, the command"}]`',
    '`OUT-OF-SCOPE-FINDINGS:` one confirmed defect, below.',
    '**OUT-OF-SCOPE-FINDINGS:**', // a bold label over the real, indented line
  ]) {
    assert.deepEqual(payload(findingsLine(`${early}\n\nreport\n\n    ${real}\n`)), [{ title: 'real', body: 'b' }], early);
  }
});

test('findings: a mention after the real line cannot shadow it either — only findings that parse are the line', () => {
  // "Last line wins" alone would let a later mention (in a verdict paragraph, say) take the place of
  // the real line and file nothing. Opening a `[` is not enough: a quoted `[…]` or `[]` opens one too.
  // The line read is the last one whose payload parses as findings — the same parse the CLI makes.
  for (const later of [
    '`OUT-OF-SCOPE-FINDINGS:` holds the one defect above.',
    '`OUT-OF-SCOPE-FINDINGS: […]` above lists one defect.',
    '`OUT-OF-SCOPE-FINDINGS: []` would have been empty without it.',
  ]) {
    const report = `OUT-OF-SCOPE-FINDINGS: [{"title":"real"}]\n\n## Verdict\n\n${later}\n`;
    assert.deepEqual(payload(findingsLine(report)), [{ title: 'real' }], later);
  }
});

test('findings: an echo of the prompt\'s example is not a finding, wherever it sits', () => {
  // The prompts illustrate the line with "title":"...". Filed, an echo would become an issue titled
  // "..." that re-enters the line — before the real line on main, after it once the last line won.
  const real = 'OUT-OF-SCOPE-FINDINGS: [{"title":"real"}]';
  const echo = 'OUT-OF-SCOPE-FINDINGS: [{"title":"...","body":"what you observed, the command"}]';
  assert.deepEqual(payload(findingsLine(`${real}\n\n${echo}\n`)), [{ title: 'real' }], 'echo after');
  assert.deepEqual(payload(findingsLine(`${echo}\n\n${real}\n`)), [{ title: 'real' }], 'echo before');
  assert.equal(findingsLine(`${echo}\n`), undefined, 'an echo alone files nothing');
});

test('findings: a broken line is still found, so the failure is reported rather than silent', () => {
  // With no line that parses as findings, the last line that did not parse is returned, and the CLI
  // warns that it did not parse — the loud path, not "no line at all".
  assert.equal(findingsLine('OUT-OF-SCOPE-FINDINGS: {"title":"not an array"}\n'), 'OUT-OF-SCOPE-FINDINGS: {"title":"not an array"}');
});

// Contract tests for the out-of-scope findings line.
//
// prompts/verify.md illustrates this line indented, and the parser required it flush left. An
// indented line matched nothing, so the station reported "nothing to file" and dropped every
// finding it had just made — silently, which is the worst way for a fail-closed path to behave.
// The same mismatch between an indented illustration and an anchored parser sent a sound
// implementation back to the Planner: see the SPEC-MATCH trailers in scripts/verifier-verdict.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { findingsLine, payloadOf, reportVerb } from '../scripts/file-findings.mjs';

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
  const line = findingsLine('\t  OUT-OF-SCOPE-FINDINGS: [{"title":"tabbed","body":"b"}]\n');
  assert.deepEqual(payload(line), [{ title: 'tabbed', body: 'b' }]);
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
    'If none, print\n\n`OUT-OF-SCOPE-FINDINGS: []`', // the prompts' own "empty array if none", echoed on its own line
  ]) {
    const report = `OUT-OF-SCOPE-FINDINGS: [{"title":"real","body":"b"}]\n\n## Verdict\n\n${later}\n`;
    assert.deepEqual(payload(findingsLine(report)), [{ title: 'real', body: 'b' }], later);
  }
});

test('findings: an echo of the prompt\'s example is not a finding, wherever it sits', () => {
  // The prompts illustrate the line with "title":"...". Filed, an echo would become an issue titled
  // "..." that re-enters the line — before the real line on main, after it once the last line won.
  const real = 'OUT-OF-SCOPE-FINDINGS: [{"title":"real","body":"b"}]';
  const echo = 'OUT-OF-SCOPE-FINDINGS: [{"title":"...","body":"what you observed, the command"}]';
  assert.deepEqual(payload(findingsLine(`${real}\n\n${echo}\n`)), [{ title: 'real', body: 'b' }], 'echo after');
  assert.deepEqual(payload(findingsLine(`${echo}\n\n${real}\n`)), [{ title: 'real', body: 'b' }], 'echo before');
  assert.deepEqual(payload(findingsLine(`${echo}\n`)), [], 'an echo alone files nothing');
});

test('findings: a placeholder item is dropped even beside a real one', () => {
  // Echo detection was all-or-nothing: one "..." item next to a real one still filed an issue titled
  // "...". A placeholder is the instruction, never a finding, so it is dropped item by item.
  const line = 'OUT-OF-SCOPE-FINDINGS: [{"title":"...","body":"x"},{"title":"real","body":"b"}]';
  assert.deepEqual(payload(findingsLine(line)), [{ title: 'real', body: 'b' }]);
});

test('findings: anything but an array of objects does not parse, so the CLI warns instead of crashing', () => {
  // `[null]` passed as findings and crashed the CLI while destructuring each item, before the
  // per-finding try. It is still found (the loud path), and the parse refuses it.
  for (const bad of ['[null]', '["x"]', '[[]]']) {
    const line = findingsLine(`OUT-OF-SCOPE-FINDINGS: ${bad}\n`);
    assert.equal(line, `OUT-OF-SCOPE-FINDINGS: ${bad}`, bad);
    assert.throws(() => payload(line), bad);
  }
});

test('findings: a broken line is still found, so the failure is reported rather than silent', () => {
  // With no line that parses as findings, the last line that did not parse is returned, and the CLI
  // warns that it did not parse — the loud path, not "no line at all".
  assert.equal(findingsLine('OUT-OF-SCOPE-FINDINGS: {"title":"not an array"}\n'), 'OUT-OF-SCOPE-FINDINGS: {"title":"not an array"}');
});

test('findings: a restatement without bodies cannot shadow the real line', () => {
  // The CLI files only items with a title and a body. An item without them is not a finding, so a
  // later restatement of titles alone — or `[{}]` — must not be the line the selector picks.
  const real = 'OUT-OF-SCOPE-FINDINGS: [{"title":"real defect","body":"b"}]';
  for (const later of ['`OUT-OF-SCOPE-FINDINGS: [{"title":"real defect"}]`', 'OUT-OF-SCOPE-FINDINGS: [{}]']) {
    assert.deepEqual(payload(findingsLine(`${real}\n\n## Verdict\n\n${later}\n`)), [{ title: 'real defect', body: 'b' }], later);
  }
});

test('findings: an explore with no source issue is parked, not filed into intake', () => {
  // quality.yml dispatches intake only for lines that say "Filed". An explore has no parent
  // issue, and handing it to intake is what turned each nightly finding into a pull request.
  assert.equal(reportVerb('-'), 'Parked');
  assert.equal(reportVerb('104'), 'Filed');
});

test('findings: a broken real line stays loud even beside an empty echo', () => {
  // A quoted `[]` must not outrank a real line that failed to parse: the "did not parse" warning is
  // the only sign that findings existed and were lost.
  const broken = 'OUT-OF-SCOPE-FINDINGS: [{"title":"curl","body":"sent {"q": 1}"}]';
  assert.equal(findingsLine(`${broken}\n\nIf none, print\n\n\`OUT-OF-SCOPE-FINDINGS: []\`\n`), broken);
});

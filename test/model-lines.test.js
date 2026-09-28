// Every fixed-shape line a station writes reads the same however a model formats it.
//
// The prompts ask stations for lines a script reads back: a review verdict, the verifier's two
// trailers, the out-of-scope findings line, the proof-of-red citations. A model decorates them —
// indents them, puts them in bold, wraps them in backticks — and each decoration has cost this line
// a failure once: a correct approval parked a green build over `**APPROVE**`, an indented findings
// line dropped every finding without a word, an indented COMPLETE sent sound work back to the
// Planner. docs/design.md records the shape seven times, with the advice "check its prompt's own
// example against its parser". This table is that check, for every reader of a station's report at
// once. (Triage's first-line JSON is parsed inline in intake.yml and parks when it cannot read it;
// issue #106 is about replacing it, so it is not here.)
//
// Each reader keeps its own code, because what follows the marker differs — an enum, JSON, free
// text. The RULE is stated here, once: formatting is formatting, never a different answer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewVerdict } from '../scripts/review-verdict.mjs';
import { trailers } from '../scripts/verifier-verdict.mjs';
import { findingsLine, payloadOf } from '../scripts/file-findings.mjs';
import { redCitations } from '../scripts/red-citations.mjs';

// What the file-findings CLI would file: the line it selects, read by its own parse.
const findings = (report) => {
  const line = findingsLine(report);
  return line === undefined ? null : payloadOf(line);
};

// One row per line a prompt asks for. `boldMarker` is the line with only its marker in bold, the
// other common decoration. `template` is the prompt's own illustration where it shows a choice
// rather than an answer — that must never read as a decision.
const LINES = [
  {
    name: 'the review verdict (prompts/review.md)',
    read: (text) => reviewVerdict(text),
    plain: 'APPROVE — the change meets the spec',
    boldMarker: '**APPROVE** — the change meets the spec',
    value: 'APPROVE',
    template: '`APPROVE` or `REQUEST CHANGES`, and why.',
  },
  {
    name: 'the SPEC-MATCH trailer (prompts/verify.md)',
    read: (text) => trailers(text).match,
    plain: 'SPEC-MATCH: COMPLETE',
    boldMarker: '**SPEC-MATCH:** COMPLETE',
    value: 'COMPLETE',
    template: 'SPEC-MATCH: COMPLETE|MISMATCH',
  },
  {
    name: 'the FEATURE-IMPLEMENTED trailer (prompts/verify.md)',
    read: (text) => trailers(text).implemented,
    plain: 'FEATURE-IMPLEMENTED: YES',
    boldMarker: '**FEATURE-IMPLEMENTED:** YES',
    value: 'YES',
    template: 'FEATURE-IMPLEMENTED: YES|NO|N/A',
  },
  {
    name: 'the out-of-scope findings line (prompts/verify.md, prompts/quality.md)',
    read: findings,
    plain: 'OUT-OF-SCOPE-FINDINGS: [{"title":"a snake_case `code` title","body":"what a *user* sees"}]',
    boldMarker: '**OUT-OF-SCOPE-FINDINGS:** [{"title":"a snake_case `code` title","body":"what a *user* sees"}]',
    // The JSON is the payload and must arrive untouched — markdown characters inside it included.
    value: [{ title: 'a snake_case `code` title', body: 'what a *user* sees' }],
  },
  {
    name: 'a Red: citation (prompts/build.md)',
    read: (text) => redCitations(text)[0] ?? null,
    plain: 'Red: the button is disabled at zero stock — expected disabled, got enabled',
    boldMarker: '**Red:** the button is disabled at zero stock — expected disabled, got enabled',
    value: 'Red: the button is disabled at zero stock — expected disabled, got enabled',
  },
  {
    name: 'a Characterization: citation (prompts/build.md)',
    read: (text) => redCitations(text)[0] ?? null,
    plain: 'Characterization: the name is unaffected — green either way',
    boldMarker: '**Characterization:** the name is unaffected — green either way',
    value: 'Characterization: the name is unaffected — green either way',
  },
];

for (const row of LINES) {
  test(`model lines: ${row.name} reads the same however it is formatted`, () => {
    const shapes = {
      plain: row.plain,
      indented: `    ${row.plain}`,
      'in bold': `**${row.plain}**`,
      'in backticks': `\`${row.plain}\``,
      'with its marker in bold': row.boldMarker,
    };
    for (const [shape, line] of Object.entries(shapes)) {
      assert.deepEqual(row.read(`Report prose above.\n\n${line}\n`), row.value, `${shape}: ${line}`);
    }
  });

  if (row.template) {
    test(`model lines: ${row.name} — the prompt's template is not a decision`, () => {
      assert.equal(row.read(row.template), null);
    });
  }
}

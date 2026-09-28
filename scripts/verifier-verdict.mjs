// The verifier's verdict — two trailers, read in one place.
//
// prompts/verify.md asks the report to end with
//
//     SPEC-MATCH: COMPLETE|MISMATCH
//     FEATURE-IMPLEMENTED: YES|NO|N/A
//
// and verifier.yml routes the work on them: COMPLETE goes on to quality, anything else goes back to
// the Planner. Missing trailers fail closed as MISMATCH, because an agent that lost its output
// contract proved nothing — which means a reader too narrow about FORM sends a sound implementation
// back to the spec. It has happened: an indented COMPLETE read as no verdict, appended a MISMATCH,
// burnt a loop-cap attempt, and cost a Gate 1 round.
//
// It lived inline in verifier.yml with no test. It is here, beside review-verdict.mjs, so the rule
// is tested with plain data the way every other decision in scripts/ is.
//
//   node scripts/verifier-verdict.mjs <report-file>
//
// Prints `match=` and `implemented=` lines for $GITHUB_OUTPUT. When SPEC-MATCH is missing it also
// appends the fail-closed trailers to the report, so the comment posted on the PR says what the line
// decided and why.

import { readFileSync, appendFileSync } from 'node:fs';

const FAIL_CLOSED =
  '\n\n> The report above did not end with the required trailers; the line treats that as a MISMATCH — fail closed.\n\nSPEC-MATCH: MISMATCH\nFEATURE-IMPLEMENTED: N/A\n';

/**
 * The two trailers a report ends with, or null for each one it does not carry.
 *
 * Leading whitespace is tolerated: the prompt illustrates these trailers indented. So is markdown —
 * `**SPEC-MATCH: COMPLETE**`, `**SPEC-MATCH:** COMPLETE`, backticks — because the review verdict
 * parked a green build over `**APPROVE**`. No trailer name or value contains `*`, `_` or a backtick,
 * so dropping them removes formatting and cannot change a value on its line.
 *
 * Across the report, the LAST occurrence is the verdict, because the prompt asks for the trailers as
 * the report's last two lines. The first match used to win, so an earlier mention decided — and once
 * markdown counts, a quoted `SPEC-MATCH: COMPLETE` would beat an honest final MISMATCH. A trailer
 * never spans a line break either. A differently formatted verdict is accepted, never a different one.
 */
export function trailers(report) {
  const text = String(report ?? '').replace(/[*_`]/g, '');
  const last = (re) => [...text.matchAll(re)].at(-1)?.[1] ?? null;
  return {
    match: last(/^[ \t]*SPEC-MATCH:[ \t]*(COMPLETE|MISMATCH)[ \t]*\r?$/gm),
    implemented: last(/^[ \t]*FEATURE-IMPLEMENTED:[ \t]*(YES|NO|N\/A)[ \t]*\r?$/gm),
  };
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/verifier-verdict.mjs <report-file>');
    process.exit(2);
  }
  const { match, implemented } = trailers(readFileSync(file, 'utf8'));
  if (!match) appendFileSync(file, FAIL_CLOSED);
  process.stdout.write(`match=${match ?? 'MISMATCH'}\nimplemented=${implemented ?? 'N/A'}\n`);
}

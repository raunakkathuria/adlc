// The proof-of-red citations — one rule, both drivers.
//
// `prompts/build.md` asks the Executor for one line per behaviour-changing test, in the format
// `.buildwright/framework/tdd-evidence.md` owns:
//
//   Red: <test name> — expected <what the requirement says>, got <what it did>
//   Characterization: <test name> — <what it pins, that already worked>
//
// Something has to lift those into the commit message, because a test that never failed proves
// nothing and the evidence is worthless where nobody reads it. That lifting lives here, beside
// labels.mjs, attempts.mjs, links.mjs and review-verdict.mjs, for the reason those do: the rule is
// stated once in a prompt BOTH drivers run, so it is implemented once.
//
// It was briefly implemented twice — this function in local/build.mjs, a `grep | sed` in build.yml
// — and the copies already differed on trailing whitespace. The verdict rule went the same way and
// its copies disagreed within an hour. test/shared-rules.test.js is the gate that stops a third.
//
//   node scripts/red-citations.mjs <report-file>
//
// Prints the citation lines, one per line, and exits 0. A report with none is normal — a docs or
// chore delta changes no behaviour — so an empty result is success, not failure.

import { readFileSync } from 'node:fs';

/** The citation lines in a build report, trimmed, in the order the Executor wrote them. */
export function redCitations(report) {
  return String(report ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(Red|Characterization):/.test(line));
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/red-citations.mjs <report-file>');
    process.exit(2);
  }
  let report = '';
  try {
    report = readFileSync(file, 'utf8');
  } catch {
    // No report is not an error here: the caller decides what an absent build report means.
    report = '';
  }
  const lines = redCitations(report);
  if (lines.length) process.stdout.write(`${lines.join('\n')}\n`);
}

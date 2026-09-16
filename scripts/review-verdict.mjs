// The review verdict — one rule, both drivers.
//
// `prompts/review.md` asks the reviewer to end with one line: APPROVE or REQUEST CHANGES. Something
// has to read that, because a reviewer can exit cleanly having printed nothing and the PR would
// then carry a banner claiming an independent review that did not happen.
//
// It lives here, beside labels.mjs and attempts.mjs, for the reason those do: the rule is stated
// once in a prompt both drivers run, so it must be IMPLEMENTED once too. It was briefly written
// twice — JS for local/build.mjs, shell for build.yml — and the copies disagreed inside an hour:
// `APPROVED — looks good` passed in CI and parked locally.
//
//   node scripts/review-verdict.mjs <report-file>
//
// Prints the verdict and exits 0 when there is exactly one; prints why and exits 1 otherwise.

import { readFileSync } from 'node:fs';

const VERDICT = /APPROVE|REQUEST CHANGES/g;

/**
 * The single verdict a report reaches, or null if it reaches none or more than one.
 *
 * A verdict LINE, not a mention: "do not APPROVE" and "I would REQUEST CHANGES if …" are prose,
 * and the anchor is what tells them apart. No word boundary after the verdict, deliberately —
 * `APPROVED` is what a reviewer plausibly writes, and parking a green build over a trailing letter
 * would be a maddening failure the anchor already makes unnecessary. A line naming BOTH verdicts is
 * undecided rather than approval, and two different verdicts across the report are not a decision.
 */
export function reviewVerdict(report) {
  const found = new Set();
  for (const line of String(report ?? '').split('\n')) {
    if (!/^[ \t]*(APPROVE|REQUEST CHANGES)/.test(line)) continue;

    // The DECISION is the field before the reason, and only that field is read. Scanning the whole
    // line for both tokens rejected legitimate reviews — including, pointedly, a review discussing
    // this parser: "REQUEST CHANGES — the parser accepts APPROVE / REQUEST CHANGES as approval."
    // What a reason says about the grammar is not a second decision.
    const [decision] = line.split(/—|–|:|\s-\s/, 1);
    const named = new Set(decision.match(VERDICT) ?? []);

    // Both named BEFORE the reason — "APPROVE / REQUEST CHANGES — undecided" — is a reviewer who
    // did not choose, and a clean verdict later in the report does not retract that.
    if (named.size !== 1) return null;
    found.add([...named][0]);
  }
  return found.size === 1 ? [...found][0] : null;
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/review-verdict.mjs <report-file>');
    process.exit(2);
  }
  let report = '';
  try {
    report = readFileSync(file, 'utf8');
  } catch {
    console.error(`no review report at ${file}`);
    process.exit(1);
  }
  const verdict = reviewVerdict(report);
  if (!verdict) {
    console.error('The review reached no single verdict — prompts/review.md asks for one line reading APPROVE or REQUEST CHANGES.');
    process.exit(1);
  }
  process.stdout.write(`${verdict}\n`);
}

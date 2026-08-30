// File out-of-scope findings as issues — the line feeding itself.
//
// The verifier and quality stations emit a machine-readable line in their reports:
//   OUT-OF-SCOPE-FINDINGS: [{"title":"...","body":"..."}]
// This script parses it and files each finding as a new issue, which re-enters the line at
// intake. Two brakes, both mandatory:
//
//   dedupe — an open issue with a matching title is commented on instead of duplicated, and a
//            CLOSED not-reproducible issue with a matching title is REOPENED (a recurrence is
//            evidence, not a duplicate);
//   depth  — a machine-filed issue carries depth = parent depth + 1 in its links block.
//            Intake parks anything at depth 2: issues filed by a run that was itself
//            investigating a machine-filed issue wait for a human. Depth 1 runs.
//
//   node scripts/file-findings.mjs <report-file> <parent-issue>
//
// Pass `-` as <parent-issue> for a run with no source issue (the nightly explore): findings
// file at depth 1 with no origin link. Every filed-or-reopened issue prints as
// "Filed <url>" so the workflow can dispatch intake for it (bot-created events start no
// workflows on their own).
//
// Needs `gh` and GH_TOKEN. Filing is advisory: a failure to file one finding warns and
// continues — the report that produced it is already posted.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseLinks, renderLinks, issueCommentBodies } from './links.mjs';

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

const [reportFile, parentIssue] = process.argv.slice(2);
if (!reportFile || !parentIssue) throw new Error('usage: file-findings.mjs <report-file> <parent-issue|->');

const report = readFileSync(reportFile, 'utf8');
const line = report.split('\n').find((l) => l.startsWith('OUT-OF-SCOPE-FINDINGS:'));
if (!line) {
  console.log('No OUT-OF-SCOPE-FINDINGS line in the report; nothing to file.');
  process.exit(0);
}

let findings;
try {
  findings = JSON.parse(line.slice('OUT-OF-SCOPE-FINDINGS:'.length).trim());
  if (!Array.isArray(findings)) throw new Error('not an array');
} catch (err) {
  console.warn(`OUT-OF-SCOPE-FINDINGS line did not parse (${err.message}); filing nothing — fail closed.`);
  process.exit(0);
}

let parentUrl = '';
let depth = 1;
if (parentIssue !== '-') {
  const parent = JSON.parse(gh('issue', 'view', parentIssue, '--json', 'body,url'));
  parentUrl = parent.url;
  const links = parseLinks([parent.body ?? '', ...issueCommentBodies(parentIssue)].join('\n'));
  depth = Number(links.depth ?? 0) + 1;
}
const foundBy = parentUrl ? `while working ${parentUrl}` : 'on a scheduled exploration of the default branch';

const sameTitle = (list, title) => list.find((i) => i.title.trim().toLowerCase() === title.trim().toLowerCase());

for (const { title, body } of findings) {
  if (!title || !body) continue;
  try {
    const open = JSON.parse(gh('issue', 'list', '--state', 'open', '--search', JSON.stringify(title), '--json', 'number,title'));
    const dupe = sameTitle(open, title);
    if (dupe) {
      gh('issue', 'comment', String(dupe.number), '--body', `Seen again ${foundBy}:\n\n${body}`);
      console.log(`#${dupe.number} already tracks "${title}" — commented instead of duplicating.`);
      continue;
    }
    const closed = JSON.parse(gh('issue', 'list', '--state', 'closed', '--label', 'resolution:not-reproducible', '--search', JSON.stringify(title), '--json', 'number,title,url'));
    const recurrence = sameTitle(closed, title);
    if (recurrence) {
      gh('issue', 'reopen', String(recurrence.number), '--comment', `Reopened: seen again ${foundBy} after being closed as not reproducible — a recurrence is evidence.\n\n${body}`);
      console.log(`Filed ${recurrence.url}`);
      continue;
    }
    const trailer = renderLinks(parentUrl ? { origin_issue: parentUrl, depth: String(depth) } : { depth: String(depth) });
    const issueBody = `${body}\n\nFound by the line ${foundBy}.\n\n${trailer}`;
    const url = gh('issue', 'create', '--title', title, '--body', issueBody, '--label', 'origin:adlc').trim();
    console.log(`Filed ${url}`);
  } catch (err) {
    console.warn(`Could not file "${title}": ${err.message} — continuing.`);
  }
}

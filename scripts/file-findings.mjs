// File out-of-scope findings as issues — the line feeding itself.
//
// The verifier and quality stations emit a machine-readable line in their reports:
//   OUT-OF-SCOPE-FINDINGS: [{"title":"...","body":"..."}]
// This script parses it and files each finding as a new issue, which re-enters the line at
// intake. Two brakes, both mandatory:
//
//   dedupe — an open issue (or a closed not-reproducible one) with a matching title is
//            commented on instead of duplicated;
//   depth  — a machine-filed issue carries depth = parent depth + 1 in its links block.
//            Intake parks anything at depth 2: issues filed by a run that was itself
//            investigating a machine-filed issue wait for a human. Depth 1 runs.
//
//   node scripts/file-findings.mjs <report-file> <parent-issue>
//
// Needs `gh` and GH_TOKEN. Filing is advisory: a failure to file one finding warns and
// continues — the report that produced it is already posted.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseLinks, renderLinks } from './links.mjs';

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

const [reportFile, parentIssue] = process.argv.slice(2);
if (!reportFile || !parentIssue) throw new Error('usage: file-findings.mjs <report-file> <parent-issue>');

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

const parent = JSON.parse(gh('issue', 'view', parentIssue, '--json', 'body,comments,url'));
const parentDepth = Number(parseLinks([parent.body, ...parent.comments.map((c) => c.body)].join('\n')).depth ?? 0);
const depth = parentDepth + 1;

for (const { title, body } of findings) {
  if (!title || !body) continue;
  try {
    const open = JSON.parse(gh('issue', 'list', '--state', 'open', '--search', JSON.stringify(title), '--json', 'number,title'));
    const dupe = open.find((i) => i.title.trim().toLowerCase() === title.trim().toLowerCase());
    if (dupe) {
      gh('issue', 'comment', String(dupe.number), '--body', `Seen again while verifying ${parent.url}:\n\n${body}`);
      console.log(`#${dupe.number} already tracks "${title}" — commented instead of duplicating.`);
      continue;
    }
    const issueBody = `${body}\n\nFound by the line while working ${parent.url}.\n\n${renderLinks({ origin_issue: parent.url, depth: String(depth) })}`;
    const url = gh('issue', 'create', '--title', title, '--body', issueBody, '--label', 'origin:adlc').trim();
    console.log(`Filed ${url} (depth ${depth}).`);
  } catch (err) {
    console.warn(`Could not file "${title}": ${err.message} — continuing.`);
  }
}

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
// Pass `-` as <parent-issue> for an explore with no source issue. Those print as
// "Parked <url>" and are labelled needs-human: the workflow dispatches intake only for
// "Filed", and bot-created events start no workflows on their own. A finding from a
// source issue still prints "Filed <url>".
//
// Needs `gh` and GH_TOKEN. Filing is advisory: a failure to file one finding warns and
// continues — the report that produced it is already posted.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseLinks, renderLinks, issueCommentBodies } from './links.mjs';
import { unwrap } from './marker-line.mjs';
import { isMainModule } from './is-main.mjs';

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

/**
 * The findings after the marker's colon — the one rule for what a finding is, shared by the selector
 * and the CLI, so the two cannot disagree. Anything but an array of objects throws, which the CLI
 * reports as "did not parse": `[null]` used to pass and then crash it while destructuring each item.
 * Of the objects, only those with a title and a body are findings; the CLI never filed any other. An
 * item titled "..." is dropped too — that is the prompts' own illustration, `"title":"..."`, echoed
 * back, and filed it would become an issue titled "..." that re-enters the line.
 */
export function payloadOf(line) {
  const findings = JSON.parse(line.slice(line.indexOf(':') + 1).trim());
  if (!Array.isArray(findings) || !findings.every((f) => f !== null && typeof f === 'object' && !Array.isArray(f))) {
    throw new Error('not an array of findings');
  }
  const text = (v) => typeof v === 'string' && v.trim() !== '';
  return findings.filter((f) => text(f.title) && text(f.body) && f.title !== '...');
}

/**
 * What the workflow should do with a filed issue. `Filed` is the word quality.yml greps for
 * before it dispatches intake. An explore has no parent issue (`-`): it is parked, and that
 * word does not match, so a scheduled or manual look at the whole product cannot open a line
 * of work on its own. A finding that came from a source issue still says `Filed`.
 */
export function reportVerb(parentIssue) {
  return parentIssue === '-' ? 'Parked' : 'Filed';
}

// What a candidate line holds, by that same parse.
function holds(line) {
  try {
    return payloadOf(line).length > 0 ? 'findings' : 'empty';
  } catch {
    return 'broken';
  }
}

/**
 * The findings line, wherever it sits, trimmed and with any markdown the model wrapped it in removed
 * (`unwrap`). Leading whitespace is tolerated because prompts/verify.md illustrates this line
 * indented — and an indented line matched nothing, so the station said "nothing to file" and dropped
 * every finding it had just made, without a word. A bold line did the same. The JSON after the colon
 * is never touched.
 *
 * Once formatting counts, more lines start with the marker: a bold label over the real line, prose
 * that opens with the marker in code, a quoted `[…]`, an echo of the prompt's example. The first
 * match let any of them shadow the real line — the lesson the verifier trailers taught. So the line
 * read is the LAST one that parses as findings, by the same parse the CLI makes, so a quoted `[]`
 * (the prompts say "empty array if none") never outranks real findings: this fails toward filing, and
 * dedupe already guards duplicates. Failing that, the last line that did not parse — ahead of any
 * empty one, because the "did not parse" warning is the only sign that findings existed and were
 * lost. Only then the last empty line.
 */
export function findingsLine(report) {
  const candidates = report.split('\n').map(unwrap).filter((l) => l.startsWith('OUT-OF-SCOPE-FINDINGS:'));
  const last = (kind) => candidates.filter((l) => holds(l) === kind).at(-1);
  return last('findings') ?? last('broken') ?? last('empty');
}

// The CLI sits behind isMain so the parser above can be imported and tested, the same shape as
// links.mjs, req-coverage.mjs and req-ids.mjs.
const isMain = isMainModule(import.meta.url);

if (isMain) {
  const [reportFile, parentIssue] = process.argv.slice(2);
  if (!reportFile || !parentIssue) throw new Error('usage: file-findings.mjs <report-file> <parent-issue|->');

  const report = readFileSync(reportFile, 'utf8');
  const line = findingsLine(report);
  if (!line) {
    console.log('No OUT-OF-SCOPE-FINDINGS line in the report; nothing to file.');
    process.exit(0);
  }

  let findings;
  try {
    findings = payloadOf(line);
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
  const foundBy = parentUrl ? `while working ${parentUrl}` : 'on an exploration of the default branch';

  const sameTitle = (list, title) => list.find((i) => i.title.trim().toLowerCase() === title.trim().toLowerCase());

  for (const { title, body } of findings) {
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
        const reopen = ['issue', 'reopen', String(recurrence.number), '--comment', `Reopened: seen again ${foundBy} after being closed as not reproducible — a recurrence is evidence.\n\n${body}`];
        gh(...reopen);
        if (parentIssue === '-') gh('issue', 'edit', String(recurrence.number), '--add-label', 'needs-human');
        console.log(`${reportVerb(parentIssue)} ${recurrence.url}`);
        continue;
      }
      const trailer = renderLinks(parentUrl ? { origin_issue: parentUrl, depth: String(depth) } : { depth: String(depth) });
      const issueBody = `${body}\n\nFound by the line ${foundBy}.\n\n${trailer}`;
      const create = ['issue', 'create', '--title', title, '--body', issueBody, '--label', 'origin:adlc'];
      if (parentIssue === '-') create.push('--label', 'needs-human');
      const url = gh(...create).trim();
      console.log(`${reportVerb(parentIssue)} ${url}`);
    } catch (err) {
      console.warn(`Could not file "${title}": ${err.message} — continuing.`);
    }
  }
}

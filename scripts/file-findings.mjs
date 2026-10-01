// File out-of-scope findings as issues — the line feeding itself.
//
// The verifier and quality stations emit a machine-readable line in their reports:
//   OUT-OF-SCOPE-FINDINGS: [{"title":"...","body":"..."}]
// This script parses it and files each finding as a new issue, which re-enters the line at
// intake. Two brakes, both mandatory:
//
//   dedupe — an open issue about the same finding is commented on instead of duplicated, even
//            when the title was reworded. A CLOSED not-planned issue about that same finding
//            stays closed: a new wording is not a new decision. A CLOSED not-reproducible
//            issue with the same title is REOPENED (a recurrence is evidence, not a duplicate);
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

const GENERIC = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'on', 'in', 'to', 'for', 'with', 'no', 'not',
  'have', 'has', 'is', 'are', 'only', 'its', 'their', 'from', 'by', 'as', 'was', 'that',
  'this', 'what', 'when', 'does', 'do', 'be', 'been', 'each', 'page',
]);

function contentStems(title) {
  return new Set(
    String(title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .map((w) => (w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w))
      .filter((w) => w.length > 2 && !GENERIC.has(w)),
  );
}

function controlIds(text) {
  const s = String(text).toLowerCase();
  const ids = new Set();
  for (const match of s.matchAll(/#([a-z][\w-]*)/g)) ids.add(match[1]);
  for (const match of s.matchAll(/\[id\^=([^\]]+)\]/g)) ids.add(match[1].replace(/-+$/, ''));
  return ids;
}

function complaints(text) {
  // A class on the selector, such as `.visually-hidden`, names the element.
  // It is not the complaint. Prose ("is visually hidden") still counts.
  const s = String(text).toLowerCase().replace(/\.[a-z0-9_-]+/g, ' ');
  const keys = new Set();
  if (/no visible label|without a visible label|unlabeled|labelled only by aria-label|labeled only by aria-label|named only by aria-label/.test(s)) {
    keys.add('unlabeled');
  }
  if (/visually[- ]hidden|only available to assistive|sighted shoppers never see/.test(s)) keys.add('hidden');
  if (/pressing enter|presses enter|does not place the order|does not submit/.test(s)) keys.add('enter');
  if (/role="alert"|role='alert'|not as an alert|announced politely/.test(s)) keys.add('alert');
  return keys;
}

function sameControls(a, b) {
  const left = controlIds(a);
  const right = controlIds(b);
  if (left.size === 0 || left.size !== right.size) return false;
  for (const id of left) if (!right.has(id)) return false;
  return true;
}

function sharesComplaint(a, b) {
  const left = complaints(a);
  for (const key of complaints(b)) if (left.has(key)) return true;
  return false;
}

const WEAK = new Set(['visible', 'label', 'hidden', 'visually', 'input', 'field', 'button', 'item', 'show', 'see']);

function titleOverlap(a, b) {
  const left = contentStems(a);
  const right = contentStems(b);
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  const union = left.size + right.size - shared;
  return union > 0 && shared >= 2 && shared / union >= 0.5;
}

function distinctiveOverlap(a, b) {
  const left = contentStems(a);
  const right = contentStems(b);
  let shared = 0;
  for (const word of left) if (right.has(word) && !WEAK.has(word)) shared++;
  return shared >= 2;
}

function findingText(finding) {
  return `${finding.title ?? ''}\n${finding.body ?? ''}`;
}

/**
 * The same shopper-facing complaint, including when the model retitles it.
 * The control's id (or `[id^=…]`) must be the same set, and the complaint must
 * be the same kind — a missing label is not a hidden summary. A broader closed
 * issue that names two controls does not swallow a finding about one of them.
 * Titles that still share their content words match even if the selector moved.
 */
export function sameFinding(a, b) {
  const left = findingText(a);
  const right = findingText(b);
  if (sameControls(left, right) && sharesComplaint(left, right)) return true;
  if (titleOverlap(a.title, b.title)) return true;
  // One side may name a selector the other never had. The complaint and two
  // distinctive title words still have to agree, so "no visible label" alone
  // cannot glue a quantity field to an order button.
  return sharesComplaint(left, right) && distinctiveOverlap(a.title, b.title);
}

function titlesEqual(a, b) {
  return String(a.title ?? '').trim().toLowerCase() === String(b.title ?? '').trim().toLowerCase();
}

function isClosed(issue) {
  return String(issue.state ?? '').toUpperCase() === 'CLOSED';
}

/**
 * What to do with one finding given the issues already on the tracker.
 * `suppress` is a closed not-planned decision: comment, and do not file.
 * `reopen` stays exact-title only, and only for not-reproducible.
 */
export function filingDecision(finding, issues) {
  const titled = (issue) => titlesEqual(issue, finding);
  const open = issues.find((issue) => !isClosed(issue) && (titled(issue) || sameFinding(finding, issue)));
  if (open) return { action: 'comment', number: open.number };

  const recurrence = issues.find((issue) => isClosed(issue) && issue.resolution === 'not-reproducible' && titled(issue));
  if (recurrence) return { action: 'reopen', number: recurrence.number };

  const declined = issues.find((issue) => isClosed(issue) && issue.stateReason === 'NOT_PLANNED' && (titled(issue) || sameFinding(finding, issue)));
  if (declined) return { action: 'suppress', number: declined.number };

  return { action: 'file' };
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

  const known = JSON.parse(gh(
    'issue', 'list', '--state', 'all', '--limit', '500',
    '--json', 'number,title,body,state,stateReason,labels,url',
  )).map((issue) => ({
    number: issue.number,
    title: issue.title,
    body: issue.body ?? '',
    state: issue.state,
    stateReason: issue.stateReason,
    url: issue.url,
    resolution: (issue.labels ?? []).some((label) => (label.name ?? label) === 'resolution:not-reproducible')
      ? 'not-reproducible'
      : undefined,
  }));

  for (const { title, body } of findings) {
    try {
      const decision = filingDecision({ title, body }, known);
      if (decision.action === 'comment' || decision.action === 'suppress') {
        const lead = decision.action === 'suppress'
          ? `Seen again ${foundBy}, under different wording. It stays closed as not planned.`
          : `Seen again ${foundBy}:`;
        gh('issue', 'comment', String(decision.number), '--body', `${lead}\n\n${body}`);
        console.log(`#${decision.number} already tracks this finding — commented instead of filing.`);
        continue;
      }
      if (decision.action === 'reopen') {
        const recurrence = known.find((issue) => issue.number === decision.number);
        gh('issue', 'reopen', String(decision.number), '--comment', `Reopened: seen again ${foundBy} after being closed as not reproducible — a recurrence is evidence.\n\n${body}`);
        if (parentIssue === '-') gh('issue', 'edit', String(decision.number), '--add-label', 'needs-human');
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

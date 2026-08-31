// The links block — the one cross-station contract.
//
// Every station starts from the source issue alone, so the issue must record where the work
// went: the spec PR, the OpenSpec change, each implementation PR. Stations write that record
// as a hidden HTML comment — invisible in the rendered issue, exactly parseable — and this
// file is the ONLY code that reads or writes it. It is written deterministically by workflows,
// never trusted to a model.
//
//   <!-- adlc-links v1
//   spec_pr: https://github.com/owner/repo/pull/12
//   openspec_change: openspec/changes/filter-catalog-by-price
//   implementation_pr: https://github.com/owner/repo/pull/34
//   depth: 1
//   -->
//
// Later blocks win per field; implementation_pr accumulates (unique, in first-seen order).
//
// SECURITY: anyone can comment on a public issue, and these values end up in workflow
// commands — so parsing is strict. Every value must match its field's shape (URLs on this
// repo's host, a path slug, a number); anything else is dropped. Workflows must still pass
// these values to shells via env vars, never ${{ }} interpolation.
//
// CLI (used by the workflows; needs `gh` and GH_TOKEN):
//   node scripts/links.mjs read  <issue_number>              -> merged links as JSON on stdout
//   node scripts/links.mjs write <issue_number> key=value... -> comments a new block on the issue
//
// `write` posts only the delta you pass (plus a human-readable note via --note "...").
// Multi-valued: pass implementation_pr=<url> once per URL.

import { execFileSync } from 'node:child_process';

const MARKER = 'adlc-links v1';
const BLOCK = /<!--\s*adlc-links v1\s*\n([\s\S]*?)-->/g;
const MULTI = new Set(['implementation_pr']);

// Field shapes — a value that does not match is dropped, not passed on.
const PR_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+$/;
const SHAPES = {
  spec_pr: PR_URL,
  implementation_pr: PR_URL,
  openspec_change: /^openspec\/changes\/[a-z0-9][a-z0-9-]{0,80}$/,
  repro_run: /^\d+$/,
  depth: /^\d+$/,
  origin_issue: /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/,
};

export function parseLinks(text) {
  const links = {};
  for (const match of (text ?? '').matchAll(BLOCK)) {
    for (const line of match[1].split('\n')) {
      const m = line.match(/^\s*([a-z_]+)\s*:\s*(.+?)\s*$/);
      if (!m) continue;
      const [, key, value] = m;
      if (!SHAPES[key] || !SHAPES[key].test(value)) continue;
      if (MULTI.has(key)) {
        links[key] ??= [];
        if (!links[key].includes(value)) links[key].push(value);
      } else {
        links[key] = value;
      }
    }
  }
  return links;
}

export function renderLinks(links) {
  const lines = [];
  for (const [key, value] of Object.entries(links)) {
    for (const v of Array.isArray(value) ? value : [value]) lines.push(`${key}: ${v}`);
  }
  return `<!-- ${MARKER}\n${lines.join('\n')}\n-->`;
}

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// All comments, paginated — `gh issue view --json comments` stops at 100, and a busy issue
// would silently lose its newest links block or attempt markers past that.
export function issueCommentBodies(issue) {
  const bodies = [];
  for (let page = 1; ; page++) {
    const batch = JSON.parse(
      gh('api', `repos/{owner}/{repo}/issues/${issue}/comments?per_page=100&page=${page}`),
    );
    bodies.push(...batch.map((c) => c.body ?? ''));
    if (batch.length < 100) return bodies;
  }
}

function readIssueLinks(issue) {
  const body = JSON.parse(gh('issue', 'view', issue, '--json', 'body')).body ?? '';
  return parseLinks([body, ...issueCommentBodies(issue)].join('\n'));
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;
const [cmd, issue, ...rest] = isMain ? process.argv.slice(2) : [];

if (cmd === 'read') {
  if (!issue) throw new Error('usage: links.mjs read <issue_number>');
  process.stdout.write(JSON.stringify(readIssueLinks(issue)) + '\n');
} else if (cmd === 'write') {
  if (!issue) throw new Error('usage: links.mjs write <issue_number> key=value... [--note "text"]');
  const delta = {};
  let note = '';
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--note') { note = rest[++i] ?? ''; continue; }
    const eq = rest[i].indexOf('=');
    if (eq < 1) throw new Error(`not key=value: ${rest[i]}`);
    const key = rest[i].slice(0, eq);
    const value = rest[i].slice(eq + 1);
    if (!SHAPES[key] || !SHAPES[key].test(value)) throw new Error(`refusing to write malformed ${key}: ${value}`);
    if (MULTI.has(key)) (delta[key] ??= []).push(value);
    else delta[key] = value;
  }
  const body = (note ? note + '\n\n' : '') + renderLinks(delta);
  gh('issue', 'comment', issue, '--body', body);
} else if (cmd !== undefined) {
  throw new Error(`unknown command: ${cmd}`);
}

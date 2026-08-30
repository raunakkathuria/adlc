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

export function parseLinks(text) {
  const links = {};
  for (const match of (text ?? '').matchAll(BLOCK)) {
    for (const line of match[1].split('\n')) {
      const m = line.match(/^\s*([a-z_]+)\s*:\s*(.+?)\s*$/);
      if (!m) continue;
      const [, key, value] = m;
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
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function readIssueLinks(issue) {
  const raw = gh('issue', 'view', issue, '--json', 'body,comments');
  const { body, comments } = JSON.parse(raw);
  return parseLinks([body, ...comments.map((c) => c.body)].join('\n'));
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
    if (MULTI.has(key)) (delta[key] ??= []).push(value);
    else delta[key] = value;
  }
  const body = (note ? note + '\n\n' : '') + renderLinks(delta);
  gh('issue', 'comment', issue, '--body', body);
} else if (cmd !== undefined) {
  throw new Error(`unknown command: ${cmd}`);
}

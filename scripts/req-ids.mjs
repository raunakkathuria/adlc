// Requirement-id allocation — a deterministic guard, no model in it.
//
// Each spec run reads the living spec and picks "the next free number". Two Planners drafting at
// the same time cannot see each other, so they race: PR #21 added REQ-CAT-4 while PR #11's
// unarchived delta had already added it. Prompt guidance stops most of that; this makes the rest
// impossible to merge, because the spec station runs it before opening the PR.
//
// Two things are wrong and both are checked:
//
//   collision   an ADDED id that the living spec already has, or that another active delta also
//               adds. A MODIFIED id reusing a living id is correct and never flagged — that is
//               how a change revises existing behaviour.
//   unknown     a MODIFIED or REMOVED id that no living requirement has. There is nothing to
//               revise or retire, so the delta is describing something that does not exist.
//
// Archived deltas are history: their ids are already in the living spec, so counting them would
// report every shipped change as a collision.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { collect } from './req-coverage.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQ_ID = /\bREQ-[A-Z]+-\d+\b/g;
const SECTION = /^##\s+(ADDED|MODIFIED|REMOVED)\s+Requirements\s*$/i;

/**
 * Split one delta spec.md into the ids it adds, modifies and removes. Section headers decide
 * which bucket an id lands in, so `### Requirement: REQ-CAT-9` under `## ADDED Requirements`
 * is a claim on a new number, while the same line under `## MODIFIED` is a revision.
 */
export function parseSections(text) {
  const out = { added: new Set(), modified: new Set(), removed: new Set() };
  let bucket = null;
  for (const line of text.split('\n')) {
    const header = line.match(SECTION);
    if (header) { bucket = header[1].toLowerCase(); continue; }
    if (!bucket) continue;
    for (const id of line.match(REQ_ID) ?? []) out[bucket].add(id);
  }
  return out;
}

/**
 * The whole decision, as set arithmetic — so it can be tested without a repo on disk.
 * `living` is every id in openspec/specs/. `deltas` is one entry per active change directory.
 */
export function auditIds({ living, deltas }) {
  const collisions = [];
  const unknown = [];
  const addedBy = new Map(); // id -> [slug]

  for (const { slug, added, modified, removed } of deltas) {
    for (const id of added) {
      if (living.has(id)) {
        collisions.push(`${id} — added by delta '${slug}', but the living spec already has it`);
      }
      addedBy.set(id, [...(addedBy.get(id) ?? []), slug]);
    }
    for (const id of [...modified, ...removed]) {
      if (!living.has(id)) {
        unknown.push(`${id} — delta '${slug}' revises or removes it, but no living requirement has it`);
      }
    }
  }

  for (const [id, slugs] of addedBy) {
    if (slugs.length > 1) {
      collisions.push(`${id} — added by more than one delta at once: ${slugs.join(', ')}`);
    }
  }

  return { collisions, unknown };
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const living = new Set((await collect('openspec/specs', /^spec\.md$/, { recursive: true })).keys());

  const deltas = [];
  try {
    for (const entry of await readdir(join(ROOT, 'openspec/changes'), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'archive') continue;
      const merged = { slug: entry.name, added: new Set(), modified: new Set(), removed: new Set() };
      const specs = join(ROOT, 'openspec/changes', entry.name, 'specs');
      let files = [];
      try {
        files = (await readdir(specs, { recursive: true, withFileTypes: true }))
          .filter((f) => f.isFile() && f.name === 'spec.md');
      } catch {} // a delta with no specs/ yet is not this guard's business
      for (const f of files) {
        const parsed = parseSections(await readFile(join(f.parentPath, f.name), 'utf8'));
        for (const bucket of ['added', 'modified', 'removed']) {
          for (const id of parsed[bucket]) merged[bucket].add(id);
        }
      }
      deltas.push(merged);
    }
  } catch {} // no changes/ directory is a fine state

  const { collisions, unknown } = auditIds({ living, deltas });

  for (const d of deltas) {
    const claim = [...d.added].sort().join(', ') || 'nothing new';
    console.log(`  ${d.slug}: adds ${claim}`);
  }

  if (collisions.length === 0 && unknown.length === 0) {
    console.log(`\nreq-ids: ${living.size} live, ${deltas.length} in flight, no id claimed twice.`);
    process.exit(0);
  }
  if (collisions.length > 0) console.error(`\nreq-ids FAILED — id already taken:\n  ${collisions.join('\n  ')}`);
  if (unknown.length > 0) console.error(`\nreq-ids FAILED — nothing to revise:\n  ${unknown.join('\n  ')}`);
  process.exit(1);
}

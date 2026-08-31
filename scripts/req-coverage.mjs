// Requirement coverage — a deterministic gate with no model in it.
//
// Every REQ id written in the living spec (openspec/specs/) must be named by at least one test
// in test/, and every REQ id a test claims must exist in the living spec. That is all it checks.
// It cannot tell you whether the test asserts the right thing — only that somebody wrote one.
//
// In-flight deltas (openspec/changes/<slug>/specs/, archive excluded) count as specified too:
// on an implementation branch the delta IS the requirement the new tests name, and it stays
// valid until finalize archives it into the living spec. Archived deltas are history, not spec.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQ_ID = /\bREQ-[A-Z]+-\d+\b/g;

async function collect(dir, filePattern, { recursive = false } = {}) {
  const byId = new Map();
  const entries = await readdir(join(ROOT, dir), { recursive, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !filePattern.test(entry.name)) continue;
    const path = join(entry.parentPath, entry.name);
    const text = await readFile(path, 'utf8');
    for (const id of text.match(REQ_ID) ?? []) {
      if (!byId.has(id)) byId.set(id, new Set());
      byId.get(id).add(path.slice(ROOT.length + 1));
    }
  }
  return byId;
}

const specified = await collect('openspec/specs', /^spec\.md$/, { recursive: true });
try {
  for (const [id, where] of await collect('openspec/changes', /^spec\.md$/, { recursive: true })) {
    for (const path of where) {
      if (path.includes('/archive/')) continue;
      if (!specified.has(id)) specified.set(id, new Set());
      specified.get(id).add(path);
    }
  }
} catch {} // no changes/ directory is a fine state

for (const [id, where] of specified) if (where.size === 0) specified.delete(id);

const tested = await collect('test', /\.test\.js$/);

const uncovered = [...specified.keys()].filter((id) => !tested.has(id)).sort();
const unknown = [...tested.keys()].filter((id) => !specified.has(id)).sort();

for (const id of [...specified.keys()].sort()) {
  const where = tested.get(id);
  console.log(`  ${where ? '✓' : '✗'} ${id}  ${where ? [...where].join(', ') : 'NO TEST'}`);
}

if (uncovered.length === 0 && unknown.length === 0) {
  console.log(`\nreq-coverage: ${specified.size} requirements, all covered.`);
  process.exit(0);
}

if (uncovered.length > 0) {
  console.error(`\nreq-coverage FAILED — specified but never tested:\n  ${uncovered.join('\n  ')}`);
}
if (unknown.length > 0) {
  console.error(`\nreq-coverage FAILED — tests cite requirements that are not in openspec/specs/:\n  ${unknown.join('\n  ')}`);
}
process.exit(1);

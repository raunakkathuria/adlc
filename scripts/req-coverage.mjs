// Requirement coverage — a deterministic gate with no model in it.
//
// Every REQ id written in the living spec (openspec/specs/) must be named by at least one test
// in test/, and every REQ id a test claims must be a requirement that exists. That is all it
// checks. It cannot tell you whether the test asserts the right thing — only that somebody
// wrote one.
//
// In-flight deltas (openspec/changes/<slug>/specs/, archive excluded) make an id KNOWN but not
// yet OWED, and the difference is load-bearing. A spec PR contains only the delta: the
// requirement exists, and its tests arrive later, with the implementation built from it. Counting
// a delta as owing a test would therefore fail every spec PR by construction — a red gate on the
// one artifact a human is being asked to approve at Gate 1. Known-but-not-owed keeps the other
// direction working: a test on the implementation PR may name the delta it implements. When
// finalize archives the delta into openspec/specs/, the requirement starts owing a test like
// every other. Archived deltas are history, not spec.

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

/**
 * The whole decision, as set arithmetic — so it can be tested without a repo on disk.
 *
 * `specified` owes a test (the living spec). `known` is every id that legitimately exists,
 * the living spec plus in-flight deltas. `tested` is what the tests name.
 */
export function audit({ specified, known, tested }) {
  return {
    uncovered: [...specified].filter((id) => !tested.has(id)).sort(),
    unknown: [...tested].filter((id) => !known.has(id)).sort(),
  };
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const spec = await collect('openspec/specs', /^spec\.md$/, { recursive: true });

  const delta = new Map();
  try {
    for (const [id, where] of await collect('openspec/changes', /^spec\.md$/, { recursive: true })) {
      for (const path of where) {
        if (path.includes('/archive/')) continue;
        if (!delta.has(id)) delta.set(id, new Set());
        delta.get(id).add(path);
      }
    }
  } catch {} // no changes/ directory is a fine state

  const tested = await collect('test', /\.test\.js$/);

  const { uncovered, unknown } = audit({
    specified: new Set(spec.keys()),
    known: new Set([...spec.keys(), ...delta.keys()]),
    tested: new Set(tested.keys()),
  });

  for (const id of [...spec.keys()].sort()) {
    const where = tested.get(id);
    console.log(`  ${where ? '✓' : '✗'} ${id}  ${where ? [...where].join(', ') : 'NO TEST'}`);
  }

  // In flight: listed so a human at Gate 1 can see what the delta adds, but not owed a test.
  for (const id of [...delta.keys()].filter((id) => !spec.has(id)).sort()) {
    const where = tested.get(id);
    console.log(`  ${where ? '✓' : '·'} ${id}  ${where ? [...where].join(', ') : `in flight — ${[...delta.get(id)].join(', ')}`}`);
  }

  if (uncovered.length === 0 && unknown.length === 0) {
    console.log(`\nreq-coverage: ${spec.size} requirements, all covered${delta.size ? `; ${[...delta.keys()].filter((id) => !spec.has(id)).length} in flight` : ''}.`);
    process.exit(0);
  }

  if (uncovered.length > 0) {
    console.error(`\nreq-coverage FAILED — specified but never tested:\n  ${uncovered.join('\n  ')}`);
  }
  if (unknown.length > 0) {
    console.error(`\nreq-coverage FAILED — tests cite requirements that are in neither openspec/specs/ nor an in-flight delta:\n  ${unknown.join('\n  ')}`);
  }
  process.exit(1);
}

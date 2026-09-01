// Requirement coverage — a deterministic gate with no model in it.
//
// Every REQ id written in the living spec (openspec/specs/) must be named by at least one test
// in test/, and every REQ id a test claims must be a requirement that exists. That is all it
// checks. It cannot tell you whether the test asserts the right thing — only that somebody
// wrote one.
//
// In-flight deltas (openspec/changes/<slug>/specs/, archive excluded) make an id KNOWN, and a
// delta whose tasks.md is fully ticked makes its ids OWED as well. The difference is load-bearing:
//
//   nothing ticked   a spec PR is nothing but the delta — the requirement exists and its tests
//                    arrive later, with the implementation. Owing a test here would fail every
//                    spec PR by construction, reddening the one artifact Gate 1 must approve.
//   fully ticked     the build says the work is done, so the tests must exist. This is the same
//                    condition the verifier requires for SPEC-MATCH: COMPLETE, read
//                    deterministically and earlier — build.yml runs this gate BEFORE opening the
//                    implementation PR, so a forgotten test costs no PR and no loop-cap attempt.
//
// Either way a test may name an in-flight id: that is what makes an implementation PR's new tests
// legal. When finalize archives the delta into openspec/specs/, the requirement owes a test like
// every other. Archived deltas are history, not spec.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQ_ID = /\bREQ-[A-Z]+-\d+\b/g;

export async function collect(dir, filePattern, { recursive = false } = {}) {
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

/**
 * Does this delta's tasks.md claim the work is finished? Every box ticked, and at least one box.
 *
 * Lenient about what counts as a box (`- [X]`, `* [x]`, indented) because failing to recognise a
 * tick would drop enforcement without saying so.
 *
 * The `at least one box` guard drops enforcement without saying so too, for a tasks.md that is
 * missing or written as prose — an accepted blind spot, because both alternatives are worse.
 * Treating no-boxes as finished would owe tests that cannot exist yet and redden the spec PR,
 * which is the bug this two-stage rule exists to fix. Erroring would add a way for the gate to
 * fail over a malformed delta that people and the spec-review lenses already read. If a third
 * reader ever needs it, make it visible in the listing rather than fatal.
 */
export function tasksComplete(tasksText) {
  const boxes = tasksText.match(/^[ \t]*[-*]\s\[[ xX]\]/gm) ?? [];
  return boxes.length > 0 && boxes.every((box) => !box.endsWith('[ ]'));
}

/**
 * The all-clear line. Counts what was ENFORCED (`owed`), not the living spec — a delta that is
 * owed and covered has been checked, and reporting it only as "in flight" understated the gate.
 * `inFlight` is the remainder: ids that legitimately owe nothing yet.
 */
export function summarise({ owed, inFlight }) {
  const n = owed.size;
  return `req-coverage: ${n} requirement${n === 1 ? '' : 's'}, all covered` +
    (inFlight.size ? `; ${inFlight.size} in flight` : '') + '.';
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

  // Tick state is per change directory, so ask each one whether it claims to be done.
  const slugOf = (path) => path.split('/')[2];
  const finished = new Set();
  for (const slug of new Set([...delta.values()].flatMap((paths) => [...paths].map(slugOf)))) {
    const tasks = await readFile(join(ROOT, 'openspec/changes', slug, 'tasks.md'), 'utf8').catch(() => '');
    if (tasksComplete(tasks)) finished.add(slug);
  }

  const owed = new Set(spec.keys());
  for (const [id, paths] of delta) {
    if ([...paths].some((path) => finished.has(slugOf(path)))) owed.add(id);
  }

  const tested = await collect('test', /\.test\.js$/);

  const { uncovered, unknown } = audit({
    specified: owed,
    known: new Set([...spec.keys(), ...delta.keys()]),
    tested: new Set(tested.keys()),
  });

  for (const id of [...spec.keys()].sort()) {
    const where = tested.get(id);
    console.log(`  ${where ? '✓' : '✗'} ${id}  ${where ? [...where].join(', ') : 'NO TEST'}`);
  }

  // In flight: listed so a human at Gate 1 can see what the delta adds. Marked `·` while the
  // delta is still open, `✗` once it claims to be finished and the test is still missing.
  for (const id of [...delta.keys()].filter((id) => !spec.has(id)).sort()) {
    const where = tested.get(id);
    if (where) console.log(`  ✓ ${id}  ${[...where].join(', ')}`);
    else if (owed.has(id)) console.log(`  ✗ ${id}  NO TEST — tasks.md is fully ticked, so this owes one`);
    else console.log(`  · ${id}  in flight — ${[...delta.get(id)].join(', ')}`);
  }

  if (uncovered.length === 0 && unknown.length === 0) {
    const inFlight = new Set([...delta.keys()].filter((id) => !owed.has(id)));
    console.log('\n' + summarise({ owed, inFlight }));
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

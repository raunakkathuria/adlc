// Requirement coverage — a deterministic gate with no model in it.
//
// Every REQ id written in spec/ must be named by at least one test in test/, and every REQ id a
// test claims must exist in spec/. That is all it checks. It cannot tell you whether the test
// asserts the right thing — only that somebody wrote one. Remember that during exercise 1.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQ_ID = /\bREQ-[A-Z]+-\d+\b/g;

async function collect(dir, filePattern) {
  const byId = new Map();
  for (const name of await readdir(join(ROOT, dir))) {
    if (!filePattern.test(name)) continue;
    const text = await readFile(join(ROOT, dir, name), 'utf8');
    for (const id of text.match(REQ_ID) ?? []) {
      if (!byId.has(id)) byId.set(id, new Set());
      byId.get(id).add(`${dir}/${name}`);
    }
  }
  return byId;
}

const specified = await collect('spec', /\.md$/);
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
  console.error(`\nreq-coverage FAILED — tests cite requirements that are not in spec/:\n  ${unknown.join('\n  ')}`);
}
process.exit(1);

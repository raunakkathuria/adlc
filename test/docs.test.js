// The docs are part of the product here, so their links are worth a gate.
//
// A README that points at a file which is not there is the cheapest possible defect to ship and
// one of the most embarrassing to ship publicly. This walks every tracked markdown file and
// resolves every relative link and image in it. Nothing here reads a model or a network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.adlc', 'work', '.agents', '.claude', '.buildwright']);

function markdown(dir = root, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) markdown(p, found);
    else if (entry.name.endsWith('.md')) found.push(p);
  }
  return found;
}

// [text](target) and ![alt](target), skipping absolute URLs, anchors and mailto.
const LINK = /!?\[[^\]]*\]\(([^)\s]+)\)/g;

test('docs: every relative link and image in every markdown file resolves', () => {
  const broken = [];
  for (const file of markdown()) {
    const text = readFileSync(file, 'utf8');
    for (const [, target] of text.matchAll(LINK)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const [path] = target.split('#');
      if (!path) continue;
      if (!existsSync(normalize(join(dirname(file), path)))) {
        broken.push(`${relative(root, file)} → ${target}`);
      }
    }
  }
  assert.deepEqual(broken, [], 'these point at files that are not there');
});

test("docs: the README's diagrams are present and are real SVGs", () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const images = [...readme.matchAll(/!\[[^\]]*\]\((docs\/img\/[^)\s]+)\)/g)].map((m) => m[1]);
  assert.ok(images.length >= 2, 'the README explains the line with diagrams; keep them referenced');
  for (const img of images) {
    const p = join(root, img);
    assert.ok(existsSync(p), `${img} is referenced but missing`);
    const svg = readFileSync(p, 'utf8');
    assert.match(svg, /^<svg /, `${img} must be an SVG`);
    assert.match(svg, /<title>/, `${img} needs a <title> — it is read out to anyone using a screen reader`);
    assert.ok(statSync(p).size < 64 * 1024, `${img} is unexpectedly large for a line drawing`);
  }
});

test('docs: every diagram in docs/img is actually referenced', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const orphans = readdirSync(join(root, 'docs/img')).filter((f) => !readme.includes(f));
  assert.deepEqual(orphans, [], 'an unreferenced asset is the kind of leftover this repo just cleaned out');
});

test("docs: any-model.md's seam snippet is the code that actually ships", () => {
  const doc = readFileSync(join(root, 'docs/any-model.md'), 'utf8');
  const runner = readFileSync(join(root, 'scripts/run-station.sh'), 'utf8');
  const snippet = doc.match(/```bash\n(if \[ -n "\$\{ADLC_BASE_URL[\s\S]*?)```/);
  assert.ok(snippet, 'the doc explains the seam by quoting it; keep the snippet');
  assert.ok(
    runner.includes(snippet[1].trim()),
    'the quoted seam has drifted from scripts/run-station.sh — a doc that quotes stale code is worse ' +
      'than one that only describes it',
  );
});

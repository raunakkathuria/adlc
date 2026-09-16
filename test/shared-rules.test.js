// A rule stated once in a shared prompt must be implemented once.
//
// The prompts are the single definition of each station and BOTH drivers run them, which quietly
// creates a second place for every rule that needs reading as well as writing. It has happened
// twice. The verdict rule from prompts/review.md was written in JS for local/build.mjs and in shell
// for build.yml, by the same author from the same sentence, and the copies disagreed within the
// hour: `APPROVED — looks good` passed in CI and parked locally. The citation rule from
// prompts/build.md went the same way and already differed on trailing whitespace.
//
// Both were fixed by moving the rule into scripts/, where labels.mjs, attempts.mjs and links.mjs
// already live for exactly this reason. This test is what stops the third one: a weed pulled twice
// is a missing gate.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The shape each rule matches on, and the one file allowed to contain it. Adding a third shared
// rule costs one line here.
const SHARED_RULES = [
  { name: 'the review verdict', shape: '(APPROVE|REQUEST CHANGES)', owner: 'scripts/review-verdict.mjs' },
  { name: 'the proof-of-red citations', shape: '(Red|Characterization)', owner: 'scripts/red-citations.mjs' },
];

// Everywhere a driver could inline a copy instead of calling the owner.
const drivers = [
  ...readdirSync(join(root, '.github/workflows')).filter((f) => f.endsWith('.yml')).map((f) => `.github/workflows/${f}`),
  ...readdirSync(join(root, 'local')).filter((f) => f.endsWith('.mjs')).map((f) => `local/${f}`),
];

for (const { name, shape, owner } of SHARED_RULES) {
  test(`shared rules: ${name} is owned by ${owner}`, () => {
    assert.ok(existsSync(join(root, owner)), `${owner} does not exist — the table names an owner that is not there`);
    assert.ok(
      readFileSync(join(root, owner), 'utf8').includes(shape),
      `${owner} does not contain ${shape} — the table has rotted into a check of nothing`,
    );
  });

  test(`shared rules: no driver inlines ${name}`, () => {
    const inlined = drivers.filter((f) => readFileSync(join(root, f), 'utf8').includes(shape));
    assert.deepEqual(
      inlined,
      [],
      `${inlined.join(', ')} inline ${shape} instead of going through ${owner}. `
        + 'Two copies of one rule drift, and the drift is invisible because both read as authoritative.',
    );
  });
}

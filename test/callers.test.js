// Contract tests for the adoption kit.
//
// The six caller files are the one part of this repo that never runs here — this repo calls its
// stations by local path, so the callers an adopting team copies were unexecuted by construction.
// Every one of them restated its station's `concurrency` group verbatim, and a called workflow
// does apply its own concurrency: the station waited for a group its own caller was holding, and
// the run died as "a workflow file issue" with no job and no log. The whole adoption path was
// broken and nothing here could tell.
//
// These assertions are what a real adopter would otherwise discover for us.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const callerDir = join(root, '.github/workflows/callers');
const callers = readdirSync(callerDir).filter((f) => f.endsWith('.yml'));

test('callers: the kit ships one caller per station', () => {
  assert.deepEqual(
    callers.sort(),
    ['build.yml', 'finalize.yml', 'intake.yml', 'quality.yml', 'spec.yml', 'verifier.yml'],
    'six stations, six callers',
  );
});

for (const file of callers) {
  const text = readFileSync(join(callerDir, file), 'utf8');

  test(`callers: ${file} declares no concurrency of its own`, () => {
    assert.equal(
      /^concurrency:/m.test(text),
      false,
      'the station declares concurrency and a called workflow applies it, so a group named in ' +
        'both deadlocks the station against its caller before any job starts',
    );
  });

  test(`callers: ${file} calls a station that exists`, () => {
    const ref = text.match(/uses:\s*raunakkathuria\/adlc\/\.github\/workflows\/([a-z]+\.yml)@/);
    assert.ok(ref, 'the caller must point at a station in this repo');
    assert.ok(
      existsSync(join(root, '.github/workflows', ref[1])),
      `${ref[1]} does not exist in .github/workflows/`,
    );
    assert.equal(ref[1], file, 'each caller calls the station of the same name');
  });

  test(`callers: ${file} pins uses: and adlc_ref: to the same ref`, () => {
    const used = (text.match(/uses:\s*raunakkathuria\/adlc\/\.github\/workflows\/[a-z]+\.yml@(\S+)/) ?? [])[1];
    const passed = (text.match(/^\s*adlc_ref:\s*(\S+)/m) ?? [])[1];
    assert.ok(used, 'the caller must pin a ref');
    if (passed !== undefined) {
      assert.equal(
        passed,
        used,
        'the station code and the prompts/scripts it checks out would otherwise come from ' +
          'two different refs',
      );
    }
  });
}

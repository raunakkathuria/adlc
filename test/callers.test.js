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

// The stations that run the adopter's code, and what they must not assume about it.
//
// verifier.yml and quality.yml used to run `node app/server.mjs` and poll
// `http://localhost:3000/api/items` — this repo's entrypoint, port and route. On any other repo
// the app never came up and the line stalled at state:verifying. And no station installed the
// adopter's dependencies, so their gate died on "Cannot find module" before a PR could open.
// Both were invisible here, because this repo is the app and has no dependencies.

const stationDir = join(root, '.github/workflows');
const APP_STATIONS = ['verifier.yml', 'quality.yml'];
const STATIONS = ['intake.yml', 'spec.yml', 'build.yml', 'verifier.yml', 'quality.yml', 'finalize.yml'];
// Derived, never listed: a hand-kept list of which stations need an install is the same shape as
// the bug above — something the code does not check. Ask instead which stations run the adopter's
// code, and require exactly those to install it.
const RUNS_ADOPTER_CODE = /npm test|npm run verify|sh -c "\$START_COMMAND"/;

for (const file of APP_STATIONS) {
  const text = readFileSync(join(stationDir, file), 'utf8');

  test(`stations: ${file} takes start_command and health_url`, () => {
    for (const input of ['start_command', 'health_url']) {
      assert.match(text, new RegExp(`^ {6}${input}:`, 'm'), `${input} must be a workflow_call input`);
    }
  });

  test(`stations: ${file} starts the app through those inputs, not a hardcoded path`, () => {
    assert.match(text, /sh -c "\$START_COMMAND"/, 'the start command must come from the input');
    assert.match(text, /curl -sf "\$HEALTH_URL"/, 'the readiness poll must use the input');
  });

  test(`stations: ${file} hardcodes this repo's app only as a default`, () => {
    const offenders = text
      .split('\n')
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => /app\/server\.mjs|localhost:3000/.test(line))
      .filter(([, line]) => !/^\s*(default:|[A-Z_]+: \$\{\{)/.test(line));
    assert.deepEqual(offenders, [], 'this repo may only be the default, never the assumption');
  });
}

test("stations: every station that runs the adopter's code installs it first", () => {
  const missing = STATIONS.filter((file) => {
    const text = readFileSync(join(stationDir, file), 'utf8');
    return RUNS_ADOPTER_CODE.test(text) && !/scripts\/install-deps\.sh/.test(text);
  });
  assert.deepEqual(missing, [], 'these run the adopter\'s npm scripts or app without installing');
});

test("stations: spec.yml is the one that needs no install, and that is not an oversight", () => {
  const text = readFileSync(join(stationDir, 'spec.yml'), 'utf8');
  assert.equal(RUNS_ADOPTER_CODE.test(text), false, 'the Planner writes the delta and nothing else');
  assert.doesNotMatch(text, /Bash\(npm:/, 'the Planner is not allowed npm, so it cannot run their code');
});

test('stations: build.yml installs before the Executor, not after it', () => {
  const text = readFileSync(join(stationDir, 'build.yml'), 'utf8');
  assert.ok(
    text.indexOf('install-deps.sh') < text.indexOf('prompts/build.md'),
    'the Executor works red-green, so it runs the suite itself — with no node_modules every one ' +
      'of its runs fails with "Cannot find module" and it cannot work at all',
  );
});

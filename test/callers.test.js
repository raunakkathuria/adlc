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
import { execFileSync } from 'node:child_process';
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

// The provider seam: every agent step must be able to reach a gateway.
//
// The demo runs on Claude keys, but nothing in the line is Anthropic-specific: the prompts name no
// vendor, and `scripts/run-station.sh` is the one place the runner's own variable names appear. That
// only holds if every agent step actually passes the seam through — miss one and that single station
// silently talks to Anthropic while the rest of the line talks to the gateway, which is worse than
// not supporting it at all.

const AGENT_ENV = ['ADLC_BASE_URL', 'ADLC_MODEL'];
// The runner's own variable names, which belong in scripts/run-station.sh and nowhere else.
const RUNNER_VARS = /ANTHROPIC_BASE_URL|ANTHROPIC_MODEL|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN/;

test('stations: every agent step passes the provider seam', () => {
  const missing = [];
  for (const file of STATIONS) {
    const text = readFileSync(join(stationDir, file), 'utf8');
    // A step is an agent step if it invokes the station runner.
    for (const step of text.split(/^      - name: /m).slice(1)) {
      if (!step.includes('run-station.sh')) continue;
      const name = step.split('\n')[0].trim();
      for (const key of AGENT_ENV) {
        if (!step.includes(`${key}: \${{ vars.${key} }}`)) missing.push(`${file} → ${name} → ${key}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'these agent steps cannot reach a gateway');
});

test('run-station.sh maps the seam to the runner, and nothing else does', () => {
  const runner = readFileSync(join(root, 'scripts/run-station.sh'), 'utf8');
  assert.match(runner, /ANTHROPIC_BASE_URL="\$ADLC_BASE_URL"/, 'the base URL must reach the CLI');
  assert.match(runner, /ANTHROPIC_MODEL="\$ADLC_MODEL"/, 'the model must reach the CLI');
  assert.match(runner, /ANTHROPIC_API_KEY="\$ADLC_API_KEY"/, 'the credential must reach the CLI');
  // The runner's own names belong here and nowhere else — that is what "swapping the runner is one
  // file" means. A workflow naming ANTHROPIC_* would quietly re-couple the line to one vendor.
  for (const file of STATIONS) {
    const text = readFileSync(join(stationDir, file), 'utf8');
    assert.doesNotMatch(text, RUNNER_VARS,
      `${file} names a runner-specific variable; that belongs in scripts/run-station.sh`);
  }
  // …and the callers an adopter copies must ask for the line's own secret, not a vendor's.
  for (const file of readdirSync(callerDir).filter((f) => f.endsWith('.yml'))) {
    assert.doesNotMatch(readFileSync(join(callerDir, file), 'utf8'), RUNNER_VARS,
      `${file} names a runner-specific variable in the adoption kit`);
  }
});

test('stations: the credential secret is declared under the line\'s own name', () => {
  for (const file of STATIONS) {
    const text = readFileSync(join(stationDir, file), 'utf8');
    if (!text.includes('run-station.sh')) continue;
    assert.match(text, /^ {6}ADLC_API_KEY:$/m,
      `${file} must declare ADLC_API_KEY in workflow_call.secrets so a caller can inherit it`);
    assert.match(text, /KEY: \$\{\{ secrets\.ADLC_API_KEY \}\}/,
      `${file}'s off-switch must read the same secret the agent steps use`);
  }
});

// Repo-wide: the runner's own variable names live in three files, and the reason differs each time.
//
// The workflow-level guard above stops a station or caller naming them. This one is the wider claim
// — "swapping the runner is one file" — and it is the claim a reader is most likely to check. A
// fourth file picking up ANTHROPIC_* is how that stops being true: run.sh, check.sh, a doc example,
// a new script. None of those would fail any other assertion here.

test('the runner\'s variable names appear only in the seam, its guard, and the doc quoting it', () => {
  const allowed = {
    'scripts/run-station.sh': 'the seam — the one place ADLC_* is mapped to the CLI',
    'test/callers.test.js': 'this file, which asserts the mapping',
    'docs/any-model.md': 'quotes the seam, and docs.test.js proves the quote has not drifted',
  };
  const tracked = execFileSync('git', ['grep', '-l', 'ANTHROPIC', '--', '.'], {
    cwd: root, encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
  const unexpected = tracked.filter((f) => !(f in allowed));
  assert.deepEqual(
    unexpected,
    [],
    'these name a runner-specific variable outside the seam; map it in scripts/run-station.sh instead',
  );
});

// Contract tests for the workflow shell linter.
//
// A `run:` block is shell, but nothing was checking it: actionlint delegates shell linting to
// shellcheck and silently skips it when shellcheck is absent, and CI linted no workflows at all.
// An `if` with no `fi` therefore sat in intake.yml from the start, and the reproduce station —
// the whole bug path of the line — could never run.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runBlocks } from '../scripts/lint-workflows.mjs';

const SAMPLE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures/workflow-sample.yml'), 'utf8');

test('lint-workflows: every run block is extracted, and only run blocks', () => {
  const blocks = runBlocks(SAMPLE);
  assert.equal(blocks.length, 3, 'three run: blocks, the uses: step is not one');
});

test('lint-workflows: a block keeps its own indentation stripped, so it is valid shell', () => {
  const [first] = runBlocks(SAMPLE);
  assert.equal(first.script.split('\n')[0], 'if true; then');
});

test('lint-workflows: the reported line number points at the run: key', () => {
  const blocks = runBlocks(SAMPLE);
  assert.ok(blocks.every((b) => b.line > 0));
  assert.ok(blocks[1].line > blocks[0].line);
});

test('lint-workflows: ${{ }} is neutralised — it never reaches the shell literally', () => {
  const last = runBlocks(SAMPLE).at(-1);
  assert.doesNotMatch(last.script, /\$\{\{/);
});

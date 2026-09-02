// Shell syntax in workflow `run:` blocks — a deterministic check with nothing to install.
//
// A run block is a shell script, and nothing was checking it. actionlint delegates shell linting
// to shellcheck and skips it silently when shellcheck is absent; CI linted no workflows at all.
// So `if npm test; then … else …` with no `fi` sat in intake.yml from the beginning, and the
// reproduce station — the entire bug path of this line — failed on its first line every time it
// was reached. It was found only by running a bug through, months of green actionlint later.
//
// `bash -n` parses without executing, which is exactly the check that was missing.

import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every `run: |` block in a workflow, de-indented into runnable shell.
 *
 * `${{ … }}` is replaced rather than kept: GitHub substitutes it before the shell ever sees it,
 * so leaving it in would report syntax errors that cannot happen. It becomes a bare word, which
 * is what a substituted expression usually is.
 */
export function runBlocks(yaml) {
  const lines = yaml.split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^(\s*)run: \|/);
    if (!open) continue;
    const indent = open[1].length + 2;
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const blank = lines[j].trim() === '';
      const deep = lines[j].length - lines[j].trimStart().length >= indent;
      if (!blank && !deep) break;
      body.push(lines[j].slice(indent));
    }
    blocks.push({ line: i + 1, script: body.join('\n').replace(/\$\{\{[^}]*\}\}/g, 'EXPR') });
    i = j - 1;
  }
  return blocks;
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const dir = '.github/workflows';
  const files = (await readdir(join(ROOT, dir), { recursive: true, withFileTypes: true }))
    .filter((f) => f.isFile() && f.name.endsWith('.yml'))
    .map((f) => join(f.parentPath, f.name));

  let checked = 0;
  const broken = [];
  for (const file of files.sort()) {
    for (const { line, script } of runBlocks(await readFile(file, 'utf8'))) {
      checked++;
      try {
        execFileSync('bash', ['-n'], { input: script, stdio: ['pipe', 'ignore', 'pipe'] });
      } catch (err) {
        const why = String(err.stderr ?? '').trim().split('\n')[0];
        broken.push(`${file.slice(ROOT.length + 1)}:${line} — ${why}`);
      }
    }
  }

  if (broken.length === 0) {
    console.log(`lint-workflows: ${checked} run blocks, all valid shell.`);
    process.exit(0);
  }
  console.error(`\nlint-workflows FAILED — a run block is not valid shell:\n  ${broken.join('\n  ')}`);
  process.exit(1);
}

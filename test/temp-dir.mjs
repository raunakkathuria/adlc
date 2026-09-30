// Scratch directories for the tests that need real files — git repositories, symlinks — removed when
// the test file finishes.
//
// Each of these tests made its directory with mkdtempSync and never removed it, so every run left
// them behind in tmpdir(): over a hundred adlc-impl-* and adlc-conflict-* from the local-driver
// tests alone. rmSync removes a symlink inside a directory without following it, so a directory
// holding a link to the repository is safe to remove.

import { after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const made = [];
after(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A new directory under tmpdir(), named `<prefix>…`, removed once this test file is done. */
export function tempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}

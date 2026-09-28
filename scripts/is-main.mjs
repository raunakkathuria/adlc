// Whether a module is the script node was started with — one check for every script with a CLI.
//
// Each of eleven files guarded its CLI with its own copy of
//   import.meta.url === new URL(`file://${process.argv[1]}`).href
// import.meta.url is the module's real path; process.argv[1] is the path it was started by. Through a
// symlink — macOS's /tmp and /var are both one — the two differ, the copy read false, and the script
// did nothing and exited 0: req-coverage reported success without checking coverage, and
// review-verdict passed an empty review. Comparing real paths is what every copy meant.

import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** True when `moduleUrl` (pass `import.meta.url`) is the script this process was started with. */
export function isMainModule(moduleUrl) {
  if (!process.argv[1]) return false; // `node -e`, a REPL: no script was started
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href === moduleUrl;
  } catch {
    return false; // a start path that no longer resolves on disk
  }
}

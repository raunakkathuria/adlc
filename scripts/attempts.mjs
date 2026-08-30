// Loop caps — the brake on unattended self-repair.
//
// A station's findings can bounce work back MAX_ATTEMPTS times; the next failure parks the
// issue for a human. Attempts are recorded as hidden marker comments on the source issue, so
// the count survives runner restarts and re-runs — state lives on the issue, never in a runner.
//
//   node scripts/attempts.mjs record <issue> <station>   -> record one attempt, print the count
//   node scripts/attempts.mjs count  <issue> <station>   -> print the count
//
// Exit code of `record`: 0 while within the cap, 1 when this attempt EXCEEDS the cap — the
// workflow parks the issue instead of looping again. The cap is a constant, not configuration:
// two automated round-trips per station, then a person. A knob nobody has asked to turn is YAGNI.

import { execFileSync } from 'node:child_process';

export const MAX_ATTEMPTS = 2;

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function count(issue, station) {
  const { comments } = JSON.parse(gh('issue', 'view', issue, '--json', 'comments'));
  const marker = `<!-- adlc-attempt ${station} -->`;
  return comments.filter((c) => c.body.includes(marker)).length;
}

const [cmd, issue, station] = process.argv.slice(2);

if (cmd === 'count') {
  process.stdout.write(String(count(issue, station)) + '\n');
} else if (cmd === 'record') {
  const n = count(issue, station) + 1;
  gh('issue', 'comment', issue, '--body', `<!-- adlc-attempt ${station} -->\nAutomated ${station} attempt ${n} of ${MAX_ATTEMPTS}.`);
  process.stdout.write(String(n) + '\n');
  if (n > MAX_ATTEMPTS) process.exit(1);
} else if (cmd !== undefined) {
  throw new Error(`unknown command: ${cmd}`);
}

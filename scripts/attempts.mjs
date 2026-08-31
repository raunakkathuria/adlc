// Loop caps — the brake on unattended self-repair.
//
// A station's findings can bounce work back MAX_ATTEMPTS times; the next failure parks the
// issue for a human. Attempts are recorded as hidden marker comments on the source issue, so
// the count survives runner restarts and re-runs — state lives on the issue, never in a runner.
//
//   node scripts/attempts.mjs record <issue> <station>   -> record one attempt, print the count
//   node scripts/attempts.mjs count  <issue> <station>   -> print the count
//   node scripts/attempts.mjs reset  <issue> <station>   -> start a fresh cycle
//
// Exit code of `record`: 0 while within the cap, 1 when this attempt EXCEEDS the cap — the
// workflow then parks the issue AND posts a reset marker, so the count starts fresh for the
// next human-initiated cycle (a park that could never be un-parked would be a dead end, not
// a brake). The cap is a constant, not configuration: two automated round-trips per station,
// then a person. A knob nobody has asked to turn is YAGNI.

import { execFileSync } from 'node:child_process';
import { issueCommentBodies } from './links.mjs';

export const MAX_ATTEMPTS = 2;

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function markers(issue, station) {
  const attempt = `<!-- adlc-attempt ${station} -->`;
  const reset = `<!-- adlc-attempts-reset ${station} -->`;
  const bodies = issueCommentBodies(issue);
  const lastReset = bodies.findLastIndex((b) => b.includes(reset));
  return bodies.slice(lastReset + 1).filter((b) => b.includes(attempt)).length;
}

const [cmd, issue, station] = process.argv.slice(2);

if (cmd === 'count') {
  process.stdout.write(String(markers(issue, station)) + '\n');
} else if (cmd === 'record') {
  const n = markers(issue, station) + 1;
  gh('issue', 'comment', issue, '--body', `<!-- adlc-attempt ${station} -->\nAutomated ${station} attempt ${n} of ${MAX_ATTEMPTS}.`);
  process.stdout.write(String(n) + '\n');
  if (n > MAX_ATTEMPTS) process.exit(1);
} else if (cmd === 'reset') {
  gh('issue', 'comment', issue, '--body', `<!-- adlc-attempts-reset ${station} -->\nThe ${station} attempt count starts fresh from here.`);
} else if (cmd !== undefined) {
  throw new Error(`unknown command: ${cmd}`);
}

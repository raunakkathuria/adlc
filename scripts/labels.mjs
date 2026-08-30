// Labels — the factory floor display.
//
// Written only by the line, never by hand. Exactly one state:* label at a time on an issue;
// this script is the only code that moves it, so the transition rule lives in one place.
//
//   node scripts/labels.mjs ensure                     -> create the label set (idempotent)
//   node scripts/labels.mjs state <issue> <state>      -> swap state:* to state:<state>
//   node scripts/labels.mjs add <issue> <label>...     -> add labels (type:*, needs-human, ...)
//
// Needs `gh` and GH_TOKEN. Unknown labels are refused — a typo must fail loudly, not create
// a new lane on the board.

import { execFileSync } from 'node:child_process';

export const LABELS = {
  'state:triaging': ['0e8a16', 'the line is classifying and validating this issue'],
  'state:spec-draft': ['0e8a16', 'the Planner is drafting the spec delta'],
  'state:gate-1': ['b60205', 'waiting for a human to approve the spec PR'],
  'state:building': ['0e8a16', 'the Executor is implementing the approved delta'],
  'state:verifying': ['0e8a16', 'independent drift verification is running'],
  'state:quality': ['0e8a16', 'usability and accessibility checks are running'],
  'state:gate-2': ['b60205', 'waiting for a human to merge the implementation PR'],
  'state:shipped': ['5319e7', 'all implementation PRs merged; spec archived'],
  'type:bug': ['d73a4a', 'the product does not do what the spec says'],
  'type:feature': ['a2eeef', 'new or changed behaviour'],
  'type:chore': ['cfd3d7', 'no user-visible behaviour moves'],
  'type:docs': ['0075ca', 'documentation only'],
  'needs-human': ['b60205', 'the line parked this; a person must look'],
  'resolution:not-actionable': ['ededed', 'closed: question, duplicate, or too thin to act on'],
  'resolution:not-reproducible': ['ededed', 'closed: the bug could not be reproduced — reopen to retry'],
  'origin:adlc': ['fbca04', 'filed by the line itself (a verifier or quality finding)'],
};

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function ensure(names) {
  for (const name of names) {
    const [color, description] = LABELS[name];
    gh('label', 'create', name, '--force', '--color', color, '--description', description);
  }
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'ensure') {
  ensure(Object.keys(LABELS));
} else if (cmd === 'state') {
  const [issue, state] = rest;
  const name = `state:${state}`;
  if (!LABELS[name]) throw new Error(`unknown state: ${state}`);
  ensure([name]);
  const current = JSON.parse(gh('issue', 'view', issue, '--json', 'labels')).labels
    .map((l) => l.name)
    .filter((n) => n.startsWith('state:') && n !== name);
  const args = ['issue', 'edit', issue, '--add-label', name];
  if (current.length) args.push('--remove-label', current.join(','));
  gh(...args);
} else if (cmd === 'add') {
  const [issue, ...names] = rest;
  for (const name of names) if (!LABELS[name]) throw new Error(`unknown label: ${name}`);
  ensure(names);
  gh('issue', 'edit', issue, '--add-label', names.join(','));
} else if (cmd !== undefined) {
  throw new Error(`unknown command: ${cmd}`);
}

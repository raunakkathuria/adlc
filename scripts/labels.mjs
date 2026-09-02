// Labels — the factory floor display.
//
// Written only by the line, never by hand. Exactly one state:* label at a time on an issue;
// this script is the only code that moves it, so the transition rule lives in one place.
//
//   node scripts/labels.mjs ensure                     -> create the label set (idempotent)
//   node scripts/labels.mjs state <issue> <state>      -> swap state:* to state:<state>
//   node scripts/labels.mjs type  <issue> <type>       -> swap type:*  to type:<type>
//   node scripts/labels.mjs add <issue> <label>...     -> add labels (needs-human, origin:adlc)
//
// state and type are families: an issue carries exactly one of each, so setting one withdraws
// the last. `add` is for labels that stand alone. Setting a state also clears needs-human,
// because a station announcing where the work is means the line has resumed — every park either
// exits immediately or is mutually exclusive with the state call that follows it.
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

/**
 * Which label to add and which to withdraw so an issue carries exactly one of a family.
 * `alsoRemove` is for labels outside the family that this transition invalidates.
 */
export function exclusive(current, next, prefix, alsoRemove = []) {
  return {
    add: next,
    remove: current.filter((n) => (n.startsWith(prefix) && n !== next) || alsoRemove.includes(n)),
  };
}

function setExclusive(issue, next, prefix, alsoRemove = []) {
  ensure([next]);
  const current = JSON.parse(gh('issue', 'view', issue, '--json', 'labels')).labels.map((l) => l.name);
  const { add, remove } = exclusive(current, next, prefix, alsoRemove);
  const args = ['issue', 'edit', issue, '--add-label', add];
  if (remove.length) args.push('--remove-label', remove.join(','));
  gh(...args);
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;
const [cmd, ...rest] = isMain ? process.argv.slice(2) : [];

if (cmd === 'ensure') {
  ensure(Object.keys(LABELS));
} else if (cmd === 'state') {
  const [issue, state] = rest;
  const name = `state:${state}`;
  if (!LABELS[name]) throw new Error(`unknown state: ${state}`);
  setExclusive(issue, name, 'state:', ['needs-human']);
} else if (cmd === 'type') {
  const [issue, type] = rest;
  const name = `type:${type}`;
  if (!LABELS[name]) throw new Error(`unknown type: ${type}`);
  setExclusive(issue, name, 'type:');
} else if (cmd === 'add') {
  const [issue, ...names] = rest;
  for (const name of names) if (!LABELS[name]) throw new Error(`unknown label: ${name}`);
  ensure(names);
  gh('issue', 'edit', issue, '--add-label', names.join(','));
} else if (cmd !== undefined) {
  throw new Error(`unknown command: ${cmd}`);
}

// The build station, driven locally — a twin of .github/workflows/build.yml.
//
//   node local/build.mjs <spec-pr-number>
//
// Same Gate 1, same branch choreography, same PR conventions, same labels. The difference is the
// wallet: Actions authenticates the CLI from a secret and bills tokens, this runs the CLI already
// logged in on your machine. The stations themselves are untouched — this file only does what the
// workflow does AROUND prompts/build.md.
//
// One repo, one run, triggered by hand. No daemon, no polling, no config file: a poll loop needs
// crash recovery, locks and concurrency control, and none of that is worth anything until running
// this by hand is proven and annoying. It is a `for` loop when that day comes.
//
// The CLI is the seam. AGENT_CMD overrides it, the same variable run.sh already uses — the prompt
// arrives on stdin, so anything that reads stdin works. Nothing here depends on slash-command
// expansion.

import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const DEFAULT_AGENT = 'claude -p --allowedTools "Read,Grep,Glob,Edit,Write,Bash(node:*),Bash(npm:*)"';
// A different vendor from the builder, and read-only by construction. The reviewer's own flags
// belong in the command string, the same way the builder's allowlist does — a claude reviewer
// would carry build.yml's read-only set: Read,Grep,Glob,Bash(node:*),Bash(npm:*),Bash(git:*).
const DEFAULT_REVIEWER = 'codex exec --sandbox read-only';

// A slug becomes a branch name and a path segment, so it is checked before either is built from it.
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

// An approval from someone who cannot write to the repo is not Gate 1. On a public repo anyone
// can submit an approving review, so this is the check that makes "approved" mean anything.
export const WRITE_PERMISSIONS = ['admin', 'write', 'maintain'];

// What the Executor must not touch. build.yml skips this guard entirely when adlc builds adlc —
// which is this case — so it is new coverage. A workflow is here because it runs with the line's
// credentials once merged.
//
// package.json is deliberately NOT in this list: prompts/build.md may legitimately need a
// manifest change, and the reinstall step below exists for exactly that. What must not move is
// the gate's own definition — `verifyScript` guards that precisely, instead of freezing the whole
// file and making the reinstall step unreachable.
export const GUARDED_PATHS = ['prompts', 'scripts', 'local', '.github'];

/**
 * The binary a station's command runs — how the line knows the reviewer is not the builder.
 *
 * A reviewer from the same vendor shares the builder's blind spots and its training; the whole
 * reason this runs locally is that a second vendor costs nothing when both are seats you already
 * pay for. So it is a rule the driver enforces, not a habit to remember.
 */
export function vendorOf(command) {
  const first = String(command ?? '').trim().split(/\s+/)[0] ?? '';
  return first.split('/').pop() ?? '';
}

/** The `verify` script as package.json defines it — the command the deterministic gate runs. */
export function verifyScript(packageJsonText) {
  try {
    return JSON.parse(packageJsonText)?.scripts?.verify ?? null;
  } catch {
    return null;
  }
}

// A PR body over GitHub's 65,536-character cap is rejected with a 422 — after the branch is
// already pushed. Truncate to the same budget build.yml uses.
const MAX_BODY = 60000;

// --- The decisions, kept pure so they can be tested without a network ----------------------------

/**
 * Gate 1's fine print, as build.yml checks it. `pr` is what
 * `gh pr view --json state,headRefName,files,body` returns; `approval` is
 * `{ sha, login, permission }` for the last approving review, or null if there is none.
 */
export function gate1(pr, approval, headSha) {
  const no = (why) => ({ ok: false, why });

  if (pr.state !== 'OPEN') return no('the spec PR is not open');
  if (!pr.headRefName.startsWith('spec/')) return no('not a spec branch');

  const slug = pr.headRefName.slice('spec/'.length);
  if (!SLUG_RE.test(slug)) return no('branch name is not a valid change slug');

  const offside = (pr.files ?? []).filter((f) => !f.path.startsWith('openspec/changes/'));
  if (offside.length) {
    return no(`the PR touches files outside openspec/changes/ (${offside[0].path}) - not a pure spec PR`);
  }

  const issue = ((pr.body ?? '').match(/Relates to #(\d+)/) ?? [])[1];
  if (!issue) return no('no Relates-to issue recorded on the PR');

  // Gate 1 approves a COMMIT, not a branch: /revise pushes to the same spec branch, so without
  // this the tip moves under the build and an unapproved delta gets implemented.
  if (!approval?.sha) return no('no approving review was found on this PR');
  if (approval.sha !== headSha) {
    return no(`the approval is on ${approval.sha.slice(0, 8)} but the spec PR head is now ${headSha.slice(0, 8)}`);
  }

  // A drive-by approval from a stranger must not start a build.
  if (!WRITE_PERMISSIONS.includes(approval.permission)) {
    return no('the approver does not have write access - Gate 1 requires an approval from a maintainer');
  }

  return { ok: true, issue, slug, approvedSha: approval.sha };
}

export function commitMessage(slug, issue) {
  return `impl: ${slug}

Built from the spec delta approved at Gate 1 (spec PR stays open until this merges).
Relates to #${issue}`;
}

export function prBody(review, issue, reviewerVendor) {
  // The INDEPENDENT reviewer's findings, from a fresh context and a different vendor — the same
  // artifact build.yml puts here. The Executor's own account of its work is NOT in this body; it
  // stays in the worktree's work/build.md for whoever wants it, because a self-report next to a
  // review is read as though it answered it.
  //
  // No drift check, though: verifier.yml starts only on workflow_dispatch and nothing dispatches
  // it here, so the issue goes to gate-2 and this says so rather than implying otherwise.
  return `> Reviewed independently by \`${reviewerVendor}\`, which did not build this change.
> No drift check ran — the verifier station runs in Actions, not here.

${review.slice(-MAX_BODY)}

---

Closes #${issue}
Relates to #${issue}
`;
}

// --- The branch choreography ---------------------------------------------------------------------

/**
 * Cut the implementation from the APPROVED commit, then bring main in.
 *
 * Merging matters twice: the delta arrives with main's history behind it so it cannot collide
 * add/add at Gate 2, and the build runs against current tooling rather than whatever was current
 * when the spec branch was cut. It must stay a merge — squash and rebase break the ancestry that
 * lets Gate 2 mark the spec PR merged.
 */
export function prepareImplBranch(cwd, slug, approvedSha, baseRef = 'origin/main') {
  const git = (...a) => execFileSync('git', a, { cwd, encoding: 'utf8' });
  try {
    git('checkout', '-B', `impl/${slug}`, approvedSha);
  } catch (e) {
    // The usual cause: impl/<slug> is checked out in the operator's own window, from inspecting
    // the last run. git refuses to move a branch that another worktree holds.
    throw new Error(`could not cut impl/${slug}: ${String(e.stderr ?? e.message).trim()}`, { cause: e });
  }
  try {
    git('merge', '--no-edit', baseRef);
  } catch (e) {
    try { git('merge', '--abort'); } catch {}
    throw new Error(`the approved spec branch conflicts with ${baseRef}, and the line will not guess at a resolution`, { cause: e });
  }
}

// --- The run -------------------------------------------------------------------------------------

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
const node = (script, ...a) => execFileSync('node', [join(ROOT, 'scripts', script), ...a], { stdio: 'inherit' });

function readReport(tree, file) {
  try {
    return readFileSync(join(tree, 'work', file), 'utf8');
  } catch {
    return '(the station produced no output)';
  }
}

// Model output travels as a file, never as an argv `--body`: it is unbounded, and GitHub refuses
// a body over 65,536 characters. Every workflow in .github/ does the same — see build.yml's header.
function comment(issue, body) {
  const file = join(tmpdir(), `adlc-comment-${issue}-${process.pid}.md`);
  writeFileSync(file, body.slice(-MAX_BODY));
  gh('issue', 'comment', issue, '--body-file', file);
}

function park(issue, message) {
  comment(issue, message);
  node('labels.mjs', 'add', issue, 'needs-human');
}

function main(pr) {
  if (!/^\d+$/.test(pr ?? '')) {
    console.error('usage: node local/build.mjs <spec-pr-number>');
    process.exit(2);
  }

  const agent = process.env.AGENT_CMD || DEFAULT_AGENT;
  const reviewer = process.env.REVIEW_CMD || DEFAULT_REVIEWER;
  if (vendorOf(agent) === vendorOf(reviewer)) {
    console.error(`The reviewer must not be the vendor that built the change — both are \`${vendorOf(agent)}\`.`);
    console.error('Set REVIEW_CMD to a different CLI. A reviewer sharing the builder\'s vendor shares its blind spots,');
    console.error('and a second vendor costs nothing when both are subscriptions you already pay for.');
    process.exit(2);
  }

  const view = JSON.parse(gh('pr', 'view', pr, '--json', 'state,headRefName,files,body,headRefOid'));

  const raw = gh('api', `repos/{owner}/{repo}/pulls/${pr}/reviews`,
    '--jq', '[.[] | select(.state == "APPROVED")] | last // empty | {sha: .commit_id, login: .user.login}');
  const approval = raw ? JSON.parse(raw) : null;
  if (approval?.login) {
    // A login reaches the API path below, so it is checked against GitHub's own shape first.
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(approval.login)) {
      console.error(`Refusing to look up an implausible approver login: ${approval.login}`);
      process.exit(1);
    }
    approval.permission = gh('api', `repos/{owner}/{repo}/collaborators/${approval.login}/permission`,
      '--jq', '.permission');
  }

  const gate = gate1(view, approval, view.headRefOid);
  if (!gate.ok) {
    console.error(`Gate 1 fine print not met: ${gate.why}`);
    process.exit(1);
  }
  const { issue, slug, approvedSha } = gate;

  // The brake on unattended self-repair. Exit 1 means this attempt exceeds the cap.
  try {
    node('attempts.mjs', 'record', issue, 'build');
  } catch {
    park(issue, 'The build station has hit its attempt cap for this issue. The line is parked — a person should read the attempts above and decide, then remove `needs-human` and re-run the build.');
    node('attempts.mjs', 'reset', issue, 'build');
    process.exit(1);
  }

  node('labels.mjs', 'state', issue, 'building');

  // A worktree, never the checkout you are editing in another window.
  const tree = join(homedir(), '.adlc', 'worktrees', slug);
  mkdirSync(join(homedir(), '.adlc', 'worktrees'), { recursive: true });
  git(ROOT, 'fetch', 'origin', `spec/${slug}`, 'main');
  try { git(ROOT, 'worktree', 'remove', '--force', tree); } catch {}
  git(ROOT, 'worktree', 'prune');
  git(ROOT, 'worktree', 'add', '--detach', '-f', tree, approvedSha);

  try {
    prepareImplBranch(tree, slug, approvedSha);
  } catch (e) {
    park(issue, `${e.message} — parked for a human.`);
    process.exit(1);
  }

  // Before the Executor, not after: it works red-green, so it runs the suite itself.
  execFileSync('bash', [join(ROOT, 'scripts', 'install-deps.sh')], { cwd: tree, stdio: 'inherit' });

  const prompt = [
    readFileSync(join(ROOT, 'prompts', 'build.md'), 'utf8'),
    '',
    `The delta is \`openspec/changes/${slug}/\`.`,
  ].join('\n');

  // The gate must be green BEFORE the Executor starts. If `main` was red, or the merge produced a
  // red state, the run would otherwise finish, fail the gate, and park the issue blaming a build
  // that did nothing wrong — and burn an attempt doing it. Under a second, so it costs nothing.
  try {
    execFileSync('npm', ['run', 'verify'], { cwd: tree, stdio: 'inherit' });
  } catch {
    node('attempts.mjs', 'reset', issue, 'build'); // the attempt never happened
    park(issue, 'The build did not start: `npm run verify` is already red on the approved delta merged with `main`, before the Executor ran. Nothing here is the build\'s fault — fix the base, then re-run the build.');
    process.exit(1);
  }

  // The gate's own definition, as it stood before the Executor could touch it.
  const verifyBefore = verifyScript(readFileSync(join(tree, 'package.json'), 'utf8'));

  mkdirSync(join(tree, 'work'), { recursive: true });
  try {
    // pipefail: a crashed agent must fail this step, not be hidden by tee. stdout is inherited, so
    // there is no buffer to overflow and you watch the build as it happens.
    execFileSync('bash', ['-c', `set -o pipefail; ${agent} | tee work/build.md`], {
      cwd: tree, input: prompt, stdio: ['pipe', 'inherit', 'inherit'],
    });
  } catch (e) {
    park(issue, `The Executor did not finish: ${e.message}\n\nWhat it managed to say:\n\n${readReport(tree, 'build.md')}`);
    process.exit(1);
  }
  const report = readReport(tree, 'build.md');

  // The line's own tools must be untouched. build.yml skips this guard when adlc builds adlc,
  // which is exactly the case here — so locally it matters more, not less.
  const touched = git(tree, 'status', '--porcelain', '--', ...GUARDED_PATHS);
  if (touched) {
    console.error(`The agent modified the line's own tools — refusing to continue:\n${touched}`);
    process.exit(1);
  }

  // A build that rewrites `npm run verify` clears a gate that no longer checks anything.
  if (verifyScript(readFileSync(join(tree, 'package.json'), 'utf8')) !== verifyBefore) {
    console.error('The agent changed the `verify` script — the gate would be clearing itself. Refusing to continue.');
    process.exit(1);
  }

  // If the Executor added a dependency, node_modules is now behind the manifest and every test
  // would fail with "Cannot find module" — a red gate that is the driver's fault, not the build's.
  try {
    git(tree, 'diff', '--quiet', 'HEAD', '--', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json');
  } catch {
    execFileSync('bash', [join(ROOT, 'scripts', 'install-deps.sh')], { cwd: tree, stdio: 'inherit' });
  }

  let green = true;
  try {
    execFileSync('npm', ['run', 'verify'], { cwd: tree, stdio: 'inherit' });
  } catch {
    green = false;
  }
  if (!green) {
    park(issue, `The build finished but the deterministic gate is red — no pull request was opened. The build report:\n\n${report.slice(-60000)}`);
    process.exit(1);
  }

  // The reviewer gets a fresh session, the diff, and no memory of writing either — and a
  // different vendor from the builder. It runs before the commit so `git diff` shows the change
  // unstaged, which is what prompts/review.md asks it to read.
  //
  // stderr is inherited, not merged: `codex exec` puts its transcript there and only the final
  // message on stdout, so tee captures the report and not a file dump. Verified.
  try {
    execFileSync('bash', ['-c', `set -o pipefail; ${reviewer} | tee work/review.md`], {
      cwd: tree,
      input: readFileSync(join(ROOT, 'prompts', 'review.md'), 'utf8'),
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  } catch (e) {
    park(issue, `The build was green, but the independent review did not finish: ${e.message}\n\nNo pull request was opened — a change nobody reviewed is not what this line ships.`);
    process.exit(1);
  }
  const review = readReport(tree, 'review.md');

  git(tree, 'add', '-A', '--', '.', ':!work', ':!node_modules');
  git(tree, 'config', 'user.name', 'adlc-line');
  git(tree, 'config', 'user.email', 'adlc-line@users.noreply.github.com');
  git(tree, 'commit', '-m', commitMessage(slug, issue));
  git(tree, 'push', '-f', '-u', 'origin', `impl/${slug}`);

  let url;
  try {
    const existing = gh('pr', 'list', '--head', `impl/${slug}`, '--state', 'open', '--json', 'url', '--jq', '.[0].url // empty');
    const bodyFile = join(tree, 'work', 'pr-body.md');
    writeFileSync(bodyFile, prBody(review, issue, vendorOf(reviewer)));
    url = existing;
    if (existing) {
      // Comment AND replace the body. The comment is this run's record; the body is what the Gate 2
      // reader looks at first, and left alone it keeps the FIRST build's review while newer ones
      // pile up underneath — a review several builds out of date, presented as current.
      gh('pr', 'comment', existing, '--body-file', bodyFile);
      gh('pr', 'edit', existing, '--body-file', bodyFile);
    } else {
      url = gh('pr', 'create', '--base', 'main', '--head', `impl/${slug}`,
        '--title', `impl: ${slug}`, '--body-file', bodyFile);
    }
  } catch (e) {
    // The branch is pushed and the gate was green — losing the PR must not also lose the issue.
    // "could not be opened" was wrong whenever this is a rebuild — the PR was already open and it
    // is the comment or the body update that failed. Say what is true of both shapes.
    park(issue, `The build was green and \`impl/${slug}\` is pushed, but the pull request could not be brought up to date: ${e.message}\n\nCheck whether a PR for that branch already exists — it may be open with a stale body — then finish it by hand or re-run the build.`);
    process.exit(1);
  }

  node('links.mjs', 'write', issue, `implementation_pr=${url}`, '--note', `Implementation opened: ${url}`);
  // NOT `verifying` — that label means "independent drift verification is running", and verifier.yml
  // only starts on workflow_dispatch. Nothing would be running. This build goes straight to the
  // human at Gate 2, which is the truth.
  node('labels.mjs', 'state', issue, 'gate-2');
  console.log(`\nImplementation PR: ${url}`);
}

const isMain = import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  main(process.argv[2]);
}

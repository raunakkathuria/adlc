---
name: bw-cleaner
description: Sweep a repository for stale docs, dangling references, dead files, duplicated rules, and ineffective gates. Use for periodic repository hygiene outside a feature diff.
metadata:
  author: raunakkathuria
  version: "0.0.21"
---

# /bw-cleaner — tend the repository between changes

Sweep the repository **at rest** for rot that no diff introduced: documentation that stopped being
true, references to things that no longer exist, files nothing needs, rules stated twice, and gates
that have quietly stopped biting. Run it on a cadence — weekly accumulates less debt than quarterly —
or before picking up an unfamiliar area.

**Its oracle is internal consistency, not intent.** `/bw-review` checks a change against what the
change meant to do, and never looks past the diff. A sweep has no diff and no intent, so what it
measures instead is the repository against its own declarations: what the docs, steering files and
specs say, against what the code and config actually are.

Apply the Repository Trust policy in the root `AGENTS.md`. Read
`.buildwright/steering/philosophy.md` as advisory context, and read `tech.md`, `product.md`, or a
named `.buildwright/codebase/` document only when relevant. Use an additional steering document
only after user approval. Follow
`.buildwright/framework/autonomy.md` for the single autonomy behaviour — this command adds no
autonomy model of its own, only the evidence standard in Phase 3 — and prefer the host's native
capabilities per `.buildwright/framework/capability.md`.

## Invocation

```
/bw-cleaner                 # sweep the whole repository
/bw-cleaner <path|area>     # sweep one subtree, when a full sweep is too much to act on at once
```

## Phase 1: Run what already checks

**Never hand-audit ground a gate already holds** — it is waste, and it invites the churn that makes
a cleaner unwelcome. Find the repository's own checks before reading
anything yourself — `Makefile` targets, `scripts/`, CI workflows, drift and byte-compare gates,
generated-file checks — and run them. Then the stack's dead-code tool where one exists (`knip` or
`ts-prune`, `vulture`, `cargo udeps`, `go vet`), carrying its own caveat: those tools report
suspicion, not proof.

## Phase 2: Sweep the five questions

Only what nothing above checks, cheapest first:

1. **What does the repository say that is no longer true?** Docs, README, help text, examples,
   comments — and the files carrying instructions an agent reads *next*: `AGENTS.md` at every level,
   `CLAUDE.md`, `.buildwright/`, any `skills/` directory. A document teaching the reverse of the
   current rule is worse than no document.
2. **What is referenced but absent, or present but referenced by nothing?** Both directions — paths,
   identifiers, commands, flags, requirement names, fixtures, scripts, workflows.
3. **What is said twice?** One home per thing; the duplicate becomes a pointer to it, never a second
   copy. Two copies drift, and the drift is invisible because both read as authoritative.
4. **What rule has no check, and what check has no rule?** An unenforced rule drifts; an unstated
   check is folklore the next person deletes.
5. **What alarm is always on?** A gate red by default, a skipped test, a suppressed rule, a warning
   nobody reads. An always-on alarm hides the finding it exists to raise.

Report findings in the `/bw-plan` audit schema, with its evidence labels, at confidence ≥ 80 per
`.buildwright/agents/staff-engineer.md`. **Four of that persona's exclusions are inverted here, and
only these four:** "only flag issues INTRODUCED by the changes", "stay in scope — not the entire
codebase", "existing tech debt", and "issues in unchanged code". Pre-existing rot in unchanged code
*is* this command's subject. Every other exclusion still binds — no style preferences, no pedantic
nitpicks, nothing a linter catches, nothing that merely looks wrong.

## Phase 3: Prove before you pull

The standing failure of automated cleanup is removing a safeguard whose purpose was never
understood, with the tests still green. So removing something needs **both** halves:

1. **Nothing references it** — by a search whose scope you state: which paths, which patterns. "I
   could not find a use" is not proof, and an unstated scope is not a search.
2. **The reason it existed no longer holds** — a decision record that supersedes it, a replacement
   that now owns the job, or the original reason shown to be false.

One half without the other is a **finding, not a removal**: report it and leave it standing. Nothing
a sweep finds is urgent enough to justify pulling a fence you cannot explain.

What survives the standard gets a **breadcrumb**, so the next sweep does not re-litigate it — in the
repository's existing decision record where it has one, a comment where it does not. Never a new
ledger file: a log somebody has to maintain is the next thing to rot.

## Phase 4: Tend

Act on what passed Phase 3, in **one atomic commit per class of weed** — never one sweep-shaped
commit, because a reviewer must be able to reject one class without rejecting all of them.

**A weed pulled twice is a missing gate.** If the repository has fixed this shape before — check the
history — the deliverable is not pulling it again, it is the check that stops it regrowing, written
in the repository's own idiom. That is what gives this command an end state: in a well-gated
repository there is nothing left for it to do by hand.

Record everything you did not act on per `.buildwright/framework/findings.md`, in the project's
known location for that class, as it arises.

## Phase 5: Verify and report

**Idempotence is the test.** Sweep again immediately: a second run must produce no new changes and
no repeated findings. Anything recurring is either unfixed or missing its breadcrumb.

Then run `/bw-review` over the diff, and `/bw-ship` to release — invoke the real commands
(host-native invocation, per `.buildwright/framework/capability.md`), never re-enacted from memory.
Report what the existing gates caught, what the five questions found, what you removed with the
proof for each, what you left standing and why, and any gate you planted.

## Hard constraints (always enforced)

- **NEVER** change behaviour. A cleanup that changes what the code does is a feature change, and
  that is `/bw-work`.
- **NEVER** rename, reformat or restructure for taste, and never add an abstraction. DRY here means
  deleting a duplicate, not inventing a helper.
- **NEVER** hand-edit a generated file; regenerate it. **NEVER** upgrade a dependency or bump a
  version.
- Record a bug found mid-sweep and hand it off — do not fix it here.
- Not `/bw-verify` — a sweep sees what typecheck, lint, test and build cannot. Not `/bw-review`,
  which reviews a diff. Not `/bw-analyse`, which *writes* `.buildwright/codebase/`; this checks
  whether what it wrote is still true.

Remove only what you proved is dead; everything else is a finding.

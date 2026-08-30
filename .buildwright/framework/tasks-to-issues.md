# Tasks -> Issues

How an approved plan's tasks become tracked issues on your forge (GitHub, GitLab, ...): a **parent** issue for the change, plus a **child** issue per independent unit of work. This is a convention; there is no dedicated command. `/bw-plan` produces an *issue-ready* breakdown; the issues are **created at the `/bw-work` handoff** (or by a host's CI), never by `/bw-plan` itself (see its hard constraints).

## The shape

- **Parent issue** - the change (the feature) as a whole. Title is the change name; body links the plan and lists the children as a task list.
- **Child issue per unit of work** - one per independently testable, deliverable unit, so each can drive its own `/bw-work` loop. **What counts as a "unit" is project-defined** - a task, a vertical slice, or a module; pick the grain that matches how your loop consumes work. A unit may also name a **target repo** (see below) when the feature spans more than one.

## Targeting repos (when a feature spans repos)

In a polyrepo a single PR cannot span repos, so a unit that belongs to a different repo becomes a child issue **in that repo**, shipping its own PR there. This is optional - single-repo features ignore it - and only prescribes *how* to link across repos, not which repos.

- **Target per unit.** Let each unit declare a target repo (commonly via a project-defined *surface -> repo* map - e.g. `db`, `api`, `web`). Create each child **in its target repo**; a unit with no target lands in the parent's (hub) repo.
- **Link to one feature.** Tie the children back to the parent with the forge's **cross-repo tracker** - a GitHub **Project** or a GitLab **Epic** - and with cross-repo references (`owner/repo#n`) in the parent's task list and each child's body. The feature stays tracked in one place even though its PRs land in different repos.
- **Dependency order.** When one unit depends on another (a schema change before the code that uses it), **withhold the loop/ready label** on the dependent child until its upstream is done, so the loop does not start it too early. Release the hold on re-run once the upstream lands.

## Stable IDs (so re-runs are idempotent)

Each child carries a **stable ID** taken from the plan, written once at the front of the title (`<id>: <desc>`). The ID - not the prose, and not an ordinal number - is the identity, so regenerating or renumbering the plan and re-running keeps the same issue.

## Idempotent creation

Before creating anything, **list the existing issues and skip any ID that already has one** - re-running adds only what's new and reports the skips. Match an existing issue to an ID by its leading `<id>:`.

## Remote guard

Only create issues in repositories you intend to write to. For a single-repo feature that's the current git remote (`git config --get remote.origin.url`). For a multi-repo feature, restrict to the **configured set of target repos** and refuse any repo not in that set. If the remote (or the target set) is missing or isn't what you expect, **stop and report** - never create issues anywhere else.

## Mechanism (forge CLI or API)

Use your forge's CLI - `gh` (GitHub) or `glab` (GitLab) - or its API, so this runs the same locally and in CI. The example below uses `gh`; the `glab` equivalents (`glab issue create ...`, `glab` epics) are one-to-one.

```sh
# guard: confirm each target repo is one you mean to write to before any write
git config --get remote.origin.url   # the hub repo for the parent

# parent (the feature), in the hub repo  (gh shown; glab issue create is equivalent)
gh issue create --title "<change name>" --body "Plan: <link>\n\nChildren:\n- [ ] <id> ..."

# child (one per unit), created IN ITS TARGET REPO, skipping IDs that already have an issue
gh issue create --repo <owner/target-repo> \
  --title "<id>: <desc>" --body "Parent: <hub-owner/repo>#<parent>\n<acceptance from the plan>"

# link the children under one feature (cross-repo): a GitHub Project (or a GitLab Epic)
gh project item-add <project-number> --owner <org> --url <child-issue-url>
```

Link children to the parent (`Parent: <owner/repo>#<n>` in the body; the children task-list in the parent) and group them under one tracker (Project / Epic). Labels are project-defined (e.g. a label your build loop watches; a separate "blocked" label while a dependency is unmet).

## Rules

- `/bw-plan` only **prepares** the breakdown (parent + child-per-unit, stable IDs, any target repos); it does not create issues. Creation happens at the `/bw-work` handoff.
- Always run the **remote guard** first; never create issues in a repo outside the intended (target) set.
- Always **dedup by ID**; re-running must update, never duplicate.
- For multi-repo features, link every child to the parent (cross-repo refs + a Project/Epic), and hold dependent units until their upstream lands.
- This convention is Buildwright's; it prescribes no project-specific unit grain, surface map, or labels, and seeds no files into any project.

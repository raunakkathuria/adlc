# Capabilities

Buildwright runs on several host agent tools (Claude Code, Codex, OpenCode,
Cursor). A **capability** here is an *execution primitive* the host provides —
the machinery for *how* a step runs: write a file, track a queue of work, run
independent work in parallel, isolate work in a git worktree, fire a hook,
invoke another command. Where a host provides one of these natively, **prefer
the native capability** — do not reimplement it in command prose. Where a host
lacks one, fall back to the documented behaviour in the last column; **never
fail** because a capability is missing.

Commands reference these capabilities **generically** (e.g. "write the file with
the host's native file-write tool", "track the queue with native task
tracking"). This table is the single place that maps a capability to each host,
so the command text stays tool-agnostic.

| Capability | Claude Code | Codex | Cursor | OpenCode | Fallback when absent |
|------------|-------------|-------|--------|----------|----------------------|
| **Plan / build modes** | Plan mode (`EnterPlanMode`/`ExitPlanMode`) | `/plan` | Plan mode (`/plan`, `--mode=plan`) | built-in Plan / Build agents | proceed without a mode switch |
| **File write** | native file-write tool | native file-write | native file-write | native file-write | write the file directly, report errors |
| **Command invocation** (faithful) | `Skill` / slash-command invocation re-injects the real command | skill invocation | command/skill invocation | custom-command invocation | direct the user to run the command |
| **Task / todo tracking** | `TaskCreate`/`TaskList`/`TaskUpdate` | `/agent`, `/goal` | Task tool | Task tool | an in-prose checklist in the deliverable |
| **Sub-agents** | `Agent` tool (isolated context) | `/agent`, `/fork`, `/side` | subagents | General/Explore/Scout subagents | run the phase inline in the main flow |
| **Parallel / concurrent execution** | multiple tool calls in one turn; parallel `Agent`s | `/fork`, `/side` concurrent agents | parallel subagents | parallel subagents | run the independent steps sequentially |
| **Worktree isolation** | `Agent` `isolation: "worktree"`; `git worktree` | `git worktree` | `git worktree` | `git worktree` | work in the main tree, one change at a time |
| **Hooks** | lifecycle hooks (PreToolUse, Stop, …) | config-driven | session/tool hooks | agent/permission config | an explicit step in the command |

## Mechanism, not policy

A capability is **how** a step executes — never **what** Buildwright does or the
discipline it follows. The distinction is load-bearing:

- **Steering and framework behaviour are authoritative, always.** The steering
  docs (`.buildwright/steering/`) and the framework docs (`autonomy.md`,
  `findings.md`) are read at session start and govern the work regardless of
  host. A host tool's own defaults or conventions **never** replace them.
- **Native plumbing does not replace Buildwright's process.** Using the host's
  plan mode is fine, but it does not substitute for Buildwright's planning/spec
  discipline. "Faithful command invocation" runs the *real* Buildwright command,
  not the host's interpretation of it. Native task tracking organises the
  Buildwright loop — it does not redefine it.
- **On conflict, Buildwright wins.** If a host convention or default would
  change the steps, gates, or discipline Buildwright defines, follow Buildwright
  and use the host capability only for execution.

In short: lean on the host for *speed and mechanics*; keep Buildwright's way of
working intact.

## Rules

1. **Prefer native for execution mechanics.** If the host has the capability and
   it fits, use it — but only to execute, never to override Buildwright's
   steering or process.
2. **Always have a fallback.** Every capability above defines one; a host
   missing a capability degrades to it rather than erroring.
3. **Keep commands tool-agnostic.** Never hard-code one host's mechanism in a
   command file — name the capability and let this doc resolve it.
4. **Mechanism, not policy.** See the section above: capabilities are *how*, not
   *what*. Steering and framework behaviour stay authoritative.

## Why this matters

Hand-rolled equivalents of native behaviour are where Buildwright's bugs have
lived — e.g. narrating "writing the plan now…" instead of issuing the host's
file-write (the `/bw-plan` stall), and continuing into implementation "from
memory" instead of invoking the real `/bw-work`. Leaning on native capabilities
removes that class of bug, unlocks speed (running independent work in parallel,
isolating it in a worktree), and keeps Buildwright aligned with each tool as it
evolves. But these are *how* the work runs, not *what* the work is: the steering
docs and the Buildwright process still govern.

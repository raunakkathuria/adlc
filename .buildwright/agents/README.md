# Agent Personas

This directory contains reusable review personas. Each file is a valid agent
definition (with `name`/`description` frontmatter) so the tools that expect a
subagent registry — Claude Code (`.claude/agents/`, `~/.claude/agents/`),
OpenCode (`.opencode/agents/`) — load them cleanly. They are still adopted
**inline** by the commands below, not spawned as separate orchestration runtimes;
Buildwright is not a multi-agent framework.

| Agent | File | Used By | Purpose |
|-------|------|---------|---------|
| Staff Engineer | `staff-engineer.md` | `/bw-work`, `/bw-ship` | Spec and code review with confidence scoring and high-signal findings |
| Security Engineer | `security-engineer.md` | `/bw-work`, `/bw-ship` | OWASP Top 10, secrets, auth, injection, dependency review |

## How they are triggered

The reviews run automatically inside the command flows — there is no separate
step to invoke:

- `/bw-work` — Phase 7 (Security Review) and Phase 8 (Code Review) run after the
  implementation passes its verification gates, before commit.
- `/bw-ship` — Step 2 (Security Review) and Step 3 (Code Review) run as part of
  the ship pipeline, before push/PR.

At each of those phases the command adopts the matching persona — reading it from
the project's `.buildwright/agents/<name>.md`, or from `~/.claude/agents/<name>.md`
for a global install without a project `.buildwright/`.

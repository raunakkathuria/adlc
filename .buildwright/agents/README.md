# Agent Personas

This directory contains reusable review personas. Each file is a valid agent
definition (with `name`/`description` frontmatter) so the tools that expect a
subagent registry — Claude Code (`.claude/agents/`, `~/.claude/agents/`),
OpenCode (`.opencode/agents/`) — load them cleanly. They are still adopted
**inline** by `/bw-review`, not spawned as separate orchestration runtimes;
Buildwright is not a multi-agent framework.

| Agent | File | Adopted By | Purpose |
|-------|------|------------|---------|
| Staff Engineer | `staff-engineer.md` | `/bw-review` (called by `/bw-work`, `/bw-ship`) | Spec and code review with confidence scoring and high-signal findings |
| Security Engineer | `security-engineer.md` | `/bw-review` (called by `/bw-work`, `/bw-ship`) | OWASP Top 10, secrets, auth, injection, dependency review |

## How they are triggered

`/bw-review` is the single home for the review logic and adopts both personas;
`/bw-work` and `/bw-ship` delegate to it rather than restating the review inline
(falling back to adopting the personas inline only where a host cannot invoke
`/bw-review` faithfully):

- `/bw-work` — Phase 7 (Review) runs `/bw-review` after the implementation passes
  its verification gates, before commit.
- `/bw-ship` — Step 2 (Review) runs `/bw-review` as part of the ship pipeline,
  before push/PR.

`/bw-review` adopts the matching persona — reading it from the project's
`.buildwright/agents/<name>.md`, or from `~/.claude/agents/<name>.md` for a
global install without a project `.buildwright/`.

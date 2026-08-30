---
name: bw-analyse
version: 0.0.19
description: Analyse the codebase and write structured docs to .buildwright/codebase/. Creates or updates tech.md with discovered stack and commands.
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Edit
---

<objective>
Analyse the existing codebase and produce structured reference documents in
`.buildwright/codebase/`. Then create or update `.buildwright/steering/tech.md`
with real project context so future sessions do not rely on detection.
</objective>

<when_to_use>
Run /bw-analyse when:
- Starting on an unfamiliar or brownfield codebase
- .buildwright/codebase/ is missing or stale
- `.buildwright/steering/tech.md` is missing or stale
- Before `/bw-work` on an unfamiliar existing project

Skip when:
- Greenfield project with no code yet
- .buildwright/codebase/ was generated this session
</when_to_use>

<process>
1. Check `.buildwright/codebase/` (follow `.buildwright/framework/autonomy.md`):
   - If empty or missing → proceed to Step 2.
   - If it already has files → overwriting existing docs is the human's call. In
     an interactive session, ask: "Codebase docs already exist. Refresh
     (overwrite) or skip?" In an unattended/CI run, refresh automatically
     (overwrite all docs) and proceed to Step 2.
2. Create `.buildwright/codebase/` if it does not exist
3. Explore and write STACK.md
   - Read package.json / Cargo.toml / go.mod / pyproject.toml (whichever exists)
   - Identify language, runtime, package manager, key frameworks, dependencies
   - Scan for external service imports (APIs, auth, storage, monitoring)
   - Write `.buildwright/codebase/STACK.md`
4. Explore and write ARCHITECTURE.md
   - Map directory structure (excluding node_modules, .git, build output)
   - Identify entry points, layers, data flow, error handling strategy
   - Note where to add new features, components, and tests
   - Write `.buildwright/codebase/ARCHITECTURE.md`
5. Explore and write CONVENTIONS.md
   - Read linting/formatting configs (.eslintrc, .prettierrc, biome.json, etc.)
   - Sample 5-10 source files for naming patterns, import style, error handling
   - Identify test framework, test file locations, mocking patterns
   - Write `.buildwright/codebase/CONVENTIONS.md`
6. Explore and write CONCERNS.md
   - Grep for TODO/FIXME/HACK comments
   - Find large files (potential complexity)
   - Note missing tests, security gaps, fragile areas
   - Write `.buildwright/codebase/CONCERNS.md`
7. Create or update `.buildwright/steering/tech.md` with real content:
   - Stack: discovered languages, runtime, frameworks.
   - Project Commands: typecheck, lint, test, build, and dev commands where available.
   - System layout: 3-5 line summary.
   - Code Patterns: top 3 patterns from CONVENTIONS.md.
   - Dependencies: key packages and their purpose.
8. Run `.buildwright/scripts/sync-agents.sh` to propagate codebase docs to all tool directories
9. Commit: `chore: add codebase analysis to .buildwright/codebase/`
10. Report: list 4 docs with line counts, summarise key findings, suggest next step
</process>

<forbidden_files>
NEVER read or include contents from:
- .env, .env.*, *.env — environment variables
- credentials.*, secrets.*, *secret*, *credential*
- *.pem, *.key, *.p12 — certificates and private keys
- id_rsa*, id_ed25519* — SSH keys
- .npmrc, .pypirc, .netrc — auth tokens
- Any file that appears to contain API keys or passwords

Note their existence only. Never quote their contents.
</forbidden_files>

<success_criteria>
- [ ] .buildwright/codebase/ contains STACK.md, ARCHITECTURE.md, CONVENTIONS.md, CONCERNS.md
- [ ] tech.md exists with real stack and command content
- [ ] No secrets or credentials in any written file
- [ ] Changes committed
</success_criteria>

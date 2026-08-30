---
name: bw-verify
version: 0.0.19
description: Run quick quality checks (typecheck, lint, test, build). For full checks including security and AI review, use /bw-ship.
---

Running quick verification...

## 1. Discover Project Commands

Follow the Tech Discovery Protocol (see Command Discovery in CLAUDE.md):

1. Read `.buildwright/steering/tech.md` if it exists — if "Project Commands" has real commands, use them.
2. Otherwise auto-detect from project files: `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`, etc.
3. Derive typecheck, lint, test, build commands. Mark as SKIP if a stack has no equivalent.
4. Write discovered commands to `.buildwright/steering/tech.md` for future runs.

---

## 2. Type Check

Run DISCOVERED_TYPECHECK.

Examples by runtime (use only what was discovered — do not hardcode):
- Node/TypeScript: `npx tsc --noEmit` or the project's typecheck script
- Rust: `cargo check`
- Go: `go build ./...`
- Python: `mypy .` or `pyright`
- Other: SKIP if no type checker exists for this stack

**Result:** PASS / FAIL / SKIP
**Details:** [error count and locations if failed]

---

## 3. Lint

Run DISCOVERED_LINT.

Examples by runtime (use only what was discovered):
- Node/TypeScript: project lint script or `npx eslint .`
- Rust: `cargo clippy -- -D warnings`
- Go: `golangci-lint run`
- Python: `ruff check .` or `flake8`
- Other: SKIP if no linter configured

**Result:** PASS / FAIL / SKIP
**Details:** [warning/error count]

---

## 4. Tests

Run DISCOVERED_TEST.

Examples by runtime (use only what was discovered):
- Node/TypeScript: project test script or `npx jest`
- Rust: `cargo test`
- Go: `go test ./...`
- Python: `pytest`
- Other: consult Makefile or CI workflow

**Result:** PASS / FAIL
**Details:** [test count, coverage % if available]

---

## 5. Build

Run DISCOVERED_BUILD.

Examples by runtime (use only what was discovered):
- Node/TypeScript: project build script
- Rust: `cargo build --release`
- Go: `go build ./...`
- Python: SKIP — no build step for interpreted scripts
- Other: SKIP if this stack has no build step

**Result:** PASS / FAIL / SKIP
**Details:** [any warnings]

---

## Summary

```
╔═══════════════════════════════════════════════════════════════╗
║                    QUICK VERIFICATION                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Stack detected:  [runtime]                                   ║
║  Commands used:   [list of commands actually run]             ║
╠═══════════════════════════════════════════════════════════════╣
║  Type Check:  ✅ PASS / ❌ FAIL / ⏭ SKIP                     ║
║  Lint:        ✅ PASS / ❌ FAIL / ⏭ SKIP  ([N] warnings)     ║
║  Tests:       ✅ PASS / ❌ FAIL  ([N] tests, [X]% coverage)   ║
║  Build:       ✅ PASS / ❌ FAIL / ⏭ SKIP                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: PASS / BLOCKED                                       ║
╚═══════════════════════════════════════════════════════════════╝
```

If BLOCKED: List specific failures with file:line references.

---

## Next Steps

- If PASS: Run `/bw-ship` for full quality pipeline (security + review + release).
  Report the commit you verified at — if you run `/bw-ship` next with the working
  tree unchanged, its "Gate reuse" rule skips re-running these same checks.
- If BLOCKED: Fix issues and re-run `/bw-verify`

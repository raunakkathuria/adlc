# Philosophy

Buildwright is a lightweight engineering discipline layer. It is not a
multi-agent framework.

## Principles

- **KISS:** Prefer the simplest readable solution that solves the current need.
- **YAGNI:** Do not add speculative features, extension points, or abstractions.
- **DRY:** Search for existing functions, types, utilities, and docs before
  creating new ones.
- **Boring technology:** Prefer proven tools and project-local patterns.
- **Fail fast:** Validate inputs at boundaries and surface clear errors.
- **No premature optimization:** Make it correct first; optimize with evidence.

## TDD

Use Red -> Green -> Refactor for behavior changes.

- **Red:** Write a failing test that reproduces the bug or describes expected
  behavior.
- **Green:** Write the smallest implementation that passes.
- **Refactor:** Improve names, structure, duplication, and design while tests
  stay green.

## Documentation Is Part of Done

Every feature, bug fix, behavior change, command change, config change, or
public workflow change must check documentation before verification.

Update affected docs in the same work item: README, docs, command text,
examples, API docs, changelog, or generated user-facing docs. If no docs need
updating, state why in the final report.

## Financial Code

Use Decimal, BigDecimal, integer minor units, or the project-approved money
type for currency and trading calculations. Never use floating point for money.

## Code Standards

- Follow existing patterns exactly.
- Keep files focused and readable.
- Validate user input.
- Avoid type-system escape hatches unless the project already requires them.

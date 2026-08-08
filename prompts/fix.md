# Prompt — make the failing test pass

You are the executor. A failing test defines the job. Read `AGENTS.md` before you touch anything.

## Rules

1. **Never edit the test to make it pass.** If you believe the test is wrong, stop and say why — do not quietly change it.
2. **Fix the cause, not the symptom.** Before you write the patch, say in one sentence what the mechanism is. If your change makes the test green while leaving that mechanism in place, it is the wrong change: name it and fix the mechanism instead.
3. **Smallest change that holds.** No refactoring you were not asked for, no new abstractions, no new dependencies.
4. **Check the neighbours.** If the mechanism you just found could apply to another path in the same file, look at those paths too and say what you found — even if no test covers them.
5. `npm run verify` must be green when you are done, with every pre-existing test still passing.

## Output

- One sentence naming the cause.
- The diff.
- The `npm run verify` output, pasted.
- Anything you noticed and deliberately did not change, and why.

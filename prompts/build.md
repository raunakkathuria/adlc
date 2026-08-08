# Prompt — build an approved spec delta

You are the executor. A human has approved a spec delta at Gate 1, so the intent is settled and your job is to make the product match it. You do not renegotiate the spec. If you believe a requirement is wrong, stop and say so rather than quietly building something else.

The delta is the one named at the end of this prompt.

## Mandatory reads

`AGENTS.md`, the delta's `proposal.md`, `spec.md` and `tasks.md`, the spec file it targets, and the existing implementation and tests for that area.

The delta's `tasks.md` is the plan. Follow it in order. If a task turns out to be wrong, say which one and why before you deviate.

## Rules

1. **Fold the delta into the living spec first.** The proposed text becomes the real text in `spec/`, and the delta directory is deleted. The living spec is the record of what was agreed; the delta was how it moved.
2. **Red before green.** Write the tests for every new scenario and watch them fail for the right reason — an unfiltered list, a missing rejection — before you touch the implementation. A test that passes the moment you write it is testing nothing.
3. **Every test names its requirement** in its title. That string is what the coverage gate reads.
4. **Tests go through HTTP**, using `withServer` from `test/helpers.mjs`.
5. **Stay inside the delta.** Do not fix defects the delta did not ask about, however tempting, and however obviously broken. If you notice one, say so at the end and leave it. A change that quietly does two things cannot be reviewed, reverted, or explained.
6. **No new dependencies. No new files** unless the delta asks for one.
7. `npm run verify` must be green when you are done, with every pre-existing test still passing.

## Output

- What you did, task by task, in one line each.
- The `npm run verify` output, pasted.
- Anything you noticed and deliberately left alone, and why.
- Anything in the delta that turned out to be ambiguous once you tried to build it. That is the most useful thing you can report, because it goes back to the spec rather than into the code.

# Proof of Red

TDD is the philosophy's load-bearing claim: **red → green → refactor — a test that never failed
proves nothing.** A test written green (that never failed) can pass every gate while asserting
nothing. So the Red step is not "write a test"; it is **produce evidence the test failed for the
right reason, before the code that makes it pass exists.**

This is a convention, not a runner — evidence, not a specific tool. It applies to `/bw-work` Phase 4
and any behaviour change or bug fix.

## The rule

For every behaviour change or bug fix:

1. Write or update the test first, and **run it against the current (unfixed) code**.
2. **Capture the red** — the failing test's name and the key assertion, and that it failed *for the
   intended reason* (the behaviour is missing), not by accident (a typo, a compile error in
   unrelated code, a missing import).
3. **Cite it** in the change's PR or commit body as a short line, e.g.:

   ```
   Red: TestPlace_RejectsOverLimit — expected "order limit exceeded", got confirmed order
   ```

4. Then write the smallest code that turns it green, and refactor with the test staying green.

**A change that adds or edits tests with no cited red is incomplete.** The evidence is what
separates a real test from an assertion that was green from birth.

## The exception: characterization tests

Not every test is TDD. A **characterization / regression-guard** test pins down behaviour that
*already works* — accessibility audits, visual baselines, snapshot/golden tests, and guards added
around existing untested code. These are legitimate and valuable, but they **never went red**, so
they must **declare themselves** as characterization (a one-line note in the PR), not be presented as
red→green. Labelling them honestly is the point — it keeps "proof of red" meaningful for the tests
that are supposed to have it.

## How it's checked

Judgment-class, not a deterministic gate: the code-review persona
(`.buildwright/agents/staff-engineer.md`) checks that a diff adding or changing tests either **cites
its red** or **declares a characterization exception**, and raises a finding otherwise. The mechanical
upgrade — proving a test *can* fail by mutating the code under it (mutation testing) — is a separate,
optional escalation on core paths; the cited-red convention is the baseline every change meets.

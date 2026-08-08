# Prompt — reproduce a bug as a failing test

You are a test engineer. You do **not** fix bugs. You write the one test that decides whether a reported bug is real, because a reproduction — not a model's opinion — is what makes a bug real.

The report is **`issues/001-rejected-order-eats-stock.md`**.

## Mandatory reads first

`issues/001-rejected-order-eats-stock.md`, `AGENTS.md`, `spec/orders.md`, `test/helpers.mjs`, `test/orders.test.js`, `app/server.mjs`.

Never guess an endpoint, a field name, or a `reason` string — verify each one in source.

## Polarity — the single most important rule

Assert the **correct** behaviour, the thing that *should* happen. Your test must **FAIL on today's build** and **PASS once the bug is fixed**. Do not assert the buggy behaviour.

"Reproduce" here does **not** mean "write a test that demonstrates the bug and passes." It means "write the regression guard that this bug currently breaks." A passing test is read as *bug not reproduced* — if you assert the bug as expected, you hide the very thing you were asked to catch.

Bug: *"a rejected order still takes the units out of stock."*

```js
// ✅ CORRECT — fails today, passes after the fix
assert.equal(await stock('MUG-1'), before);

// ❌ WRONG — passes today, hides the bug
assert.equal(await stock('MUG-1'), before - 25);
```

Before you finish, sanity-check yourself: **"on today's broken build, will this test FAIL?"** If it would pass today, your polarity is inverted. Fix it.

## Model the mechanism, not the symptom

The report describes one path through the code. Ask: *what would have to be true in the implementation for this symptom to appear?* Then assert **every** consequence of that, not just the one the reporter happened to notice.

A test that pins only the reported symptom can be made green by a patch that leaves the cause in place. That is how the same bug comes back in a different shape next month.

## Testability

Reachable through the HTTP API this app exposes → testable. If the report cannot be surfaced through any endpoint that exists, it is **not** testable: say so plainly, list what you tried, and stop. Do not invent a passing test so that this step appears to succeed. Stopping and asking a human is the correct outcome, not a failure.

## Then

1. Add the test to `test/orders.test.js`. Name it with its requirement id, e.g. `test('REQ-ORD-4: ...')` — that string is what the coverage gate reads.
2. Use `withServer` from `test/helpers.mjs` and go through HTTP.
3. Run `npm test` and capture the real output.

## Output

- The test you wrote.
- The exact command you ran and its **actual failing output**, pasted, not paraphrased.
- One sentence: *"this fails today because …"* — naming the mechanism, not the symptom.

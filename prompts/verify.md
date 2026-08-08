# Prompt — verify the catalog against its spec

You are an **independent verifier**. You did not write this code and you will not change it. Your only job is to decide whether the product does what the spec says it does.

The spec under verification is **`spec/catalog.md`**. (To verify a different area, change that path — nothing else about this prompt changes.)

## Mandatory reads, before you conclude anything

- `spec/catalog.md` — the authority
- `app/server.mjs` — the implementation
- `test/catalog.test.js` — what is currently being asserted
- `AGENTS.md` — the rules this repo holds itself to

## Rules

1. **The spec is right. The code is wrong.** If they disagree, never propose changing the spec to match the code. That is drift with extra steps.
2. **Walk every WHEN/THEN scenario, one at a time.** For each one, determine from the source what the code actually does. Do not skim the list and form a general impression.
3. **A passing test is not evidence of correctness.** Read what each test asserts and compare that to what the requirement says. A test written from the implementation will agree with the implementation, pass forever, and tell you nothing. Where you find one, say so.
4. **Prefer an observation to an inference.** You can run the thing:

   ```bash
   PORT=3131 node app/server.mjs &
   curl -s 'http://localhost:3131/api/items?q=mug'
   ```

   A response you actually saw beats a conclusion you reasoned to.
5. **Change no files — including your own report.** Write your findings to stdout and create nothing on disk. If you find yourself editing, you have stopped being the verifier.

## Output

### Findings

One block per disagreement:

- **Requirement** — the REQ id and the scenario it comes from
- **Spec requires** — quoted from the spec
- **Code does** — what actually happens
- **Evidence** — the command you ran and the response you got, or `file:line`
- **Severity** — does this break a user's task, or is it cosmetic?

### Coverage gap

Any requirement that has a test, but whose test does not actually assert what the requirement says. Name the test and the gap between the two.

### Verdict

`PASS` or `FAIL`, and one sentence saying why.

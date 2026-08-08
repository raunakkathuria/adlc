Reviewed against the diff, `AGENTS.md`, `spec/orders.md`, and the full `app/server.mjs`. Polarity checked empirically: with `app/server.mjs` stashed, all three new tests go red and all 14 pre-existing tests stay green; restored, `npm run verify` is green (17/17, 9 requirements covered).

## Findings

**Low** · `prompts/verify.md:27` — an unrelated prompt-doc edit is bundled into a bug fix. `AGENTS.md:61` requires atomic commits staged file-by-file; this change has nothing to do with issue 001 or REQ-ORD-4.
*Failure scenario:* the change lands as one `fix: rejected order no longer consumes stock` commit. Later the fix is reverted (or cherry-picked to a release branch) and the verifier's file-creation rule goes with it — or the commit gets titled `fix:` while carrying a process-rule change no one reviewing the bug would look for. Split it into its own `docs:` commit; stage `app/server.mjs` and `test/orders.test.js` only.
*Confidence:* high on the scope problem. The wording itself is fine — `run.sh` doesn't redirect output and `artifacts/expected/*` reads as shipped reference material, so I can't demonstrate any breakage from "create nothing on disk."

**Low** · `app/server.mjs:58-59` — reason precedence between REQ-ORD-2 and REQ-ORD-3 is unspecified and untested, and this diff moved these two lines without naming it. `prompts/fix.md:10` (rule 4, "check the neighbours") asks the fixer to report exactly this even where no test covers it.
*Failure scenario:* observed, `POST /api/orders {"sku":"PEN-1","qty":21}` against seeded stock of 8 → `422 {"reason":"insufficient_stock"}`. Both requirements' WHEN clauses match that input: REQ-ORD-2's ("8 in stock and 12 are ordered") and REQ-ORD-3's ("WHEN 21 units are ordered THEN … `over_limit`"). The status is 422 either way, so only the `reason` string differs — but that string is the product's explanation to the user, and a shopper told "insufficient_stock" will retry with a smaller qty that is still over the cap. No test pins either answer, so a future reorder of these two lines changes user-visible behaviour and the gate stays green.
*Confidence:* low-medium, and this is an interpretation call rather than drift. "Regardless of stock" most plainly means the cap bites even when stock is ample, and under that reading the code is correct — the spec simply doesn't say which reason wins. The fix is right either way; what's missing is a sentence saying which reading was chosen, and a test that pins it.

Out of scope, noted not counted: `listItems` (`app/server.mjs:41`) is case-sensitive and searches `name` only, against REQ-CAT-3's "SKU or name … case-insensitive." Untouched by this diff and it's the subject of the verify exercise.

`APPROVE` — the mutation now sits behind every guard, so this removes the cause rather than compensating for it, and the three new tests were confirmed red on the pre-fix build; nothing in the code or tests needs to change, only the `verify.md` edit split into its own commit.

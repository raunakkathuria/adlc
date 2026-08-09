# artifacts — real runs, committed

`expected/` and `unattended/` are captured output from running the prompts in [`prompts/`](../prompts/) against this repo. Terminal output, diffs, and failure messages are real. Nothing there was written by hand to look good.

Each of those runs was produced by piping **one prompt file into one CLI**, with nothing else: no hint about where the bug was, no follow-up turns, no corrections, no second attempt. What is committed is the first response. That is the claim this repo makes — not that something ran overnight, but that nobody steered it.

One scoped exception: **the two spec deltas in `gate-1/` are constructed exercise material.** An exercise needs a known answer, so one of them has flaws planted on purpose. The advisory reviews *of* those deltas are real runs. `gate-1/README.md` says which is which.

That split matters for two reasons. You can do every exercise without an agent CLI, and you can check the claims in the README against the evidence instead of taking them.

The runs used Claude Code in headless mode:

```bash
./run.sh prompts/verify.md spec/catalog.md
```

Your own runs will not match these, and that is expected. The gate is deterministic; the worker is not.

## `expected/` — one reference run per step

| File | The step | What it shows |
|---|---|---|
| `01-verify-catalog.md` | the Verifier | Drift in both directions. **Missing:** both halves of the search defect, with curl evidence. **Extra:** an entire unspecified web UI, an error handler leaking internal messages to clients, three reason codes in no spec, and a silently-ignored `?max_price` — cross-referenced against the delta sitting at Gate 1 whose own rule forbids exactly that. Then a verdict that splits the routing. |
| `02-reproduce.md` | reproduce | The reasoning behind the reproduction, including why it pinned more than the reported symptom. |
| `02-reproduce.diff` | reproduce | The actual tests it wrote. Three of them. |
| `03-fix.md` | fix | The cause named in one sentence, then the patch. |
| `03-fix.diff` | fix | The correct fix: the write moves below every guard. |
| `04-review.md` | review | Review of that fix. `APPROVE`, plus a real spec gap nobody had noticed. |
| `05-review-of-the-naive-fix.md` | review | Review of the **tempting** fix, the one that adds the stock back on the reject path. `REQUEST CHANGES`. |
| `06-reproduce-002-escalation.md` | reproduce | A bug that could not be reproduced. No test written, eight endpoints tried, handed to a human. |

Read `04` and `05` together. Two different fixes for the same bug, both passing all 17 tests, and the deterministic gate cannot separate them. One review approves and one asks for changes. That pair is the most useful thing in this directory.

`06` is the second most useful. A loop that only ever succeeds has not been tested.

## `unattended/` — three issues, three endings

What the loop looks like running unattended. Three issues arrived overnight and none of them ended with an agent merging its own work.

See [`unattended/README.md`](unattended/README.md).

## `gate-1/` — two spec deltas waiting on a human

Exercise 3. Two proposed behaviour changes with the advisory reviews that ran when each one opened. No code exists for either. Your job is to decide whether the intent is agreed and testable.

## Regenerating any of this

```bash
./run.sh prompts/verify.md spec/catalog.md
```

That opens an interactive session, which is what you want when you are watching it work. To **capture** a run to a file the way the ones here were captured, print the prompt and pipe it to a headless CLI instead:

```bash
./run.sh --print prompts/verify.md spec/catalog.md \
  | claude -p --allowedTools "Read Grep Glob Bash(node:*) Bash(npm:*) Bash(curl:*)" \
  > artifacts/expected/01-verify-catalog.md
```

Same prompt text either way — `--print` emits exactly what the interactive path hands the CLI, target line included.

Worth doing before you run a session. The output will differ from what is committed, which is honest and worth showing people.

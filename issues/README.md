# issues — the only way in

Work arrives from wherever people are: a chat message, a support ticket, a customer email, an idea in a meeting. The line accepts it exactly one way, as a **tracked issue**.

Tracking lives on GitHub, where it is visible to anyone: [open issues](https://github.com/raunakkathuria/adlc/issues). Each file here carries a `github:` link to its issue in the front matter.

## So why are there files here as well?

Because a tracked issue and the thing the line reads are two different objects, and this directory is the second one.

The first station of the loop is *"take the issue in"* — copy it into the repo as a file, and read only that file from then on. Two reasons, and neither is about convenience:

- **A run becomes reproducible from the commit alone.** Every later station reads the same bytes. Nobody has to wonder whether the issue was edited halfway through, or what it said when the delta was written.
- **The loop does not need credentials.** You can run all of this on a plane, on a fork, or on a machine that has never seen a GitHub token.

That is not a workshop shortcut. It is what [`.github/workflows/intake.yml`](../.github/workflows/intake.yml) does on a real run — look at its **"Take the issue in, as data"** step. It reads the issue with `gh issue view`, writes it to a file, and everything after that point works from the file — nothing from an issue body is ever interpolated into a shell command. The three files here are the same move, done by hand, so the stations can be run locally without a GitHub token.

## The three, and why they are different shapes

| File | GitHub | What it is | Where it goes |
|---|---|---|---|
| `001-rejected-order-eats-stock.md` | [#2](https://github.com/raunakkathuria/adlc/issues/2) | a bug with a clear symptom | reproduce → fix. No spec delta: a rebuild from the spec would not lose it. |
| `002-confirmation-email-wrong-total.md` | [#3](https://github.com/raunakkathuria/adlc/issues/3) | a report about a surface this system does not own | nothing. Two stations concluded there was nothing here to fix, and it went to a human. |
| `003-filter-catalog-by-price.md` | [#4](https://github.com/raunakkathuria/adlc/issues/4) | a request that changes behaviour | spec delta → Gate 1 → build. The spec moves before any code does. |

None of them is written in a ticket template, on purpose. Real requests do not arrive that way, and a loop that only works on well-formed input is not much of a loop.

## Running a station against one

```bash
./run.sh prompts/triage.md issues/003-filter-catalog-by-price.md
```

The second argument names the target. Leave it off and each prompt falls back to its own stated default.

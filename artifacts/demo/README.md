# demo — the feature, built

Part 1 of the workshop, on this branch. The approved delta went in, and this came out.

[`02-build.md`](02-build.md) is the run. It is worth reading in full, but four things in it carry the session.

## It stayed inside the change

The delta's `tasks.md` warned it about the search defect and said work around it, do not fix it here. It did exactly that: `?q=Notebook` in the composition tests, not `?q=notebook`, so the new feature's tests don't fail for an unrelated reason.

Then it listed what it left alone, unprompted — the search defect, the stock leak from issue 001, and a pre-existing `innerHTML` interpolation it declined to widen. Scope discipline is the thing people assume an agent cannot do.

## It found a hole in the gate

> "`req-coverage` matches on requirement ids, so it reports REQ-CAT-3 ✓ while two of its written scenarios are untested. The gate structurally cannot see this."

The living spec now carries two `REQ-CAT-3` scenarios written in lowercase that no test asserts, because today's search cannot honour them. The requirement has tests, the coverage gate is satisfied, and two of its scenarios are unchecked. That is the same lesson Part 2 opens with, arrived at from the inside.

## It argued with the delta it was given

> "A delta shouldn't ship with an open question inside the text that becomes the spec — the answer belongs there, the question doesn't."

The delta specified `max_price=0` → `200` and then asked Gate 1 to confirm it. The build did what the approved text said, then said why the delta was shaped wrong. That objection routes to the spec process, not to the code.

## It named what it made true by accident

Four things the delta left unspecified now have de facto answers, because code cannot abstain: which malformed caps count as malformed (`007` is accepted, `1e3` is not), what a repeated `?max_price=1&max_price=2` does, and what the page shows on a `400`. Each of those is a decision that was made by an implementation detail rather than by a person, and saying so out loud is what makes them fixable.

That is the honest shape of this loop. It does not eliminate unspecified behaviour. It makes the unspecified behaviour *visible* at the point it gets decided, in a report a person can read.

## Then the Verifier signed it off

[`04-verify.md`](04-verify.md) is the independent check, run against this branch by something that wrote none of it and shares no session with what did. It re-derives the feature from the spec before reading any code.

**On the feature itself it is clean.** `REQ-CAT-4` holds on every one of its nine scenarios and all four composition rules — *"the cap is correct work."*

It found two other things:

- **Missing** — the search defect is still there, because this change deliberately did not touch it. Per-diff review passed that. The independent check did not. That is the whole argument for a third role, happening on its own without being set up.
- **Extra** — the accepted grammar for the cap is `/^\d+$/`, which the spec never states. So `1e3` is a whole number and refused anyway, `+800` is refused, `0800` is silently normalised to 800. The spec named exactly two rejections; the code invented a third rule.

That last one is the interesting bit, because **the build had already confessed to it** in `02-build.md`. Two stations, working from opposite ends and sharing no context, landed on the same gap — one noticed while writing the code, the other while reading the spec. Neither was told to look.

## Seeing it

```bash
git diff main feat/filter-by-price
npm run verify
npm start          # a max-price box beside the search box
```

The pull request is open on green gates. Nothing merges it but a person — that is Gate 2.

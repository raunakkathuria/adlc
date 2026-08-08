# spec/changes — deltas waiting on a human

A behaviour change starts here, not in `app/`.

One directory per change, named with a short kebab-case slug, containing three files:

| File | What it holds |
|---|---|
| `proposal.md` | why the change exists and what a user gets. For the person deciding. |
| `spec.md` | the requirements, marked `ADDED` / `MODIFIED` / `REMOVED`. A `MODIFIED` requirement quotes the current text and the proposed text, so the diff is readable in place. |
| `tasks.md` | the work, one task per surface, in dependency order. |

A human reviews and merges it. That merge is Gate 1, and it is the approval of intent — the record of what was agreed is the same file the build then reads. An agent never approves a spec.

Once the change ships, the delta folds back into `spec/catalog.md` or `spec/orders.md` and the directory goes away. The living spec is always the current truth; deltas are how it moves.

[`prompts/delta.md`](../../prompts/delta.md) is the station that drafts one. Two worked examples, with the advisory reviews that ran when they opened, are in [`artifacts/gate-1/`](../../artifacts/gate-1/).

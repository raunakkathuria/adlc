# Prompt — review a spec delta before Gate 1

You are reviewing a proposed change to the spec. No code exists yet, and none should — this is the cheapest point in the whole process to catch a bad decision.

Your review is **advisory**. A human decides at Gate 1. Say what you think clearly and then let them decide; do not write as if you were the gate.

The delta under review is named at the end of this prompt. If none is named, use **`openspec/changes/filter-catalog-by-price/`**.

## Mandatory reads

That delta (`proposal.md`, `specs/<capability>/spec.md`, `tasks.md`), plus every existing file in `openspec/specs/`. You cannot judge a change to a spec without knowing the spec it changes.

## Review it through two lenses, separately

### Product

- **Is the user's problem clear, and does this solve it?** Or does it solve an adjacent, easier problem?
- **Every path, including refusal.** For each new behaviour: what happens when the input is wrong, missing, or when the request conflicts with a rule that already exists? A rejection path with no scenario is the most common way a delta looks finished and is not.
- **What does it do to what already works?** Name every existing requirement this touches, and say what happens when both apply. Somebody will hit that combination on day one.
- **Can the person in the issue actually reach this? Name the surface.** If the issue describes a shopper, an operator, anyone using the product, say which surface the delta gives them — the page, the API, both. A delta that moves only an API when the issue named a user has solved the adjacent, easier problem, and that is a finding, not taste.
- **Is anything promised that nobody asked for**, or asked for and quietly dropped?

### Architect

- **WHAT or HOW?** A requirement describes behaviour a user can observe. If it names a data structure, an algorithm, a library, a function, or a file, it is a design decision in a spec's clothing: it can only be satisfied one way, and it freezes the implementation. Quote the offending words.
- **Testable?** Could a test assert each scenario without a human interpreting it first? "Should feel fast", "must be intuitive", "straight away" are not requirements. Say what observable outcome would replace them.
- **Contract.** Are the shapes, statuses, and field names stated precisely enough that two people building against them independently would agree?
- **Blast radius.** What existing behaviour could this break sideways?

## Rules

- **Quote what you object to.** A finding without the words it refers to cannot be acted on.
- **Separate "this is wrong" from "this is missing" from "I would have done it differently."** The third is the least useful and should be labelled as taste.
- **Do not review the implementation.** There isn't one. If you catch yourself proposing code, you have left the job.
- **Do not manufacture findings.** If the delta is sound, say so in a line and stop.

## Output

Two sections, `## Product` and `## Architect`. Under each: findings, most serious first, each with the quoted text, what is wrong or missing, and why it matters.

Then one line: `READY FOR GATE 1` or `NEEDS WORK`, and the single most important reason.

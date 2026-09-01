# Announce order feedback to assistive technology

## Why now

`#note` is where the storefront reports what just happened to an order — placed, or rejected and why. Right now it's an ordinary `<div>`: sighted users see the message appear, but a screen reader user gets nothing unless they go looking for it. The action they just took (clicking "Order") produces a result they can't perceive without extra effort. Found by the line itself while working issue #4, on the same page.

## What changes for the user

A screen reader user who places an order, or has one rejected, hears the outcome the same moment a sighted user sees it — no need to move focus to `#note` to discover what happened. This applies uniformly: every message `#note` ever shows (success or any rejection reason) is announced the same way, because it's the same region.

## Out of scope

- The catalogue search results (`#items`, and its "Nothing matches" empty state) — a different region, not named in the issue.
- The orders list (`#orders`) — reflects history, not the result of the action just taken; not named in the issue.
- Any visual/styling change to the note message itself.
- Choice of assertive vs. polite announcement urgency — this delta asks for the standard non-interrupting live-region behaviour; nothing about this feedback needs to interrupt the user.

## Open question

None — the fix is narrow and the correct behaviour (automatic announcement of both outcomes) is unambiguous from the issue.

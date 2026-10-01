# Give the maximum price field a visible label

## Why now

Issue #145: the catalogue's maximum price field is named only by an `aria-label` and a placeholder. The placeholder vanishes as soon as a shopper types, so nothing on screen says what the number means. The search box got its visible label in `search-box-visible-label` (`REQ-CAT-14`), which explicitly deferred this field to a separate change. This is that change.

## What changes for the user

A shopper sees the words "Maximum price" next to the price field at all times — before typing, while typing, and after. The placeholder hint stays. The visible words equal the field's accessible name (`Maximum price`, `REQ-CAT-13`), so speech control users can say what they read. Nothing about filtering, parsing, refusal messages or announcements changes.

## Out of scope

- Price parsing, the three field states, refusal message and live-region wording (`REQ-CAT-13`) are untouched; the accessible name stays exactly `Maximum price`.
- Page-only: no API change, and no refusal path, since the label takes no input.
- Presentation (size, colour, position, alignment with the search field) stays unspecified, as `REQ-CAT-14` left it.
- The reason `search-box-visible-label` gave for leaving this field out ("this issue is only the search box") expires here; its reason for the search box's `Search the catalogue` text is unaffected.

## Open question

The issue also asks that the field show it is in pounds. `REQ-CAT-13` fixes the accessible name to exactly `Maximum price`, so a label reading `Maximum price (£)` would contradict it. This delta therefore labels the field `Maximum price` only. **Decision for Gate 1: should the page also show a persistent, separate unit hint (for example `£` beside the field, outside the label)?** If yes, say so and the Planner adds it; if no, the pound unit remains visible only in the placeholder and in the `£` amounts the summary states.

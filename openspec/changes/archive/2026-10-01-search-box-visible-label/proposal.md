# Give the search box a visible label

## Why now

Issue #129: the catalogue search field is named only by an `aria-label` and a placeholder. The placeholder disappears as soon as a shopper types, and an `aria-label` is invisible to everyone who is not using assistive technology. Once there is text in the box, nothing on screen says what the field is. `REQ-CAT-5` (shipped in `label-search-input`) fixed the *accessible* name and deliberately left sighted users with no visible change; this delta closes the visible half.

## What changes for the user

A shopper sees the words "Search the catalogue" next to the search box at all times — before typing, while typing, and after. The placeholder hint (the "try “mug”" examples) stays. Nothing about searching itself changes. The visible words match the field's accessible name, so a person using speech control can say what they read.

## Out of scope

- Search behaviour (`REQ-CAT-3`), the live-region summary (`REQ-CAT-7`) and every empty-state message are untouched.
- The accessible-name guarantee of `REQ-CAT-5` is unchanged and still holds; this adds to it.
- The maximum price field (`REQ-CAT-13`) keeps its `aria-label` and placeholder. This issue is only the search box. A visible label for the price field is a separate change, not this one.
- No API change: this is a page-only requirement. There is no refusal path, since the label takes no input.
- `REQ-CAT-5`'s earlier "no visible change" stance came from `label-search-input`, which scoped out sighted users because the gap was then about screen readers. That reason does not hold for this issue, which is explicitly about sighted users.
- Presentation is deliberately not specified: the label's size, colour and spacing, and the alignment of the search field and maximum price field in the filter row. The verifier flagged the shipped choices (small muted label above the field; filter row aligned to the bottom edge) as unspecified. They are declared non-requirements, so a later restyle needs no spec change as long as the label stays visible. The price field's accessible name is untouched.

The label's contrast and size stay a design choice. This delta does not set a minimum.

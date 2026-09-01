# Label the catalogue search input

## Why now

The catalogue search input (`<input type="search" id="q">`) has no `<label>` and no `aria-label` — its only hint is placeholder text. Placeholder text disappears the moment someone types, and isn't reliably exposed as an accessible name across assistive technology. A screen reader user tabbing to the field, or one whose AT doesn't read placeholders, hits a control with no announced purpose. This was found by the line's own accessibility check while building #4, and filed as its own issue.

## What changes for the user

A screen reader (or other assistive technology) user now hears what the field is for when they reach it, independent of whether they've typed anything or whether their AT reads placeholders. Sighted users see no change: the input's placeholder — including the example queries — keeps showing exactly as it does today.

## Out of scope

- Any other accessibility issue on the page (the quantity input already carries `aria-label`; this delta touches only the search control).
- Changing the search behaviour itself (REQ-CAT-3 — matching, case-insensitivity — is unaffected).
- A general accessibility audit; the Quality station covers that separately, ongoing.

## Open question

Should the accessible name also be shown on screen as visible text (e.g. a small "Search" label above the field), or stay off-screen so today's layout is pixel-identical? Either satisfies the requirement below; this is a look-and-feel call for the human at Gate 1.

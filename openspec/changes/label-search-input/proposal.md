# Label the catalogue search input

## Why now

The catalogue page's search field (`<input type="search" id="q">`) has no `<label>` and no `aria-label` — its only accessible name comes from the `placeholder` attribute. Placeholder text is not a substitute for a label: it disappears the moment someone types, and not every assistive technology exposes it as the field's name at all. A screen-reader user landing on this field today hears an unnamed search box, which is the accessibility line's job to catch and this delta's job to fix.

## What changes for the user

Someone using assistive technology on the catalogue page can now identify the search field by name — "Search the catalogue" or equivalent — the moment focus lands on it, whether or not they've typed anything yet. Sighted mouse/keyboard users see no visible change: the field keeps its current placeholder hint and behaviour.

## Out of scope

- The quantity input (`#qty-{sku}`) already carries an `aria-label` and needs no change.
- No change to search *behaviour* — matching, case-insensitivity, and the `q` query parameter are unaffected (see `REQ-CAT-3`).
- A full accessibility audit of the rest of the page is a separate concern; this delta covers only the search field's accessible name.

## Open question

None — the fix is unambiguous (an accessible name independent of placeholder); the exact mechanism (visually-hidden `<label>` vs `aria-label`) is an implementation choice, not a spec decision.

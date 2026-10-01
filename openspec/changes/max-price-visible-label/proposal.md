# Give the maximum price field a visible label

## Why now

Issue #145: the catalogue's maximum price field is named only by an `aria-label` and a placeholder. The placeholder vanishes as soon as a shopper types, so nothing on screen says what the number means. The search box got its visible label in `search-box-visible-label` (`REQ-CAT-14`), which explicitly deferred this field to a separate change. This is that change.

## What changes for the user

A shopper sees the words "Maximum price" next to the price field at all times — before typing, while typing, and after. The placeholder hint stays. The visible words equal the field's accessible name (`Maximum price`, `REQ-CAT-13`), so speech control users can say what they read. Nothing about filtering, parsing, refusal messages or announcements changes.

## Out of scope

- Price parsing, the three field states, refusal message and live-region wording (`REQ-CAT-13`) are untouched; the accessible name stays exactly `Maximum price`.
- Page-only: no API change, and no refusal path, since the label takes no input.
- Exact pixel sizes and spacing stay unspecified. The label matches the search label's text size and colour, and sits above its field. The two input boxes line up along their bottom edges.
- The reason `search-box-visible-label` gave for leaving this field out ("this issue is only the search box") expires here; its reason for the search box's `Search the catalogue` text is unaffected.
- No separate `£` beside the field. The label is exactly `Maximum price`. The placeholder still hints at pounds while the field is empty.

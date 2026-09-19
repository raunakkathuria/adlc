# Give the disabled Order button an accessible reason

## Why now

Issue #104: when an item's stock is 0, its Order button is rendered `disabled` (`REQ-ORD-13`) with an accessible name of "Order {name}" (`REQ-ORD-8`). A screen-reader user who tabs to it hears only that the control is unavailable — the reason ("0 in stock") lives in the card's sibling `.meta` text (`REQ-CAT-10`), which the button does not reference. A sighted shopper reads both at a glance; a screen-reader user gets only half the story and has to go looking for the rest of the card to find out why. Found by the line on a scheduled exploration of the default branch.

## What changes for the user

A screen-reader user who tabs to a disabled Order button now hears why it is disabled — its existing stock count — without having to separately locate and read the rest of the card. Nothing about a well-stocked item's button changes: no description is added where there is nothing to explain. The reason is carried as an accessible description associated with the button (for example, via `aria-describedby` pointing at the card's existing stock text), not folded into the button's accessible name, so `REQ-ORD-8`'s name — "Order {name}" — is exactly as it was.

The reason reuses the stock count the card already displays; this delta introduces no new wording, icon, or label. The [prior change that disabled the button](../../changes/archive/2026-09-16-disable-order-button-at-zero-stock/proposal.md) scoped out "new wording ... this delta does not add copy" on the reasoning that the existing "0 in stock" text already said why the button was disabled — that reasoning still holds; this delta only wires the button to text that already exists, it does not add any.

## Out of scope

- No change to the server-side stock check (`REQ-ORD-2`) or its rejection reason — this is an accessibility fix to an existing client-side hint (`REQ-ORD-13`), not a change to what is accepted or rejected.
- No change to the button's accessible name (`REQ-ORD-8`) — it continues to name only the item, unaffected by this delta.
- No change to the quantity input, its accessible name, or its `id`/`max` attributes (`REQ-CAT-10`, `REQ-ORD-12`) — this delta touches only the Order button's relationship to the existing stock text.
- No restock mechanism exists in this app, so there is no scenario for a button regaining stock after having been disabled; an item's stock only ever falls (`REQ-ORD-1`).

## Open question

None. The issue offered two mechanisms — `aria-describedby` or folding the reason into the accessible name — and this proposal picks the former: it keeps `REQ-ORD-8`'s accessible name ("Order {name}") exactly as shipped, whereas folding the reason into the name would change it every time an item sells out.

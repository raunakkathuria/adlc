# Give the disabled Order button an accessible reason

## Why now

Issue #104: when an item's stock is 0, its Order button is rendered `disabled` (`REQ-ORD-13`) with an accessible name of "Order {name}" (`REQ-ORD-8`). Its native `disabled` attribute keeps it out of the Tab order, so no Tab-key user ever reaches it — but a screen-reader user reading the page in browse mode, with the arrow keys, still lands on it and hears only that the control is unavailable. The reason ("0 in stock") lives in the card's sibling `.meta` text, which the button does not reference. A sighted shopper reads both at a glance; a screen-reader user gets only half the story and has to go looking for the rest of the card to find out why. Found by the line on a scheduled exploration of the default branch.

## What changes for the user

A screen-reader user who reaches a disabled Order button while reading the page in browse mode — with the arrow keys, since the button's native `disabled` attribute keeps it out of the Tab order, unchanged by this delta — now hears why it is disabled — that item's own stock text, exactly as the card already shows it, "{n} in stock" (for example "0 in stock") — without having to separately locate and read the rest of the card. That description is exactly the stock text, not the card's whole meta line: the meta line also carries the SKU and price, and neither belongs in the reason for why the button is disabled. The stock text is shown as plain, inert text, the same guarantee the card's name and SKU already carry, so nothing in it is ever read as markup. When two or more items are out of stock at once, each one's button is described by that item's own stock text, never another item's. Nothing about a well-stocked item's button changes: no description is added where there is nothing to explain. The reason is carried as an accessible description associated with the button (for example, via `aria-describedby` pointing at the card's existing stock text), not folded into the button's accessible name, so `REQ-ORD-8`'s name — "Order {name}" — is exactly as it was.

The reason reuses the stock text the card already displays; this delta introduces no new wording, icon, or label. The [prior change that disabled the button](../../changes/archive/2026-09-16-disable-order-button-at-zero-stock/proposal.md) scoped out "new wording ... this delta does not add copy" on the reasoning that the existing "0 in stock" text already said why the button was disabled — that reasoning still holds; this delta only wires the button to text that already exists, it does not add any.

## Out of scope

- No change to the server-side stock check (`REQ-ORD-2`) or its rejection reason — this is an accessibility fix to an existing client-side hint (`REQ-ORD-13`), not a change to what is accepted or rejected.
- No change to the button's accessible name (`REQ-ORD-8`) — it continues to name only the item, unaffected by this delta.
- No change to the quantity input, its accessible name, or its `id`/`max` attributes (`REQ-CAT-10`, `REQ-ORD-12`) — this delta touches only the Order button's relationship to the existing stock text.
- No restock mechanism exists in this app, so there is no scenario for a button regaining stock after having been disabled; an item's stock only ever falls (`REQ-ORD-1`).
- No change to the Tab order — a disabled button is not in it, and this delta does not alter that. The native `disabled` attribute already keeps a zero-stock Order button unreachable by the Tab key; this delta only adds an accessible description a screen-reader user reaches in browse mode, which does not depend on Tab focus.

## Open question

None. The issue offered two mechanisms — `aria-describedby` or folding the reason into the accessible name — and this proposal picks the former: it keeps `REQ-ORD-8`'s accessible name ("Order {name}") exactly as shipped, whereas folding the reason into the name would change it every time an item sells out.

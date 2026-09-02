# Give each item's Order button its own accessible name

## Why now

Every item card renders `<button data-sku=...>Order</button>` with no per-item accessible name. A screen-reader user navigating the catalogue by buttons hears "Order" repeated once per item, with nothing distinguishing a mug's Order button from a book's. The adjacent quantity input already gets this right — `aria-label="Quantity of ${item.name}"` — which is what makes the Order button's omission visible by contrast. This was found by the line's own quality station on the running app (issue #29) and confirmed by a human as real and worth fixing.

## What changes for the user

Someone using assistive technology on the catalogue page hears each item's Order button announced with the item's name — "Order Enamel Mug", "Order Notebook" — instead of an unqualified "Order" repeated for every card. Sighted mouse/keyboard users see no visible change: the button's visible label stays "Order".

## Out of scope

- The quantity input's `aria-label` already names its item correctly and needs no change.
- No change to the ordering behaviour itself (REQ-ORD-1 through REQ-ORD-6) or to what happens when the button is clicked — only the button's accessible name.
- The order-outcome live-region announcement (REQ-ORD-7) is a separate, already-shipped concern.

## Open question

None — the fix is unambiguous (an accessible name that includes the item's name); the exact mechanism (`aria-label` vs. visually-hidden text) is an implementation choice, not a spec decision.

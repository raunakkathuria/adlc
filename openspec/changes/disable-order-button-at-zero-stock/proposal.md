# Disable the Order button when an item has zero stock

## Why now

Issue #99: an item card's Order button stays enabled once its stock reaches 0. A shopper who doesn't read the "0 in stock" text clicks Order, waits for a round trip, and only then learns via "Rejected — not enough in stock." (`REQ-ORD-2`, `REQ-ORD-9`) that the order was doomed from the start. The failure is entirely predictable from data the page already has before the click. Found by a scheduled exploration of the default branch; pre-existing card behaviour, unrelated to the order-confirmation-item-name change.

## What changes for the user

A shopper looking at an item with 0 in stock now sees its Order button disabled, so they learn the item is unorderable at a glance instead of after a failed submission. An item with any stock above 0 is unaffected — its Order button behaves exactly as today. The moment an order (this shopper's or one already in flight) drops an item's stock to 0, the next time the catalogue re-renders that item, its button is disabled too.

## Out of scope

- The quantity input is left exactly as it is today: still enterable, still carrying its existing `min`, `max` (`REQ-ORD-12`), and default value, even for a zero-stock item. Disabling the button already prevents a doomed submission; disabling the input as well would be an added restriction the issue doesn't ask for, on a control that already does nothing without an enabled button beside it.
- No change to the server-side stock check (`REQ-ORD-2`) or its rejection reason (`insufficient_stock`) — the disabled button is a hint, and the check it hints at remains the actual rule, exactly as `REQ-ORD-12`'s `max` hint left `REQ-ORD-3` untouched.
- No new wording, icon, or "out of stock" label — the existing "0 in stock" meta text (`REQ-CAT-10`) already says why the button is disabled; this delta does not add copy.
- No change to the button's accessible name (`REQ-ORD-8`) or the quantity input's accessible name/`id` (`REQ-CAT-10`) — both keep naming the item exactly as before, disabled or not.

## Open question

None — the fix is exactly what the issue proposes: disable the Order button once stock is 0, leaving the server-side rule as the actual authority.

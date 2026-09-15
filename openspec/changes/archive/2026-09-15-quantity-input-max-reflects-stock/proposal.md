# Quantity input's max reflects stock, not just the order cap

## Why now

Issue #96: the previous fix (`quantity-input-max-hint`, issue #91) gave every item card's quantity input `max="20"`, hinting the 20-unit order cap (`REQ-ORD-3`). But that `max` is static — it ignores the item's own stock (`REQ-ORD-2`). For an item like the Fineliner Pen (8 in stock), a shopper using the spin-button can increment all the way to 20 with no friction, then submit and be told "not enough in stock" without the input ever having hinted that stock, not the order cap, was the binding constraint. Found by the line while working issue #91, and explicitly named there as a follow-up decision rather than folded into that change.

## What changes for the user

Each item card's quantity input now hints whichever limit actually binds for that item: `max` is the smaller of the 20-unit order cap and the item's current stock. A well-stocked item (Enamel Mug, 47 in stock) still sees `max="20"`, unchanged. A scarcer item (Fineliner Pen, 8 in stock) now sees `max="8"`, so the spin-button stops where an order would actually be rejected for insufficient stock, instead of at a cap the item never had enough stock to reach. The hint stays a hint: typing a larger value by hand still reaches the server, which still rejects it under the existing, unchanged rules (`REQ-ORD-2`, `REQ-ORD-3`). When an order lowers an item's stock, the item card's next render — the same refresh that already happens after every order — carries the new, lower hint.

## Out of scope

- No client-side validation, warning message, disabled state, or clamping of a typed value. `quantity-input-max-hint` scoped this out for the same reason it still holds here: the server's rejection remains the single source of truth for refusing an over-limit or over-stock order.
- No "out of stock" badge, no disabling the Order button or the quantity input, and no other change to how a low- or zero-stock item is otherwise displayed — this delta only changes what the existing `max` attribute hints, not how stock is otherwise surfaced.
- No change to the 20-unit threshold, to `REQ-ORD-2`'s stock check, or to any other order rule (`REQ-ORD-4`, `REQ-ORD-5`).
- No change to the quantity input's `min`, default value, `id`, or accessible name (`REQ-CAT-10`).

## Open question

When an item is out of stock (0), should the hint be `max="0"` (the literal `min(20, stock)`, even though it sits below the input's own `min="1"`), or should the input instead fall back to `max="1"` so the hint never contradicts the input's own minimum? This delta implements the literal `min(20, stock)` reading — `max="0"` — since the input remains a hint only and the item is already unorderable in any quantity per the existing stock rule; a human may prefer the fallback if a `max` below `min` is judged confusing on its own.

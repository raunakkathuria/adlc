# Quantity input hints the 20-unit order cap

## Why now

Issue #91: the item card's quantity input (`<input type="number" min="1">`) carries no `max`, so a shopper who edits the quantity only discovers the 20-unit cap (`REQ-ORD-3`) after submitting and reading the rejection note. Adding a `max` matching that cap lets the browser's own number-input affordances hint the limit up front, alongside the existing server-side check. Found by a scheduled exploration of the default branch; minor, not blocking.

## What changes for the user

A shopper who adjusts an item's quantity now sees the input's own browser affordances (for example, its spin-button) reflect the 20-unit cap before they submit. Someone who types a larger value by hand can still submit it — the server-side rejection and its plain-English wording (`REQ-ORD-3`, `REQ-ORD-9`) are unchanged and remain the actual limit; this delta adds a hint, not a new check.

## Out of scope

- No new client-side validation, warning message, disabled state, or clamping of a typed value — the server's rejection remains the single source of truth for refusing an over-limit order.
- No change to the 20-unit threshold itself, or to any other order rule (`REQ-ORD-2`, `REQ-ORD-4`, `REQ-ORD-5`).
- No change to the quantity input's `min`, default value, `id`, or accessible name (`REQ-CAT-10`).

## Open question

None — the fix is exactly what the issue proposes: a static `max` attribute mirroring the existing, unchanged server-side limit.

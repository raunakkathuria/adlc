# Escape catalog item name/SKU wherever the page renders them into markup

## Why now

The catalogue page's item cards splice `item.name` and `item.sku` straight into `innerHTML` — in the visible name and SKU line, in the quantity input's `aria-label` and `id`, and in the Order button's `aria-label` and `data-sku` — without escaping. This is the exact class of bug already fixed for the search query (`REQ-CAT-6`), and that earlier fix explicitly deferred hardening this data with the reasoning that "the catalog's own in-memory data... has no write path a shopper can reach." That reasoning is what the issue disputes: it costs nothing to close now, and it stops being free the moment the catalog gains any write path (an admin screen, a bulk import, a future integration) — at which point this becomes a stored-XSS vector with no code between the untrusted data and every shopper's browser. Closing it now, while it is still free, means a future write path inherits safe rendering instead of inheriting this gap.

## What changes for the user

Nothing changes for the catalogue's current fixed item data — every existing name and SKU renders exactly as it does today, visibly and in the quantity/Order controls' accessible names, identifiers, and data attributes. What changes is what *would* happen if an item's name or SKU ever contained markup: it now displays as plain, inert text everywhere the page shows it, instead of being parsed as HTML or executed as script — and an item can still be found, its quantity set, and its order placed and correctly identified to the API, no matter what characters its name or SKU contain.

## Out of scope

- The order-history list (`loadOrders`'s `${o.sku}` / order lines) is not touched by this delta — the issue names the item-card template and the Order button's `aria-label` specifically, and the order-history rendering is a separate surface with its own escaping gap if one exists.
- No change to what data an item card displays, to search behaviour, or to any accessible name's wording — only to how already-specified or already-rendered text is made safe against markup injection.
- The catalog still has no write path today; this delta does not add one; it only makes existing rendering safe in case one is added later.

# Escape catalog item name/SKU wherever the page renders them into markup

## Why now

The catalogue page's item cards splice `item.name` and `item.sku` straight into `innerHTML` — in the visible name and SKU line, in the quantity input's `aria-label` and `id`, and in the Order button's `aria-label` and `data-sku` — without escaping. This is the exact class of bug already fixed for the search query (`REQ-CAT-6`), and that earlier fix explicitly deferred hardening this data with the reasoning that "the catalog's own in-memory data... has no write path a shopper can reach." That reasoning is what the issue disputes: it costs nothing to close now, and it stops being free the moment the catalog gains any write path (an admin screen, a bulk import, a future integration) — at which point this becomes a stored-XSS vector with no code between the untrusted data and every shopper's browser. Closing it now, while it is still free, means a future write path inherits safe rendering instead of inheriting this gap.

## What changes for the user

Nothing changes for the catalogue's current fixed item data — every existing name and SKU renders exactly as it does today, visibly and in the quantity/Order controls' accessible names, identifiers, and data attributes, and every existing order confirmation reads exactly as it does today. What changes is what *would* happen if an item's name or SKU ever contained markup: it now displays as plain, inert text everywhere the page shows it — including the confirmation banner an order's own SKU is echoed back into — instead of being parsed as HTML or executed as script. An item can still be found, its quantity set, and its order placed and correctly identified to the API, no matter what characters its name or SKU contain.

The confirmation banner is in scope because it is reached by the same click that exercises everything else this delta hardens: placing an order for a markup-SKU item, from that item's own now-safe card, would otherwise land that same unescaped SKU right back on the page a moment later. The rejection message stays out of this delta's reach on purpose — it already shows only fixed, plain-English wording (`REQ-ORD-9`), never a raw field value, so there is nothing there to escape. The order-history list is excluded for the same reason it always was: it is a separate surface, not reached by this click, with its own escaping gap to fix separately if one exists.

## Out of scope

- The order-history list (`loadOrders`'s `${o.sku}` / order lines) is not touched by this delta — the issue names the item-card template and the Order button's `aria-label` specifically, and the order-history rendering is a separate surface with its own escaping gap if one exists.
- The order-rejection message is untouched — it already carries only fixed wording, never a raw field value (`REQ-ORD-9`), so it has no equivalent gap to close.
- No change to what data an item card displays, to search behaviour, or to any accessible name's wording — only to how already-specified or already-rendered text is made safe against markup injection.
- The catalog still has no write path today; this delta does not add one; it only makes existing rendering safe in case one is added later.

## Open question

The round-trip scenario (an item with a markup SKU can still be ordered, end to end) needs a test that recovers the SKU from the page's own rendered, escaped markup — parsing `data-sku`/`id` back out and driving the real click handler — rather than reusing the raw SKU as a shortcut. The project's test harness is a Node-based DOM stand-in, not a real browser engine, so even an extended harness proves attribute round-tripping by matching decode logic rather than by observing an actual browser parse it. Is that harness-level proof acceptable evidence for this scenario, or does it warrant standing up a real (e.g. headless) browser engine for this one test?

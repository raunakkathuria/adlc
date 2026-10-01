## Why

A zero-stock item's quantity input renders `min="1" max="0"` and stays enabled beside a disabled Order button (`REQ-ORD-13`). A shopper can type a quantity that can never be ordered, and assistive technology is told nothing about why. `REQ-ORD-13` currently *requires* that input to stay enterable, so this is a spec change, not a code slip. (Issue #123; found by reading the served script, as the live catalogue has no zero-stock item.)

## What changes for the user

- At zero stock the quantity input is disabled, next to the already-disabled Order button.
- That input is described by the item's own stock text ("0 in stock"), the same text the button already points to.
- Items with stock keep an enabled input, including while their order is in flight.
- The server is unchanged: it still rejects any order for a zero-stock item (`REQ-ORD-2`).

This modifies `REQ-ORD-13` only. `REQ-ORD-12` is untouched: a disabled input still carries `min="1"`, `max="0"` and default `1`, so its scenarios still hold. No new requirement id is taken (`REQ-ORD-15` is claimed by the focus delta).

## Out of scope

- Changing the `min`/`max` hint on the input (`REQ-ORD-12`).
- Holding the input while an order is in flight; `REQ-ORD-14` holds only the button, and this keeps that.
- Any server behaviour.
- Page-only behaviour needs no separate API scenarios beyond the server-still-rejects one; the page is the only surface involved.

## Open question

The existing scenario named "the quantity input is unaffected" is kept by name, because a MODIFIED block cannot rename a scenario; its content now covers only in-stock items, so the name is misleading. Likewise the heading "the Order button is disabled when stock is zero" now covers the input too. Do you want REQ-ORD-13 renamed (RENAMED section) or the input split into its own requirement (new id, REMOVED+ADDED costs the scenario names)? Default if you say nothing: keep both names as they are.

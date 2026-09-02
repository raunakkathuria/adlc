# Fix search to match SKU or name, case-insensitively

## Why now

`REQ-CAT-3` in the living spec already requires `GET /api/items?q=` to match against **both** SKU and name, case-insensitively — a shopper who types `mug` or `book-1` should find `Enamel Mug` (`BOOK-1`) either way. The code never caught up: `listItems()` in `app/server.mjs` only checks `item.name.includes(query)`, case-sensitively. `curl '.../api/items?q=mug'` returns `[]` instead of the mug; `curl '.../api/items?q=book-1'` returns `[]` instead of `BOOK-1`. The spec is correct as written; the implementation is the defect (issue #17, found while working #4).

## What changes for the user

Typing a search in a different case than the item's name — or typing the SKU instead of the name — now finds the item, on both the `GET /api/items?q=` endpoint and the catalogue page's search field that calls it. A query that still matches nothing still returns an empty list (and the existing empty-state message, `REQ-CAT-6`). Nothing about `max_price` (`REQ-CAT-4`) changes.

## Out of scope

- No change to what fields are searchable — SKU and name only, as `REQ-CAT-3` already states.
- No change to `REQ-CAT-4`'s price filtering or its composition with `q`.
- No change to the empty-state message rendering (`REQ-CAT-6`) or the accessible-name behaviour (`REQ-CAT-5`) of the search field.

## Open question

None — the correct behaviour is already fully specified by the living `REQ-CAT-3`; this delta reaffirms it against the id-reuse rule so Gate 1 has an artifact to approve, and the fix is confined to bringing `listItems()` into compliance.

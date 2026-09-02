# Escape the search query in the catalogue's empty-state message

## Why now

The catalogue page's `loadItems()` builds the "no results" message by splicing the raw search query straight into `innerHTML`: `` `<p class="empty">Nothing matches "${q}".</p>` ``. A query like `<img src=x onerror=alert(1)>` is not escaped, so the browser parses it as markup and runs the handler — a script-injection path reachable by anyone who can type into the search field. This was filed as a security bug (issue #13), not a cosmetic one, and it should close before it ships to more users.

## What changes for the user

Typing an ordinary search that matches nothing still shows `Nothing matches "your query"` exactly as before. Typing a query that contains markup or script — accidentally or otherwise — now shows that text back as inert, visible characters instead of being interpreted as part of the page. Nothing runs, and nothing is inserted into the page's structure beyond the message itself.

## Out of scope

- The item name, SKU, and quantity-input rendering (`loadItems`'s matched-item cards, `loadOrders`'s order lines) are unaffected by this delta. They come from the catalog's own in-memory data, which has no write path a shopper can reach — today's issue is specifically the search query, which *is* user-supplied and reflected verbatim.
- No change to search matching behaviour (`REQ-CAT-3`) or to what results are returned — only to how the "no results" message displays the query that produced them.
- No change to the order-outcome `note()` messages — their content comes from a fixed set of server-defined reasons, not from free-text user input.

## Open question

Should this delta also proactively harden the item-name/SKU/order-line rendering as defense-in-depth, even though no path exists today for a shopper to put untrusted content into that data? Recommendation: no — fix the reported path now, and treat the rest as a separate concern if the catalog ever gains a write path.

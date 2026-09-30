# A price control on the catalogue page

## Why now

Issue #110: `GET /api/items?max_price={cents}` (`REQ-CAT-4`) is fully specified and validated, but the page has no way to use it — a shopper can narrow by the search box only. An endpoint nobody can reach from the page has not given the shopper anything. The issue offers two ways out: a control, or an explicit note that the parameter is API-only. This delta takes the first: price is something a shopper asks about ("what have I got under a tenner"), which is why `REQ-CAT-4` was written.

This was parked until #109 shipped. It has: `REQ-CAT-12` is now in the living spec, and it explicitly left the empty-state wording for a price-narrowed zero result to this change.

## What changes for the user

- The catalogue page gains a labelled **maximum price** field beside the search box. The shopper types a price in pounds, as the page already shows prices (`£8.00`); the page hands the API the equivalent cents. Leaving it empty means no ceiling.
- It narrows the list live, together with the search box (both must hold — `REQ-CAT-4`'s composition), and the order-triggered refresh keeps whatever ceiling is applied.
- A value that is not a price (`abc`, `-1`, `1.234`) is refused **on the page**, in words, and announced; no request is sent and the list keeps showing what it showed. The field is never silently ignored.
- When a ceiling is applied the page says so in both the item area and the live-region summary, e.g. `Nothing costs £5.00 or less.` / `Nothing matches “mug” at £5.00 or less.` / `Showing 2 items at £10.00 or less.` This replaces the "out of scope" note in `REQ-CAT-12`: a zero result under a ceiling is never called "The catalogue is empty."
- Stale-response discarding (`REQ-CAT-8`) and the load-failure message (`REQ-CAT-11`) cover a ceiling change like any other request.

The new requirement is `REQ-CAT-13`; `REQ-CAT-12` is modified so its scope note matches reality. The API is unchanged; the price field's text is never written into the page as markup — only the page's own formatted amount is.

## Out of scope

- Any change to the API or to `REQ-CAT-4`'s validation.
- A minimum price, a price range, or sorting by price (same exclusions as the archived `catalog-price-filter` proposal; its reasons still hold).
- Persisting the ceiling across reloads or in the URL.
- Currencies other than the page's existing `£`.
- Rewording `REQ-CAT-6` / `REQ-CAT-7`: their wording stays exactly as shipped when no ceiling is applied. `REQ-CAT-13` states what replaces it when one is, rather than editing those requirements wholesale.
- The known limitation recorded in `REQ-CAT-11` (post-order refresh failure) is unchanged.

## Open question

Should the field take **pounds** (`10` or `10.50`, converted to cents by the page — this draft's choice, since every price the shopper sees is in pounds) or **raw cents** (`1050`, matching the API exactly but unlike anything on the page)?

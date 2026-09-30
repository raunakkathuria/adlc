# A price control on the catalogue page

## Why now

Issue #110: `GET /api/items?max_price={cents}` (`REQ-CAT-4`) is fully specified and validated, but the page has no way to use it — a shopper can narrow by the search box only. An endpoint nobody can reach from the page has not given the shopper anything. The issue offers two ways out: a control, or an explicit note that the parameter is API-only. This delta takes the first: price is something a shopper asks about ("what have I got under a tenner"), which is why `REQ-CAT-4` was written.

This was parked until #109 shipped. It has: `REQ-CAT-12` is now in the living spec, and it explicitly left the empty-state wording for a price-narrowed zero result to this change.

The issue left the field's unit open. This delta decides it: the shopper types **pounds**, the same unit the page already shows (`£8.00`). The page converts to cents from the digits. Raw cents stay the API's unit and are not what the field accepts.

## What changes for the user

- The catalogue page gains a labelled **maximum price** field beside the search box. The shopper types a price in pounds. The page trims the field the way it trims the search box, then hands the API the equivalent cents: `19.99` is `1999` cents, taken from the digits, never from a binary fraction. An empty field, or one holding only whitespace, means no ceiling. ` 10 ` is ten pounds.
- It narrows the list live, together with the search box (both must hold — `REQ-CAT-4`'s composition), and the order-triggered refresh keeps whatever ceiling is applied.
- A trailing decimal point (`10.`) or a lone `.` is still being typed. That is not a refusal: no error is announced, no request is sent, and the list stays as it was. A value that cannot become a price — `abc`, `-1`, `1e3`, `10.505`, `£10`, `1,000`, or more than 13 digits before the decimal point — is refused on the page with the exact words `Enter a maximum price such as 10 or 10.50.` The field is `aria-invalid` and described by that message. No request is sent for that edit, and a response already in flight is discarded so it cannot clear the refusal or redraw the list. The field is never silently ignored.
- While the field holds a refused value, changing the search, refreshing after an order, or retrying a failed load still requests the list, and that request omits `max_price`. The message stays on the field until the shopper clears it, leaves it incomplete, or replaces it with a valid price.
- When a ceiling of `10` is applied and nothing remains, the item area shows exactly `Nothing costs £10.00 or less.` and the live region reads exactly `Showing 0 items at £10.00 or less.` With a query `{q}` and nothing remaining, both the item area and the live region read exactly `Nothing matches “{q}” at £10.00 or less.` A zero result under a ceiling is never `The catalogue is empty.` The amount in every one of these messages is the ceiling, formatted as the page formats prices.
- Stale-response discarding (`REQ-CAT-8`) and the load-failure message (`REQ-CAT-11`) cover a ceiling change like any other request.

The new requirement is `REQ-CAT-13`. `REQ-CAT-6`, `REQ-CAT-7`, `REQ-CAT-8`, `REQ-CAT-9`, and `REQ-CAT-12` are modified only so a ceiling, or a refused field, is not described by wording that was written for the page with no price field. The API is unchanged. The price field's text is never written into the page as markup — only the page's own formatted amount is.

## Out of scope

- Any change to the API or to `REQ-CAT-4`'s validation.
- A minimum price, a price range, or sorting by price (same exclusions as the archived `catalog-price-filter` proposal; its reasons still hold).
- Persisting the ceiling across reloads or in the URL.
- Currencies other than the page's existing `£`.
- Rewriting the no-ceiling scenarios of `REQ-CAT-6`, `REQ-CAT-7`, and `REQ-CAT-12`. Their wording when no ceiling is applied stays as shipped. This delta says, in each, that `REQ-CAT-13` decides the wording while a ceiling is applied.
- The known limitation recorded in `REQ-CAT-11` (post-order refresh failure) is unchanged.

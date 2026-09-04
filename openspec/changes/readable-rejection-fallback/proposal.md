# Show a readable message when an order rejection's reason isn't one the page recognizes

## Why now

The page's rejection message comes from a lookup: `REJECTIONS[body.reason] ?? \`Rejected — ${body.reason}.\`` (`app/index.html:139`). The four reasons the API can currently return for a rejected order — `over_limit`, `insufficient_stock`, `unknown_sku`, `invalid_qty` — are all in that table, so the fallback is dead in practice today. But it is one server response away from firing: any reason the table doesn't name shows up verbatim as a raw, underscore-joined internal identifier instead of a sentence a shopper can read, and a response with no reason at all renders as "Rejected — undefined." The line's own drift check found this while working issue #66; it is a robustness gap in the client, not something a user has hit yet.

## What changes for the user

Whatever reason a rejected order carries, the message shown is always a plain-English sentence. The four reasons that already have specific wording keep exactly that wording, unchanged. Anything else — a reason the page's table doesn't cover, or no reason at all — now shows a generic, readable message instead of the server's raw code or the literal word "undefined". This message still lands in the same order-outcome region, announced to assistive technology the same way an order confirmation or a known rejection is today.

## Out of scope

- Adding, removing, or renaming any order-rejection reason the server returns — this change only affects how the page renders a reason once it exists.
- Changing the wording of the four already-mapped messages.
- The order API's response shape or status codes — this is a page-rendering fix only.
- The catalogue's other messages (the empty-state search text, `max_price` validation errors) — different code path, not touched by this change.

## Open question

What exact copy should the generic fallback message use? Anything that reads as plain English and names no internal identifier satisfies the spec below (for example, "Rejected — please try again." or "Rejected — something went wrong."); Gate 1 can pick the wording, or leave it to the build.

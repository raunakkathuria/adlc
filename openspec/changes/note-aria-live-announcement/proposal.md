# Announce order outcomes to assistive technology

## Why now

Placing or being refused an order changes the page silently: the confirmation or rejection text is written into `#note`, but nothing tells a screen reader it happened. A sighted shopper sees the message; someone using assistive technology gets no signal at all that their order succeeded, or why it didn't. Issue #18 — found by the line's own quality check while working issue #4 — asks for the fix: the region needs to announce itself.

## What changes for the user

The order-outcome message — the confirmation shown after a successful order, and the rejection reason shown after a refused one — is exposed as a live region. Nothing about the wording or the layout changes; a screen reader now announces the update automatically, the moment it happens, without the user having to move focus to find it. Because the region exists in the page from the start, this holds even for the very first order someone places.

## Out of scope

- The catalogue's "nothing matches" search message, and any other on-page text besides the order-outcome region. Issue #18 is scoped to order success/rejection; broadening the fix to every dynamic message on the page is a separate change with its own Gate 1.
- Wording changes to the confirmation or rejection messages themselves.
- Any change to the order API's response shape or status codes — this is a page-only fix.

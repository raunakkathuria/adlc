## Why now

Issue #122 (the same defect as the earlier #50, closed unfixed). After a shopper places an order from the keyboard, the page refreshes the item list, which removes the focused Order button from the page. Focus drops to the top of the document, so a keyboard or screen-reader user has to Tab from the start after every order. The issue is parked on `needs-human`; approving this spec is the confirmation it asks for.

## What changes for the user

- After an order, keyboard focus is still on the item they ordered. It returns to that item's Order button after the list refreshes. If that button is disabled in the refreshed list because the order took the item's stock to zero, focus goes to that item's quantity input instead, because a disabled button cannot hold focus.
- This applies whatever the order's outcome: confirmed, rejected, or not sent.
- Focus is only put back if it was on that item's Order button when the refresh arrived. A shopper who has already moved on, for example to the search field, is not pulled back.
- The outcome message is still announced through its live region (`REQ-ORD-7`). Focus does not move to it.

One new requirement, `REQ-ORD-15`, in the existing `orders` capability. It covers the page only, since there is no API change. No new capability directory.

## Out of scope

- **The quantity field resetting to 1** after a refresh (mentioned in one comment on the issue). That is a separate behaviour from keyboard focus, and it needs its own decision (see the open question).
- **Focus after a refresh that fails.** When the item list cannot be loaded (`REQ-CAT-11`), no Order button exists to return to. This delta does not say where focus goes. The earlier decision to leave it unspecified still holds: the failure message and its retry control are the only things on screen.
- **Focus after searching, the maximum-price field, or retrying the catalogue load.** None of these removes a control the shopper was operating from the keyboard in the way an order does. The search and price fields are not part of the replaced list.
- **Moving focus to the outcome message** (an alternative the issue floats). The live region already announces it, and focus on the item is the less disruptive choice.
- **The in-flight button state** (`order-button-in-flight-state`, `REQ-ORD-14`, another delta in flight). This delta does not depend on it and does not read its wording. If both ship, restoration happens against the refreshed list, which is when any in-flight state has ended.

## Open question

Should the quantity the shopper typed also survive the refresh, or is returning it to 1 after each order acceptable? Say "also preserve it" and a follow-up requirement is added; say "leave it" and nothing changes here.

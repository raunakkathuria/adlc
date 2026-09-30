# The Order button is unavailable while its order is in flight

## Why now

Issue #134 (found while working #130): after the shopper operates an Order button, nothing on the card changes until the server answers. On a slow network a shopper who sees no response clicks again, and each click places a real order — stock is taken and money is owed twice. The server is right to accept both: it cannot tell a double-click from two deliberate orders, so the page has to stop the second click. (The issue says it is unverified from source reading; the page's click handler does not guard against re-entry, so the delta specifies the corrected behaviour and the build starts from a test.)

## What changes for the user

- From the moment a shopper operates an item's Order button until that order's outcome is known, that item's Order button is disabled. A second click, or a second Enter/Space press, places nothing.
- The button comes back once the outcome is known, whatever it was: confirmed, rejected, or not sent (`REQ-ORD-11`), so a shopper whose order never arrived can try again. It also comes back if the outcome was withheld because the search changed meanwhile (`REQ-ORD-7`).
- Only the item being ordered is held. The shopper can order a different item while the first is pending.
- The hold follows the item, not the element: if the item list re-renders while the order is pending (a search, the price ceiling, a retry), the item's new button is still disabled.
- The button's name and its visible text ("Order") do not change, and the outcome message still arrives through the existing live region.
- The API is unchanged: it still accepts every valid order it is sent.

## Out of scope

- Server-side protection against duplicates (idempotency keys, rejecting the same order twice). Two identical orders are legitimate at the API, and `REQ-ORD-1` through `REQ-ORD-6` are untouched.
- Disabling the quantity input or other items' buttons while an order is pending.
- Changing the order-outcome message, including any change to the withhold/clear rules of `REQ-ORD-7`. Adding a "placing…" message would interact with those rules (see the open question), so it is not done here. `order-outcome-follows-the-field` (in flight) works on the same rules and adds no requirement ids; this delta adds one and modifies nothing it touches.
- Timeouts or cancellation of a pending order.

## Open question for Gate 1

The issue offers "disable the button, **or** show a status message". This delta picks the disabled button alone, because a "Placing your order…" message in the live region would have to be reconciled with clearing on search change, withheld outcomes, and not replacing a not-sent message (`REQ-ORD-7`). Decision: is a disabled button enough, or do you also want a "placing…" announcement (a follow-up delta)?

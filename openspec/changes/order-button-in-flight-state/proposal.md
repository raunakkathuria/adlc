# The Order button is unavailable while its order is in flight

## Why now

Issue #134 (found while working #130): after the shopper operates an Order button, nothing on the card changes until the server answers. On a slow network a shopper who sees no response clicks again, and each click places a real order — stock is taken and money is owed twice. The server is right to accept both: it cannot tell a double-click from two deliberate orders, so the page has to stop the second click. (The issue says it is unverified from source reading; the page's click handler does not guard against re-entry, so the delta specifies the corrected behaviour and the build starts from a test.)

## What changes for the user

- From the moment a shopper operates an item's Order button until that order's outcome is known, that item's Order button is disabled with the native `disabled` attribute. A second click, or a second Enter or Space press, places nothing. Exactly one order is sent, and stock drops by that quantity once.
- The button is enabled again at the moment the outcome is known: confirmed, rejected, not sent, or withheld. That is not when the post-order refresh arrives. If the card then showing already says 0 in stock, `REQ-ORD-13` keeps it disabled. A shopper who orders again before the refresh lands is placing a new order; the server still checks stock. That window is accepted.
- A not-sent outcome whose reply could not be read may mean the server already placed the order. The button comes back anyway, so it does not stay dead. The history is where the shopper checks. That cost is accepted.
- Only the item being ordered is held. The shopper can order a different item while the first is pending.
- The hold follows the item. If the list re-renders, or the item leaves and comes back, or a failed load is retried, the item's new button stays disabled until the outcome is known.
- There is no "placing…" sentence. Disabling the focused button takes it out of the Tab order, and this change does not move focus. That cost is accepted; restoring focus is a separate issue.
- A button disabled only because an order is in flight does not carry the "0 in stock" description. `REQ-ORD-13` is modified so that description applies only when the button is disabled because stock is 0.
- The API is unchanged: it still accepts every valid order it is sent.

## Out of scope

- Server-side protection against duplicates (idempotency keys, rejecting the same order twice). Two identical orders are legitimate at the API, and `REQ-ORD-1` through `REQ-ORD-6` are untouched.
- Disabling the quantity input or other items' buttons while an order is pending.
- Changing the order-outcome message, including any "placing…" announcement. The in-flight signal is the disabled button alone.
- Moving focus when the button is disabled.
- Timeouts or cancellation of a pending order.

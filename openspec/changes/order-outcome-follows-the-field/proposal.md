# The order-outcome scenarios agree with the withhold rule

## Why now

Issue #130: `REQ-ORD-7` as archived says a confirmation or a rejection is written into the live region, and also says one that arrives after the search has changed is not written. `REQ-ORD-9` repeats the first of those. A reader, or a later build, can treat the unconditional scenarios as the rule and announce a result beside the wrong search. The page already withholds that result. This delta makes the spec say so, and names the costs that were left implicit.

## What changes for the user

Nothing on the page. The behaviour already shipped:

- The query an order was placed under is the trimmed text of the search field when the Order button is operated, not the results still on screen.
- A confirmation or a rejection is announced only when that field is unchanged at the moment the outcome arrives. Changing the query and changing it back during the flight shows the outcome.
- A late rejection is not announced. The history does not record a rejection (`REQ-ORD-4`), so the reloaded history does not gain an entry and the shopper is not told. That cost is accepted: a rejection for one search must not be read as current beside another.
- A late confirmation is not announced either. The shopper sees no message, and the only trace is the history list, so they may order again. That cost is accepted for the same reason: the confirmation must not sit beside a different search. `REQ-ORD-11` calls silence the worst outcome for an order that was never sent; a withheld confirmation is a different case, because the order was sent and is in the history.
- The history list is reloaded either way. A withheld confirmation appears there. A withheld rejection does not.
- The catalogue cards stay as they were until a later search, because the refresh for the old query is discarded (`REQ-CAT-8`). The Order button and the quantity limit can therefore be stale, and a follow-up order can be rejected for stock. That cost is accepted.
- A maximum-price change is not this comparison. It does not clear a showing outcome and does not withhold an in-flight one.
- Two orders in flight are each compared with the field at their own click. An outcome that matches when it arrives replaces whatever the region holds.
- A not-sent message stays across later searches until another order outcome replaces it. A withheld confirmation or rejection does not replace it.

## Out of scope

- Changing the page. It already compares the trimmed field at the click.
- Timed auto-dismissal of the message.
- Recording a rejection in the order history.

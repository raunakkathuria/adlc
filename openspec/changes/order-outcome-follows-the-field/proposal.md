# The order-outcome scenarios agree with the withhold rule

## Why now

Issue #130: `REQ-ORD-7` as archived says a confirmation or a rejection is written into the live region, and also says one that arrives after the search has changed is not written. `REQ-ORD-9` repeats the first of those. A reader, or a later build, can treat the unconditional scenarios as the rule and announce a result beside the wrong search. The page already withholds that result. This delta makes the spec say so, and names the costs that were left implicit.

## What changes for the user

Nothing on the page. The behaviour already shipped:

- The query an order was placed under is the trimmed text of the search field when the Order button is operated, not the results still on screen.
- A confirmation or a rejection is announced only when that field is unchanged at the moment the outcome arrives. Changing the query and changing it back during the flight shows the outcome.
- A late rejection is not announced. The history does not record a rejection, so the shopper is not told. That cost is accepted.
- The history list is reloaded even when a confirmation is withheld, so the accepted order appears there. The catalogue cards may still show the stock from before the order until the next search, because the refresh for the old query is discarded (`REQ-CAT-8`).
- A not-sent message stays across later searches until another order outcome replaces it. A withheld confirmation or rejection does not replace it.

## Out of scope

- Changing the page. It already compares the trimmed field at the click.
- Timed auto-dismissal of the message.
- Recording a rejection in the order history.

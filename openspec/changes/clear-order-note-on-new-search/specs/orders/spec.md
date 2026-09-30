## MODIFIED Requirements

### Requirement: REQ-ORD-7 — order outcome is announced to assistive technology

The page's order-outcome region SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that assistive technology announces its content automatically whenever it changes, without the user needing to move focus to it. A successful order's confirmation message SHALL echo the ordered item's name alongside its `sku`, `qty`, and `total` — the same `{name} ({sku})` grouping the order history already uses (`REQ-ORD-10`) — so a shopper who does not recognize a SKU can still tell what they ordered without leaving the confirmation. Both that name and that SKU SHALL be inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script — the same guarantee already required for the search query (`REQ-CAT-6`), for the item card's own display of that name and SKU (`REQ-CAT-10`), for the Order button's accessible name and `data-sku` attribute (`REQ-ORD-8`), and for the order-history entry (`REQ-ORD-10`). Once shown, a confirmation or a rejection SHALL NOT outlive the search it was placed beside. When the trimmed search query changes, the region SHALL be emptied of that message, so a stale order result is never read as current beside results it has nothing to do with. The trim is the one the page already applies before searching. A change that leaves the trimmed query the same — typing or deleting only whitespace — is not a change, and the message stays. A not-sent message (`REQ-ORD-11`) is not cleared by a search change: emptying it would leave the shopper with no sign the order may not exist, and the order history cannot record an order that never arrived. This is the same notion of a search as `REQ-CAT-7` — a change to the query the shopper types — and not the listing refresh an order itself triggers, nor the catalogue's retry of the same query. Both of those SHALL leave the outcome in place. Emptying the region writes no text into it; the region's text content is empty. The query an order was placed under is the trimmed text of the search field at the moment the Order button is operated, not the query of the results still on screen. A confirmation or a rejection that arrives when the trimmed field differs from that value is not written into the region, because it would sit beside a different search. The scenarios below that write a confirmation or a rejection into the live region apply only when the trimmed field at arrival still holds that value. What counts is the comparison at the moment of arrival: if the shopper changed the query and changed it back while the order was in flight, the field matches again, and the outcome is shown as usual. A withheld confirmation or rejection never replaces a not-sent message already showing. Withholding a late rejection is a decided cost: the history does not record a rejection, so the shopper is not told, and that is accepted so a rejection for one search is not read as current beside another. The item-list refresh for the superseded query is still discarded (`REQ-CAT-8`), so the cards may still show the stock from before the order until the next search. The order history list is reloaded anyway, and a successful order appears there. A not-sent message that arrives after the query changed is written in and announced. It stays across later search changes until another order outcome replaces it.

#### Scenario: success is announced

- **WHEN** an order is placed successfully and the trimmed search field still holds the value it held when the Order button was operated
- **THEN** the confirmation message is written into the live region
- **AND** assistive technology announces it automatically

#### Scenario: the confirmation message includes the item's name

- **WHEN** an order for SKU `MUG-1`, quantity `2`, total `2500`, for an item named "Enamel Mug" is placed and accepted
- **THEN** the confirmation message reads `Order #{id} placed — 2 × Enamel Mug (MUG-1) for £25.00.`, where `{id}` is that order's own order number

#### Scenario: the SKU echoed in a successful order's confirmation is inert text

- **WHEN** an order for an item whose `sku` contains characters that would otherwise be read as markup — for example a quote or an ampersand — is placed and accepted
- **THEN** the confirmation message written into the live region displays that SKU as literal, inert text
- **AND** no script associated with that SKU runs

#### Scenario: the item name echoed in a successful order's confirmation is inert text

- **WHEN** an order for an item whose `name` contains characters that would otherwise be read as markup — for example a quote or an ampersand — is placed and accepted
- **THEN** the confirmation message written into the live region displays that name as literal, inert text
- **AND** no script associated with that name runs

#### Scenario: rejection is announced

- **WHEN** an order is rejected, for any reason, and the trimmed search field still holds the value it held when the Order button was operated
- **THEN** the rejection message is written into the live region
- **AND** assistive technology announces it automatically

#### Scenario: the region announces from the first order

- **WHEN** the page has just loaded and no order has been placed yet
- **THEN** the live region is already present in the page's markup
- **AND** the first order's outcome is announced, the same as every order after it

#### Scenario: a later outcome replaces an earlier one

- **WHEN** a second order is placed after the first, whether its outcome message reads the same as before or differently
- **THEN** the live region's content is replaced with the new outcome
- **AND** the new outcome is announced on its own, not appended to or stacked with the previous one

#### Scenario: changing the search clears an order's confirmation

- **WHEN** an order has been accepted and its confirmation is shown in the live region, and the shopper then changes the trimmed search query — by typing, deleting, or clearing it
- **THEN** the live region's text content is emptied as soon as the trimmed query changes, while the request for the new results is still pending
- **AND** the clearing writes no text into the region

#### Scenario: changing the search clears a rejection

- **WHEN** an order's rejection message (`REQ-ORD-9`) is shown, and the shopper then changes the trimmed search query
- **THEN** the live region's text content is emptied, exactly as for a confirmation
- **AND** the clearing writes no text into the region

#### Scenario: changing the search does not clear a not-sent message

- **WHEN** an order's not-sent message (`REQ-ORD-11`) is shown, and the shopper then changes the trimmed search query
- **THEN** that not-sent message stays in the live region

#### Scenario: whitespace that does not change the trimmed query leaves the message

- **WHEN** a confirmation is shown and the shopper types or deletes only whitespace, so the trimmed query is unchanged
- **THEN** the confirmation stays in the live region

#### Scenario: the order's own refresh does not clear its outcome

- **WHEN** an order is placed, accepted or rejected, and the item list refreshes afterward under the same query that was already applied (`REQ-CAT-7`)
- **THEN** the outcome message stays in the live region, unaffected by that refresh

#### Scenario: retrying the catalogue load does not clear the outcome

- **WHEN** an order outcome is shown and the shopper operates the catalogue's retry control, which reloads the same query
- **THEN** the outcome stays in the live region

#### Scenario: the page's first search does not disturb an outcome

- **WHEN** the page has just loaded and performs its automatic search with an empty query, and no order has been placed
- **THEN** the live region is unchanged, still present in the page's markup and empty

#### Scenario: a confirmation or rejection that arrives after the query changed is not shown

- **WHEN** an order is placed, the shopper changes the trimmed search query while that order is still in flight, and a confirmation or a rejection then arrives
- **THEN** that confirmation or rejection is not written into the live region
- **AND** the region's text stays as the clearing left it
- **AND** the order history list is reloaded and shows that order
- **AND** the item-list refresh for the superseded query is discarded (`REQ-CAT-8`), so the cards may still show the stock from before the order

#### Scenario: a query that changed and changed back does not withhold the outcome

- **WHEN** an order is placed under the query `mug`, the shopper changes the trimmed query to `book` and back to `mug` while that order is still in flight, and a confirmation then arrives
- **THEN** the confirmation is written into the live region and announced, because the trimmed query now equals the one the order was placed under

#### Scenario: a withheld outcome does not replace a not-sent message

- **WHEN** a not-sent message (`REQ-ORD-11`) is shown, another order is placed, the shopper changes the trimmed query while it is in flight, and a confirmation or a rejection then arrives
- **THEN** the not-sent message stays in the live region unchanged

#### Scenario: a not-sent message that arrives after the query changed is shown

- **WHEN** an order is placed, the shopper changes the trimmed search query while that order is still in flight, and the order was not sent (`REQ-ORD-11`)
- **THEN** that not-sent message is written into the live region and announced
- **AND** a later change of the trimmed query does not clear it

#### Scenario: the query is the field at the click, not the results still showing

- **WHEN** the search field has been changed to `mugs`, that search has not yet returned, the cards still show the previous results, and the shopper operates an Order button
- **THEN** the query that order was placed under is the trimmed field value `mugs`

#### Scenario: a not-sent message survives further searches

- **WHEN** a not-sent message is shown and the shopper changes the trimmed query, then changes it again
- **THEN** the not-sent message stays in the live region until another order outcome replaces it

#### Scenario: a later order after a clear is announced normally

- **WHEN** the live region was emptied by a change of query and the shopper then places another order
- **THEN** its outcome is written into the live region and announced, the same as the first order from a freshly loaded page

### Requirement: REQ-ORD-9 — a rejection message is always plain English, never a raw reason code

When an order is rejected, the message shown to the shopper SHALL be phrased in plain English. This SHALL hold even when the rejection's reason is not one of the reasons the page has specific wording for, and even when the rejection carries no reason at all — the shopper SHALL NOT be shown the server's raw, underscore-joined reason identifier verbatim, nor a message that reads as missing or undefined. `REQ-ORD-7` decides when that message is shown. A rejection that arrives after the trimmed search field has changed is not shown, and this requirement does not override that.

#### Scenario: a reason the page already has wording for keeps that wording

- **WHEN** an order is rejected for one of the reasons the page has specific wording for (over the unit limit, insufficient stock, an unknown SKU, or an invalid quantity), and the rejection is shown (`REQ-ORD-7`)
- **THEN** the message shown is that reason's existing specific wording, unaffected by this requirement

#### Scenario: an unrecognized reason still reads in plain English

- **WHEN** an order is rejected with a reason the page has no specific wording for, and the rejection is shown (`REQ-ORD-7`)
- **THEN** the message shown is a plain-English sentence
- **AND** it does not include the raw reason identifier verbatim

#### Scenario: a rejection with no reason at all still reads in plain English

- **WHEN** an order is rejected and the response carries no reason, and the rejection is shown (`REQ-ORD-7`)
- **THEN** the message shown is a plain-English sentence
- **AND** it does not display the literal word "undefined" or "null"

#### Scenario: composes with the live region

- **WHEN** a rejection message is shown, whether it is the specific wording for a known reason or the plain-English fallback for one the page doesn't recognize
- **THEN** that message is written into the order-outcome live region (`REQ-ORD-7`) and announced the same way

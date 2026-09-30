## MODIFIED Requirements

### Requirement: REQ-ORD-7 — order outcome is announced to assistive technology

The page's order-outcome region SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that assistive technology announces its content automatically whenever it changes, without the user needing to move focus to it. A successful order's confirmation message SHALL echo the ordered item's name alongside its `sku`, `qty`, and `total` — the same `{name} ({sku})` grouping the order history already uses (`REQ-ORD-10`) — so a shopper who does not recognize a SKU can still tell what they ordered without leaving the confirmation. Both that name and that SKU SHALL be inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script — the same guarantee already required for the search query (`REQ-CAT-6`), for the item card's own display of that name and SKU (`REQ-CAT-10`), for the Order button's accessible name and `data-sku` attribute (`REQ-ORD-8`), and for the order-history entry (`REQ-ORD-10`). Once shown, an outcome message SHALL NOT outlive the search it was placed beside: when the shopper changes the search query, the region SHALL be emptied, so that a stale order result is never read as current beside results it has nothing to do with. This is the same notion of a search as `REQ-CAT-7` — a change to the query the shopper types — and not the listing refresh an order itself triggers, which SHALL leave the outcome in place. Emptying the region announces nothing.

#### Scenario: success is announced

- **WHEN** an order is placed successfully
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

- **WHEN** an order is rejected, for any reason
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

- **WHEN** an order has been accepted and its confirmation is shown in the live region, and the shopper then changes the search query — by typing, deleting, or clearing it
- **THEN** the live region's content is emptied as soon as the query changes, without waiting for the new search's results to arrive
- **AND** nothing is announced as a result of emptying it

#### Scenario: changing the search clears a rejection or a not-sent message

- **WHEN** an order's rejection message (`REQ-ORD-9`) or its not-sent message (`REQ-ORD-11`) is shown, and the shopper then changes the search query
- **THEN** the live region's content is emptied, exactly as for a confirmation

#### Scenario: the order's own refresh does not clear its outcome

- **WHEN** an order is placed, accepted or rejected, and the item list refreshes afterward under the same query that was already applied (`REQ-CAT-7`)
- **THEN** the outcome message stays in the live region, unaffected by that refresh

#### Scenario: the page's first search does not disturb an outcome

- **WHEN** the page has just loaded and performs its automatic search with an empty query, and no order has been placed
- **THEN** the live region is unchanged, still present in the page's markup and empty

#### Scenario: an outcome that arrives after the query changed is shown

- **WHEN** an order is placed, the shopper changes the search query while the order is still in flight, and the order's outcome then arrives
- **THEN** that outcome is written into the live region and announced, because it is the latest outcome and has not yet been shown beside any other search
- **AND** it is cleared by the next change to the query, like any other outcome

#### Scenario: a later order after a clear is announced normally

- **WHEN** the live region was emptied by a change of query and the shopper then places another order
- **THEN** its outcome is written into the live region and announced, the same as the first order from a freshly loaded page

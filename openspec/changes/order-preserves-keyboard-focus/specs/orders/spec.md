## ADDED Requirements

### Requirement: REQ-ORD-15 — keyboard focus stays on the ordered item after the list refreshes

After an order is placed, the page refreshes the item list (`REQ-ORD-1`, `REQ-CAT-8`). That refresh replaces every item card. The page remembers that focus was on that item's Order button when the shopper operated it. When that order's refreshed list is shown, focus SHALL be on that same item's Order button. This holds unless the shopper has moved focus to another control since the click. A keyboard user then does not start again from the top of the page. Focus may leave because the button was disabled while the order was in flight (`REQ-ORD-14`). Focus may also leave because the list was replaced. Neither of those is the shopper moving focus, and focus is still restored. The item is the one whose Order button was operated (`REQ-ORD-8`). This holds for a confirmed order, a rejection (`REQ-ORD-9`), and an order that was not sent (`REQ-ORD-11`).

When that button is disabled in the refreshed list because stock is 0 (`REQ-ORD-13`), focus SHALL be on that item's quantity input. A disabled button cannot hold focus.

If the shopper has moved focus to another control since the click, focus stays on that control. That control may be another item's quantity input, the search field, or the maximum-price field. If the refreshed list has no card for that item, focus is not moved onto another item's Order button. The same holds when the list could not be loaded (`REQ-CAT-11`). Focus is not moved onto the outcome region either. A stale refresh is discarded and not shown (`REQ-CAT-8`). This requirement then moves nothing. A withheld outcome discards that refresh, so it also moves nothing. A query that changes and changes back shows the outcome and the refresh. Focus then stays where the shopper moved it.

Focus never moves to the order-outcome region: the outcome continues to reach assistive technology through its live region (`REQ-ORD-7`), unaffected by this requirement. Which outcome is written, withheld, or cleared is still decided by `REQ-ORD-7`. This requirement changes only where focus is.

#### Scenario: focus returns to the Order button after a confirmed order

- **WHEN** focus is on an item's Order button, the shopper operates it, the order is accepted, and the refreshed item list is shown
- **THEN** focus is on that same item's Order button in the refreshed list

#### Scenario: focus returns after a rejected order

- **WHEN** focus is on an item's Order button, the shopper operates it, the order is rejected, and the refreshed item list is shown
- **THEN** focus is on that same item's Order button in the refreshed list

#### Scenario: focus returns after an order that was not sent

- **WHEN** focus is on an item's Order button, the shopper operates it, the order is not sent (`REQ-ORD-11`), and the refreshed item list is shown
- **THEN** focus is on that same item's Order button in the refreshed list

#### Scenario: it is the ordered item's button, not another's

- **WHEN** the page shows several item cards, focus is on the Order button of the second item, and that item is ordered
- **THEN** after the refresh focus is on the second item's Order button, not the first's or any other

#### Scenario: an item that drops to zero stock gives focus to its quantity input

- **WHEN** focus is on an item's Order button, the order is accepted and leaves that item at 0 stock, and the refreshed list is shown with that button disabled (`REQ-ORD-13`)
- **THEN** focus is on that item's quantity input in the refreshed list

#### Scenario: focus the shopper has moved elsewhere is left alone

- **WHEN** an order is placed, the shopper moves focus to a different item's quantity input, the search and the maximum price stay unchanged, and the refreshed list is shown
- **THEN** focus is still on that quantity input, not returned to the Order button

#### Scenario: a stale refresh moves nothing

- **WHEN** an order's refresh is discarded because a newer item-list request was issued (`REQ-CAT-8`), for example because the shopper typed a new query
- **THEN** this requirement moves focus nowhere on account of the discarded refresh

#### Scenario: a withheld outcome's discarded refresh moves nothing

- **WHEN** an order is in flight, the shopper changes the trimmed search field, the outcome is withheld (`REQ-ORD-7`), and that refresh is discarded (`REQ-CAT-8`)
- **THEN** this requirement moves focus nowhere on account of that discarded refresh

#### Scenario: a query that changes and changes back leaves focus where the shopper put it

- **WHEN** an order is placed, the shopper changes the trimmed query and changes it back, the outcome is shown, and that query's refresh is shown
- **THEN** focus stays on the search field, because that is the control the shopper moved to

#### Scenario: a SKU containing markup characters is still found

- **WHEN** focus is on the Order button of an item whose `sku` contains a quote or an ampersand, and that item is ordered
- **THEN** after the refresh focus is on that item's Order button

#### Scenario: no card for the item, or no list, requires nothing

- **WHEN** the refreshed list has no card for the ordered item, or the item list could not be loaded (`REQ-CAT-11`)
- **THEN** focus is not moved onto another item's Order button or onto the outcome region

#### Scenario: the outcome is still announced and focus does not follow it

- **WHEN** an order outcome is written into the live region (`REQ-ORD-7`) and focus is restored to the Order button
- **THEN** the outcome is announced automatically as before
- **AND** focus is not on the outcome region

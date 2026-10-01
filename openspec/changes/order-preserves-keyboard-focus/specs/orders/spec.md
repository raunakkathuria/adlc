## ADDED Requirements

### Requirement: REQ-ORD-15 — keyboard focus stays on the ordered item after the list refreshes

After an order is placed, the page refreshes the item list (`REQ-ORD-1`, `REQ-CAT-8`), which replaces every item card. When keyboard focus was on that item's Order button at the moment the refreshed list is shown, focus SHALL be on that same item's Order button once the list is shown, so a keyboard or screen-reader user does not have to navigate from the top of the page after every order. The item is the one the Order button was operated for, identified by its SKU exactly as stored, so an item whose SKU contains characters that would otherwise be read as markup is found the same as any other (`REQ-ORD-8`, `REQ-CAT-10`). This holds whatever the order's outcome — confirmed, rejected (`REQ-ORD-9`), or not sent (`REQ-ORD-11`) — because the refresh happens in every case.

When that item's Order button is disabled in the refreshed list because its stock is now 0 (`REQ-ORD-13`), focus SHALL instead be on that item's quantity input, because a disabled button cannot hold focus.

Focus SHALL NOT be moved by this requirement in any other case. If focus is on something else when the refreshed list is shown — the search field, the maximum-price field, another item's control, or any other part of the page — it stays there. If the refreshed list has no card for that item, or the list could not be loaded (`REQ-CAT-11`), nothing is required of where focus goes. A refreshed list that is discarded as stale (`REQ-CAT-8`) is not shown, so this requirement does not apply to it and it moves nothing.

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

- **WHEN** an order is placed from an Order button, the shopper moves focus to the search field or the maximum-price field while the order is in flight, and the refreshed list is shown
- **THEN** focus is still on that field, not returned to the Order button

#### Scenario: a stale refresh moves nothing

- **WHEN** an order's refresh is discarded because a newer item-list request was issued (`REQ-CAT-8`), for example because the shopper typed a new query
- **THEN** this requirement moves focus nowhere on account of the discarded refresh

#### Scenario: a withheld outcome does not stop focus being restored

- **WHEN** the order's outcome is withheld because the trimmed search field changed and then matches again before the reply (`REQ-ORD-7`), or is shown normally, and the refreshed list for the current query is shown with focus having been on that item's Order button
- **THEN** focus is on that item's Order button, independent of whether the outcome message was written

#### Scenario: a SKU containing markup characters is still found

- **WHEN** focus is on the Order button of an item whose `sku` contains characters that would otherwise be read as markup — for example a quote or an ampersand — and that item is ordered
- **THEN** after the refresh focus is on that item's Order button, and no element or attribute from the SKU is inserted into the page's structure (`REQ-CAT-10`)

#### Scenario: no card for the item, or no list, requires nothing

- **WHEN** the refreshed list has no card for the ordered item, or the item list could not be loaded (`REQ-CAT-11`)
- **THEN** this requirement imposes no focus target, and does not move focus to any unrelated control

#### Scenario: the outcome is still announced and focus does not follow it

- **WHEN** an order outcome is written into the live region (`REQ-ORD-7`) and focus is restored to the Order button
- **THEN** the outcome is announced automatically as before
- **AND** focus is not on the outcome region

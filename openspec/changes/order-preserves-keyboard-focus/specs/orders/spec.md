## ADDED Requirements

### Requirement: REQ-ORD-15 — keyboard focus stays on the ordered item after the list refreshes

After an order is placed, the page refreshes the item list (`REQ-ORD-1`, `REQ-CAT-8`). That refresh replaces every item card. The page remembers that focus was on that item's Order button when the shopper operated it. When that order's refreshed list is shown, focus SHALL be on that same item's Order button. This holds unless the shopper has moved focus to another control since the click. A keyboard user then does not start again from the top of the page. Focus may leave because the button was disabled while the order was in flight (`REQ-ORD-14`). Focus may also leave because the list was replaced. Neither of those is the shopper moving focus, and focus is still restored. The item is the one whose Order button was operated (`REQ-ORD-8`). This holds for a confirmed order, a rejection (`REQ-ORD-9`), and an order that was not sent (`REQ-ORD-11`).

A disabled control cannot hold focus. When the Order button that should receive focus is disabled and that item's quantity input is enabled, focus SHALL be on that quantity input. That is what happens when the button is disabled only because an order for that item is in flight (`REQ-ORD-14`). When the button is disabled because stock is 0 (`REQ-ORD-13`), the quantity input is disabled too. Neither control can hold focus. Focus SHALL then be on that item's card: the element that contains the item's name, stock text, quantity input, and Order button. Focus is not on the page body. The card can receive focus. It is not a stop in the Tab order, so tabbing through the catalogue does not land on the card. The same rule applies when the control to restore is a quantity input that is disabled because stock is 0. Focus is on that item's card.

If the shopper has moved focus to another control since the click, focus stays on that control. That control may be the search field, the maximum-price field, or any control inside an item card, such as another item's quantity input or another item's Order button. The refresh replaces the item cards, so a control inside a card that was focused is a new control by the time the list is shown. Focus SHALL then be on the same control of the same item in the refreshed list, not on the page body. If that replacement cannot hold focus, the rule above applies: an enabled quantity input, or the item's card when both controls are disabled. Moving focus here means the shopper's own move to a control, by keyboard or pointer. Any other control on the page counts, not only those named here, and focus stays on it. Putting focus back as this requirement describes is not a move. Focus resting on no control at all, because the shopper's click landed on blank page space or because the page dropped it, is not a move to a control either. When the refreshed list is shown with focus on no control, focus is restored as above to the item whose Order button the shopper most recently operated while focused on it. With one order in flight that is the ordered item. With orders for different items in flight together (`REQ-ORD-14` disables only the button of the item being ordered), a refresh that lands first does not take focus back to its own item if a later order has since been placed from another item's button. Focus goes to the item of the latest such order. If the refreshed list has no card for the focused control's item, focus is not moved onto another item's Order button. The same holds when it has no card for the ordered item. The same holds when the list could not be loaded (`REQ-CAT-11`). Focus is not moved onto the outcome region either. A stale refresh is discarded and not shown (`REQ-CAT-8`). This requirement then moves nothing. A withheld outcome discards that refresh, so it also moves nothing. A query that changes and changes back shows the outcome and the refresh. Focus then stays where the shopper moved it.

Focus is restored to the ordered item only when it was on that item's Order button at the click. An order placed by a pointer that does not focus the button leaves nothing to restore, and this requirement asks for nothing then. Such an order is also not an order "most recently operated" in the sense above: with focus on no control, focus goes to the item of the latest order operated with focus on its button, and a later pointer-only order does not displace it.

Focus resting on an item card itself, because the shopper clicked the card's text or because focus was restored there, counts as focus on that item's control. When the refreshed list is shown, focus stays on that item's card, since the card is replaced like the controls in it. A focused quantity input stays on the quantity input and a focused Order button stays on the Order button, as far as each can hold focus; focus is not exchanged between them except by the disabled-control rules above.

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

#### Scenario: an item that drops to zero stock gives focus to its card

- **WHEN** focus is on an item's Order button and the accepted order leaves that item at 0 stock
- **AND** the refreshed list shows that button and that quantity input disabled (`REQ-ORD-13`)
- **THEN** focus is on that item's card
- **AND** focus is not on the page body, the disabled button, or the disabled quantity input

#### Scenario: focus the shopper has moved elsewhere is left alone

- **WHEN** an order is placed and the shopper moves focus to a different item's quantity input
- **AND** that input stays enabled, and the refreshed list is shown
- **THEN** focus is on that same item's quantity input, not the ordered item's Order button

#### Scenario: focus moved to another item's Order button follows it through the refresh

- **WHEN** an order is placed from one item's Order button
- **AND** the shopper moves focus to a different item's Order button before the refreshed list is shown
- **THEN** focus is on that different item's Order button in the refreshed list, not on the page body and not on the ordered item's button

#### Scenario: another item's in-flight Order button gives focus to its quantity input

- **WHEN** the shopper has moved focus to a different item's Order button
- **AND** that button is disabled in the refreshed list only because an order for it is in flight (`REQ-ORD-14`)
- **AND** that item's quantity input is enabled
- **THEN** focus is on that item's quantity input

#### Scenario: another item's control that is disabled at zero stock gives focus to its card

- **WHEN** the shopper has moved focus to a different item's Order button
- **AND** that button and its quantity input are disabled in the refreshed list because stock is 0 (`REQ-ORD-13`)
- **THEN** focus is on that item's card

#### Scenario: a disabled quantity input gives focus to its card

- **WHEN** the shopper has moved focus to an item's quantity input
- **AND** that input is disabled in the refreshed list because stock is 0 (`REQ-ORD-13`)
- **THEN** focus is on that item's card

#### Scenario: the card is not a tab stop

- **WHEN** the shopper tabs through the catalogue and no focus restoration is pending
- **THEN** focus does not land on an item card
- **AND** focus does land on each enabled quantity input and each enabled Order button

#### Scenario: focus on another control that is not in the list is left alone

- **WHEN** an order is placed and the shopper moves focus to a control outside the item cards
- **AND** that control is not the search field or the price field, such as a link or a button
- **AND** the refreshed list is shown
- **THEN** focus stays on that control

#### Scenario: focus on no control is restored to the ordered item

- **WHEN** an order is placed from an item's Order button, focus then rests on no control (for example the shopper clicked blank page space), and the refreshed list is shown
- **THEN** focus is on that item's Order button, or its quantity input if only the button is disabled, or its card if both are disabled

#### Scenario: overlapping orders restore focus to the most recently operated item

- **WHEN** an order is placed from item A's Order button, and before its refreshed list is shown the shopper moves to item B's Order button and operates it
- **AND** focus then rests on no control because B's button was disabled while its order is in flight (`REQ-ORD-14`)
- **AND** A's refreshed list is shown first
- **THEN** focus is on item B's Order button, or its quantity input if only the button is disabled, or its card if both are disabled, not on item A
- **AND** when B's refreshed list is shown, focus is restored to item B in the same way
- **AND** if A's refreshed list is discarded as stale (`REQ-CAT-8`) because B's order issued a newer request, nothing is moved on its account and B's refreshed list restores focus to item B

#### Scenario: focus on an item card stays on that card

- **WHEN** an order is placed and the shopper moves focus onto a different item's card, and the refreshed list is shown
- **THEN** focus is on that item's card in the refreshed list

#### Scenario: a later pointer-only order does not take the fallback

- **WHEN** an order is placed from item A's Order button with focus on it, then item B's Order button is operated by a pointer without gaining focus, and focus rests on no control when a refreshed list is shown
- **THEN** focus is on item A, the latest order operated with focus on its button, not on item B

#### Scenario: a click that did not focus the button restores nothing

- **WHEN** an item's Order button is operated by a pointer without focus having been on it
- **THEN** this requirement does not move focus onto that button after the refresh

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

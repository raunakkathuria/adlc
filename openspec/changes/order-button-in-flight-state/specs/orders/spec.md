## ADDED Requirements

### Requirement: REQ-ORD-14 — an item's Order button is unavailable while its order is in flight

From the moment a shopper operates an item card's Order button (`REQ-ORD-8`) until the outcome of that order is known, that item's Order button SHALL be disabled with the native `disabled` attribute, so that a second click or a second Enter or Space press on it cannot place a second order. The outcome is known when the order is confirmed (`REQ-ORD-1`), rejected (`REQ-ORD-9`), not sent (`REQ-ORD-11`), or withheld because the search changed meanwhile (`REQ-ORD-7`). At that moment the button SHALL be enabled again, unless the stock text on the card then showing is 0, in which case `REQ-ORD-13` keeps it disabled. That moment is not the later arrival of the post-order list refresh: the refresh may still be in flight, and the stock it will report is not yet on the card. A shopper who then operates the button is placing a new order, which the server still checks (`REQ-ORD-2`). Only the ordered item's button is held: other items' Order buttons are unaffected and can be operated while it is pending.

A not-sent outcome whose reply cannot be read may mean the server already placed the order. The button is enabled again anyway, so the shopper is not left with a control that never returns. The order history is where they see whether it was placed.

The hold belongs to the item, not to the rendered button. When the item list is re-rendered while the order is in flight — by a search change, a price-ceiling change, a load failure and its retry, or any refresh — and that item is listed again, its new Order button SHALL be disabled too, including when the item left the list and came back before the outcome was known. It SHALL be enabled again once the outcome is known, by the same rule as above. The hold SHALL NOT change the button's accessible name (`REQ-ORD-8`), its visible text "Order", the quantity input, or the order-outcome message (`REQ-ORD-7`). It adds no pending sentence to the live region. Disabling the focused button removes it from the Tab order; this requirement does not move focus. This is a client-side guard only: the server SHALL still accept every valid order it receives (`REQ-ORD-1`), and two orders placed one after the other, after the first outcome is known, are two orders.

#### Scenario: the button is disabled while the order is pending

- **WHEN** a shopper operates an item's Order button and the server has not yet answered
- **THEN** that item's Order button is disabled

#### Scenario: a second click while pending places no second order

- **WHEN** a shopper operates an item's Order button twice in quick succession, before the first order's outcome is known
- **THEN** exactly one request to `POST /api/orders` (`REQ-ORD-1`) is sent, whether the second operation was a click or an Enter or Space press
- **AND** exactly one order for that item appears in `GET /api/orders`, and its stock has dropped by `qty` once

#### Scenario: the button is operable again after a confirmation

- **WHEN** a pending order is accepted
- **THEN** the confirmation is shown as `REQ-ORD-7` requires
- **AND** that item's Order button is enabled again at that moment, unless the stock text on the card then showing is 0 (`REQ-ORD-13`)

#### Scenario: the button is operable again after a rejection

- **WHEN** a pending order is rejected, for any reason
- **THEN** the rejection message is shown as `REQ-ORD-9` requires
- **AND** that item's Order button is enabled again at that moment, unless the stock text on the card then showing is 0 (`REQ-ORD-13`)

#### Scenario: the button is operable again after a not-sent order

- **WHEN** a pending order is not sent (`REQ-ORD-11`) — the request cannot be completed or the reply cannot be read
- **THEN** the not-sent message is shown
- **AND** that item's Order button is enabled again at that moment, so the shopper can try again
- **AND** if the reply could not be read, the order history is where the shopper sees whether the order was placed

#### Scenario: a withheld outcome still releases the button

- **WHEN** a pending order's outcome is withheld because the trimmed search query changed while it was in flight (`REQ-ORD-7`)
- **THEN** no outcome message is written
- **AND** that item's Order button is enabled again at the moment the outcome is withheld, by the same rule as a shown outcome, not when a later refresh arrives

#### Scenario: other items can be ordered meanwhile

- **WHEN** an order for one item is pending and the shopper operates a different item's Order button
- **THEN** that second order is sent, and the first item's Order button stays disabled until its own outcome is known

#### Scenario: the hold survives a re-render

- **WHEN** an item's order is pending and the item list re-renders, for example because the shopper changed the search query (`REQ-CAT-3`) and the item is still listed
- **THEN** that item's new Order button is disabled
- **AND** it is enabled again once that order's outcome is known

#### Scenario: the hold survives the item leaving the list and coming back

- **WHEN** an item's order is pending, a search change removes that item from the list, and a later search lists it again before the outcome is known
- **THEN** that item's new Order button is disabled

#### Scenario: the hold survives a load failure and its retry

- **WHEN** an item's order is pending, the catalogue load fails (`REQ-CAT-11`) so no Order button is shown, and the shopper retries before the outcome is known
- **THEN** that item's new Order button is disabled

#### Scenario: a disabled in-flight button does not claim to be out of stock

- **WHEN** an item with 1 or more in stock has its Order button disabled by a pending order
- **THEN** the button carries no out-of-stock description (`REQ-ORD-13` applies only at zero stock)

#### Scenario: the button's name, label and quantity input are unaffected

- **WHEN** an item's Order button is disabled by a pending order
- **THEN** its accessible name still includes the item's name exactly as `REQ-ORD-8` requires, its visible text still reads "Order", and the item's quantity input is unchanged

#### Scenario: the guard does not change what the server accepts

- **WHEN** two valid orders for the same item reach the server, from a client that does not honor the disabled state
- **THEN** both are accepted in turn, or the second is rejected only for a reason the existing rules give (`REQ-ORD-2`, `REQ-ORD-3`), unaffected by this requirement

## MODIFIED Requirements

### Requirement: REQ-ORD-13 — the Order button is disabled when stock is zero

Each item card's Order button (`REQ-ORD-8`) SHALL be disabled whenever that item's stock is 0, so a shopper can tell the item cannot currently be ordered before they click, instead of learning only after a rejected round trip (`REQ-ORD-2`). This is a client-side hint only: it SHALL NOT replace or weaken the stock check the server performs on every order (`REQ-ORD-2`), which continues to reject an order for more units than an item currently has in stock regardless of what any particular client sent.

A disabled button that gives no reason leaves assistive technology announcing only that the control is unavailable, with the explanation left in the card's stock text where the button does not point to it. When the button is disabled because that item's stock is 0, it SHALL therefore carry an accessible description whose content is exactly that item's own stock text, "{n} in stock" (for example "0 in stock") — the same wording the item card already displays as part of its meta line, shown there as plain, inert text: no part of it SHALL be interpreted as markup, inserted as a page element, or run as script — and not the card's whole meta line, which also carries that item's SKU and price and does not belong in the reason the button is disabled. The button keeps its native `disabled` attribute, so it is not reachable by the Tab key; the description is instead heard when a screen-reader user reaches the button in browse mode — reading the page with the arrow keys — without separately reading the rest of the card first. This description SHALL be exposed as an accessible description associated with the button (for example, via `aria-describedby` referencing that stock text), not folded into the button's accessible name, so the name continues to name only the item exactly as `REQ-ORD-8` requires.

#### Scenario: the button is disabled at zero stock

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** that item's Order button is disabled

#### Scenario: the button is unaffected above zero stock

- **WHEN** the catalogue page renders an item card for an item with 1 or more in stock
- **THEN** this requirement does not disable that item's Order button
- **AND** while no order for that item is in flight (`REQ-ORD-14`), the button is enabled

#### Scenario: the disabled state composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and a zero-stock item is among the remaining items
- **THEN** that item's Order button is still disabled after the re-render

#### Scenario: an item that drops to zero stock is disabled on the next render

- **WHEN** an accepted order (`REQ-ORD-1`) leaves an item at 0 stock and the item list refreshes afterward
- **THEN** that item's Order button is disabled in the refreshed render, even though it was enabled before the order

#### Scenario: the hint does not change what the server accepts

- **WHEN** an order for a zero-stock item reaches the server regardless — for example, from a client that does not honor the disabled state
- **THEN** the order is still rejected exactly as `REQ-ORD-2` requires, unaffected by this requirement

#### Scenario: the button's accessible name is unaffected

- **WHEN** an item card's Order button is disabled by this requirement
- **THEN** its accessible name still includes the item's name exactly as `REQ-ORD-8` requires

#### Scenario: the quantity input is unaffected

- **WHEN** an item card is rendered for a zero-stock item
- **THEN** that item's quantity input remains as enterable as before, carrying its existing `min`, `max` (`REQ-ORD-12`), and default value, unaffected by this requirement

#### Scenario: the disabled button's reason is reachable in browse mode

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** its Order button carries an accessible description whose content is exactly that item's stock text, "0 in stock"
- **AND** that description is reachable by assistive technology when a screen-reader user reaches the button in browse mode — reading the page with the arrow keys — without needing to read any other part of the card first, even though the button's native `disabled` attribute keeps it out of the Tab order

#### Scenario: the reason reuses the card's existing stock text, not new wording

- **WHEN** an item card's Order button carries this accessible description
- **THEN** the description's content is exactly the stock text the card already displays as part of its meta line — "{n} in stock" — shown there as plain, inert text, rather than a newly introduced label or icon
- **AND** the description does not include the rest of that meta line — the item's SKU or its price are not part of it

#### Scenario: each out-of-stock item's description is its own stock text

- **WHEN** the catalogue page renders item cards for two or more items that are each at 0 stock at the same time
- **THEN** each of those items' Order buttons carries an accessible description that is that item's own stock text
- **AND** no item's button carries another item's description

#### Scenario: an enabled button carries no disabled-reason description

- **WHEN** the catalogue page renders an item card for an item with 1 or more in stock
- **THEN** that item's Order button is not disabled, so this requirement's accessible-description addition does not apply to it

#### Scenario: the description composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and a zero-stock item is among the remaining items
- **THEN** that item's Order button still carries its accessible description, exactly that item's own stock text, after the re-render

#### Scenario: an item that drops to zero stock gains the description on the next render

- **WHEN** an accepted order (`REQ-ORD-1`) leaves an item at 0 stock and the item list refreshes afterward
- **THEN** that item's Order button carries the accessible description, exactly that item's own stock text, in the refreshed render, even though it had none before the order

#### Scenario: the description does not change the button's accessible name

- **WHEN** an item card's Order button is disabled and carries this accessible description
- **THEN** the button's accessible name is unaffected and still includes only the item's name, exactly as `REQ-ORD-8` requires — the description is additional information, not a replacement for or an addition to the name

#### Scenario: a button disabled only because an order is in flight carries no stock description

- **WHEN** an item with 1 or more in stock has its Order button disabled because an order for it is in flight (`REQ-ORD-14`)
- **THEN** the button does not carry this requirement's accessible description
- **AND** the description is still required when the button is disabled because the item's stock is 0

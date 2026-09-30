## ADDED Requirements

### Requirement: REQ-ORD-14 — an item's Order button is unavailable while its order is in flight

From the moment a shopper operates an item card's Order button (`REQ-ORD-8`) until the outcome of that order is known, that item's Order button SHALL be disabled, so that a second click or key press on it cannot place a second order. The outcome is known when the order is confirmed (`REQ-ORD-1`), rejected (`REQ-ORD-9`), or not sent (`REQ-ORD-11`); the button SHALL become operable again after any of the three, including when the outcome is withheld because the search changed meanwhile (`REQ-ORD-7`). Only the ordered item's button is held: other items' Order buttons are unaffected and can be operated while it is pending.

The hold belongs to the item, not to the rendered button. When the item list is re-rendered while the order is in flight — by a search change, a price-ceiling change, a retry, or any refresh — that item's new Order button SHALL be disabled too, and SHALL be operable again once the outcome is known. The hold SHALL NOT change the button's accessible name (`REQ-ORD-8`), its visible text "Order", the quantity input, or the order-outcome message (`REQ-ORD-7`). This is a client-side guard only: the server SHALL still accept every valid order it receives (`REQ-ORD-1`), and two orders placed one after the other are two orders.

#### Scenario: the button is disabled while the order is pending

- **WHEN** a shopper operates an item's Order button and the server has not yet answered
- **THEN** that item's Order button is disabled

#### Scenario: a second click while pending places no second order

- **WHEN** a shopper operates an item's Order button twice in quick succession, before the first order's outcome is known
- **THEN** exactly one request to `POST /api/orders` (`REQ-ORD-1`) is sent
- **AND** at most one order for that item appears in `GET /api/orders`, and its stock has dropped by `qty` once, not twice

#### Scenario: the button is operable again after a confirmation

- **WHEN** a pending order is accepted
- **THEN** the confirmation is shown as `REQ-ORD-7` requires
- **AND** that item's Order button is operable again, unless the item is now at zero stock (`REQ-ORD-13`)

#### Scenario: the button is operable again after a rejection

- **WHEN** a pending order is rejected, for any reason
- **THEN** the rejection message is shown as `REQ-ORD-9` requires
- **AND** that item's Order button is operable again, unless the item is at zero stock (`REQ-ORD-13`)

#### Scenario: the button is operable again after a not-sent order

- **WHEN** a pending order is not sent (`REQ-ORD-11`) — the request cannot be completed or the reply cannot be read
- **THEN** the not-sent message is shown
- **AND** that item's Order button is operable again, so the shopper can try again

#### Scenario: a withheld outcome still releases the button

- **WHEN** a pending order's outcome is withheld because the trimmed search query changed while it was in flight (`REQ-ORD-7`)
- **THEN** no outcome message is written
- **AND** that item's Order button is operable again once the item list has refreshed

#### Scenario: other items can be ordered meanwhile

- **WHEN** an order for one item is pending and the shopper operates a different item's Order button
- **THEN** that second order is sent, and the first item's Order button stays disabled until its own outcome is known

#### Scenario: the hold survives a re-render

- **WHEN** an item's order is pending and the item list re-renders, for example because the shopper changed the search query (`REQ-CAT-3`) and the item is still listed
- **THEN** that item's new Order button is disabled
- **AND** it is operable again once that order's outcome is known

#### Scenario: a disabled in-flight button does not claim to be out of stock

- **WHEN** an item with 1 or more in stock has its Order button disabled by a pending order
- **THEN** the button carries no out-of-stock description (`REQ-ORD-13` applies only at zero stock)

#### Scenario: the button's name, label and quantity input are unaffected

- **WHEN** an item's Order button is disabled by a pending order
- **THEN** its accessible name still includes the item's name exactly as `REQ-ORD-8` requires, its visible text still reads "Order", and the item's quantity input is unchanged

#### Scenario: the guard does not change what the server accepts

- **WHEN** two valid orders for the same item reach the server, from a client that does not honor the disabled state
- **THEN** both are accepted in turn, or the second is rejected only for a reason the existing rules give (`REQ-ORD-2`, `REQ-ORD-3`), unaffected by this requirement

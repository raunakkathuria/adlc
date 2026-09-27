## MODIFIED Requirements

### Requirement: REQ-ORD-13 — the Order button is disabled when stock is zero

Each item card's Order button (`REQ-ORD-8`) SHALL be disabled whenever that item's stock is 0, so a shopper can tell the item cannot currently be ordered before they click, instead of learning only after a rejected round trip (`REQ-ORD-2`). This is a client-side hint only: it SHALL NOT replace or weaken the stock check the server performs on every order (`REQ-ORD-2`), which continues to reject an order for more units than an item currently has in stock regardless of what any particular client sent.

A disabled button that gives no reason leaves assistive technology announcing only that the control is unavailable, with the explanation left in the card's stock text where the button does not point to it. When the button is disabled, it SHALL therefore carry an accessible description whose content is exactly that item's own stock text, "{n} in stock" (for example "0 in stock") — the same wording the item card already displays as part of its meta line (`REQ-CAT-10`), which is already inert text under that requirement, rather than introducing new wording — and not the card's whole meta line, which also carries that item's SKU and price and does not belong in the reason the button is disabled. So a screen-reader user tabbing to the button hears why it is unorderable without separately reading the rest of the card. This description SHALL be exposed as an accessible description associated with the button (for example, via `aria-describedby` referencing that stock text), not folded into the button's accessible name, so the name continues to name only the item exactly as `REQ-ORD-8` requires.

#### Scenario: the button is disabled at zero stock

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** that item's Order button is disabled

#### Scenario: the button is unaffected above zero stock

- **WHEN** the catalogue page renders an item card for an item with 1 or more in stock
- **THEN** that item's Order button is enabled, exactly as before this requirement

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

#### Scenario: the disabled button's reason is exposed to assistive technology

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** its Order button carries an accessible description whose content is exactly that item's stock text, "0 in stock"
- **AND** that description is reachable by assistive technology when focus lands on the button, without needing to read any other part of the card first

#### Scenario: the reason reuses the card's existing stock text, not new wording

- **WHEN** an item card's Order button carries this accessible description
- **THEN** the description's content is exactly the stock text the card already displays as part of its meta line (`REQ-CAT-10`) — "{n} in stock" — carrying that requirement's inert-text guarantee with it, rather than a newly introduced label or icon
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

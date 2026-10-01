## MODIFIED Requirements

### Requirement: REQ-ORD-13 — the Order button is disabled when stock is zero

Each item card's Order button (`REQ-ORD-8`) SHALL be disabled whenever that item's stock is 0, so a shopper can tell the item cannot currently be ordered before they click, instead of learning only after a rejected round trip (`REQ-ORD-2`). This is a client-side hint only: it SHALL NOT replace or weaken the stock check the server performs on every order (`REQ-ORD-2`), which continues to reject an order for more units than an item currently has in stock regardless of what any particular client sent.

A disabled button that gives no reason leaves assistive technology announcing only that the control is unavailable, with the explanation left in the card's stock text where the button does not point to it. When the button is disabled because that item's stock is 0, it SHALL therefore carry an accessible description whose content is exactly that item's own stock text, "{n} in stock" (for example "0 in stock") — the same wording the item card already displays as part of its meta line, shown there as plain, inert text: no part of it SHALL be interpreted as markup, inserted as a page element, or run as script — and not the card's whole meta line, which also carries that item's SKU and price and does not belong in the reason the button is disabled. The button keeps its native `disabled` attribute, so it is not reachable by the Tab key; the description is instead heard when a screen-reader user reaches the button in browse mode — reading the page with the arrow keys — without separately reading the rest of the card first. This description SHALL be exposed as an accessible description associated with the button (for example, via `aria-describedby` referencing that stock text), not folded into the button's accessible name, so the name continues to name only the item exactly as `REQ-ORD-8` requires.

The same stock-zero condition SHALL also disable that item's quantity input (`REQ-ORD-12`) with the native `disabled` attribute, so a shopper cannot type a quantity that can never be ordered beside a button that cannot place it. At zero stock the input SHALL carry an accessible description whose content is exactly the same stock text "{n} in stock" the button's description uses (inert text, as above), exposed as an accessible description (for example, via `aria-describedby`), not as part of the input's name. A disabled input keeps its existing `min`, `max` (`REQ-ORD-12`) and default value. Disabling the input is a client-side hint only and SHALL NOT change what the server accepts: `REQ-ORD-2` still rejects any order for a zero-stock item. An item with 1 or more in stock keeps its quantity input enabled — including while an order for that item is in flight (`REQ-ORD-14`), which holds only the button.

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

- **WHEN** an item card is rendered for an item with 1 or more in stock
- **THEN** that item's quantity input remains as enterable as before, carrying its existing `min`, `max` (`REQ-ORD-12`), and default value, unaffected by this requirement
- **AND** it stays enabled while an order for that item is in flight (`REQ-ORD-14`)

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

#### Scenario: the quantity input is disabled at zero stock

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** that item's quantity input is disabled with the native `disabled` attribute
- **AND** it still carries its existing `min="1"`, `max="0"` (`REQ-ORD-12`) and default value `1`

#### Scenario: the disabled input is described by the item's stock text

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** its quantity input carries an accessible description whose content is exactly that item's stock text, "0 in stock", shown as plain, inert text
- **AND** the input's accessible name is unaffected by that description
- **AND** the description is not the item's whole meta line (no SKU, no price)

#### Scenario: each zero-stock input is described by its own item's stock text

- **WHEN** the catalogue page renders item cards for two or more items each at 0 stock
- **THEN** each quantity input's description is that item's own stock text, and no input carries another item's

#### Scenario: an enabled input carries no stock description

- **WHEN** the catalogue page renders an item card for an item with 1 or more in stock
- **THEN** its quantity input is not disabled and carries no out-of-stock description

#### Scenario: the disabled input composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and a zero-stock item is among the remaining items
- **THEN** that item's quantity input is still disabled and described by its stock text after the re-render

#### Scenario: an item that drops to zero stock has its input disabled on the next render

- **WHEN** an accepted order (`REQ-ORD-1`) leaves an item at 0 stock and the item list refreshes afterward
- **THEN** that item's quantity input is disabled and carries the stock description in the refreshed render, even though it was enabled before the order

#### Scenario: the disabled input does not change what the server accepts

- **WHEN** an order for a zero-stock item reaches the server regardless — for example, from a client that does not honor the disabled state
- **THEN** the order is still rejected exactly as `REQ-ORD-2` requires, unaffected by this requirement

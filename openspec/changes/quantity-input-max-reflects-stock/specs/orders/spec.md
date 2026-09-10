## MODIFIED Requirements

### Requirement: REQ-ORD-12 — the quantity input hints the binding limit

Each item card's quantity input (rendered by the catalogue page alongside the item's name and SKU, `REQ-CAT-10`) SHALL carry a `max` attribute equal to the **lesser** of the 20-unit order limit (`REQ-ORD-3`) and the item's current stock (`REQ-ORD-2`), so a browser's own number-input affordances hint whichever of the two actually binds for that item, before the shopper submits. This is a hint only: it SHALL NOT change what is accepted or rejected. An order for more than 20 units, or for more than the item's stock, is still refused exactly as `REQ-ORD-3` and `REQ-ORD-2` already require, whether or not the shopper's browser respects the hint when they type a value directly rather than using the input's own increment controls.

#### Scenario: a well-stocked item is hinted by the order cap

- **WHEN** the catalogue page renders an item card for an item with 20 or more in stock
- **THEN** the quantity input has `max="20"`, alongside its existing `min="1"`

#### Scenario: a scarcer item is hinted by its own stock

- **WHEN** the catalogue page renders an item card for an item with fewer than 20 in stock (for example, 8)
- **THEN** the quantity input's `max` equals that stock (`max="8"`), not `20`

#### Scenario: an item exactly at the cap is hinted by the cap

- **WHEN** the catalogue page renders an item card for an item with exactly 20 in stock
- **THEN** the quantity input has `max="20"`

#### Scenario: an out-of-stock item's hint is its own stock

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** the quantity input has `max="0"`, unaffected by its own `min="1"` (`REQ-ORD-2` already rejects any order for such an item, regardless of what the hint reads)

#### Scenario: the hint composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and the page re-renders the remaining items
- **THEN** each remaining item's quantity input still carries a `max` reflecting the lesser of `20` and that item's current stock

#### Scenario: the hint composes with an order that changes stock

- **WHEN** an order is accepted (`REQ-ORD-1`), lowering an item's stock, and the item list refreshes afterward
- **THEN** that item's quantity input, on its next render, carries a `max` reflecting its new, lower stock

#### Scenario: the hint does not change what the server accepts

- **WHEN** a shopper submits an order for more than the hinted `max` despite the hint — for example, by typing a larger value directly instead of using the input's increment controls
- **THEN** the order is still rejected exactly as `REQ-ORD-3` (over the unit limit) or `REQ-ORD-2` (insufficient stock) requires, whichever applies, unaffected by this requirement

#### Scenario: the existing minimum and default are unaffected

- **WHEN** the item card renders
- **THEN** the quantity input's `min="1"` and its default value of `1` are unchanged by this requirement, even for an out-of-stock item whose `max` is `0`

## ADDED Requirements

### Requirement: REQ-ORD-12 — the quantity input hints the unit limit

Each item card's quantity input (rendered by the catalogue page alongside the item's name and SKU, `REQ-CAT-10`) SHALL carry a `max` attribute equal to the 20-unit order limit (`REQ-ORD-3`), so a browser's own number-input affordances can hint that limit to the shopper before they submit. This is a hint only: it SHALL NOT change what is accepted or rejected. An order for more than 20 units is still refused exactly as `REQ-ORD-3` already requires, whether or not the shopper's browser respects the hint when they type a value directly rather than using the input's own increment controls.

#### Scenario: the quantity input carries the limit as its max

- **WHEN** the catalogue page renders an item card
- **THEN** the quantity input has `max="20"`, alongside its existing `min="1"`

#### Scenario: the hint composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and the page re-renders the remaining items
- **THEN** each remaining item's quantity input still carries `max="20"`

#### Scenario: the hint does not change what the server accepts

- **WHEN** a shopper submits an order for more than 20 units despite the hint — for example, by typing a larger value directly instead of using the input's increment controls
- **THEN** the order is still rejected exactly as `REQ-ORD-3` requires, unaffected by this requirement

#### Scenario: the existing minimum and default are unaffected

- **WHEN** the item card renders
- **THEN** the quantity input's `min="1"` and its default value of `1` are unchanged by this requirement

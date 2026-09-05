## MODIFIED Requirements

### Requirement: REQ-ORD-3 — at most 20 units per order

An order for more than 20 units of an item SHALL be rejected as over the limit, regardless of the item's stock. This holds even when the item's stock is also short of the ordered quantity: the response SHALL report the unit-limit rejection, not the stock rejection (`REQ-ORD-2`). The stock check applies only when the unit limit is not exceeded.

#### Scenario: over the limit

- **WHEN** 21 units are ordered
- **THEN** the response is `422` with `{"reason":"over_limit"}`

#### Scenario: over the limit even when stock is also short

- **WHEN** an item has fewer than 21 in stock (for example 8) and 21 units of it are ordered
- **THEN** the response is `422` with `{"reason":"over_limit"}`, not `insufficient_stock`

#### Scenario: exactly at the limit

- **WHEN** exactly 20 units are ordered and stock allows it
- **THEN** the order is accepted

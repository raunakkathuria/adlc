## MODIFIED Requirements

### Requirement: REQ-ORD-1 — place an order

`POST /api/orders` with `{"sku":"MUG-1","qty":2}` SHALL create an order.

#### Scenario: accepted order

- **WHEN** the order is accepted
- **THEN** the response is `201` with `{ id, sku, name, qty, total }`, where `name` is the ordered item's name
- **AND** the item's stock has dropped by `qty`

#### Scenario: accepted order is listed

- **WHEN** the order is accepted
- **THEN** it appears in `GET /api/orders`, carrying the same `id`, `sku`, `name`, `qty`, and `total` as the response that created it

### Requirement: REQ-ORD-10 — an order-history entry displays its SKU as inert text

Each entry the order history renders SHALL display the name of the item that was ordered (`REQ-ORD-1`) alongside that order's `sku`, `qty`, and `total`, formatted as `#{id} — {qty} × {name} ({sku}) — {total}`. Both the `name` and the `sku` SHALL be displayed as inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script. `REQ-CAT-10` covers the item card's display of `name` and `sku`, and `REQ-ORD-8` the Order button's; this requirement carries that same inert-text guarantee to the order history — the third surface that now renders a server-supplied item name, and the third that renders a server-supplied SKU.

#### Scenario: an ordinary order still displays correctly

- **WHEN** the order history renders an order for SKU `MUG-1`, quantity `2`, total `2500`, for an item named "Enamel Mug"
- **THEN** the entry reads `#{id} — 2 × Enamel Mug (MUG-1) — £25.00`, where `{id}` is that order's own order number

#### Scenario: markup in a SKU is shown as text, not parsed

- **WHEN** an order's `sku` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the entry carries those characters as literal, inert content
- **AND** no new element or attribute from that `sku` is inserted into the page's structure

#### Scenario: markup in the item's name is shown as text, not parsed

- **WHEN** an order's item `name` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the entry carries those characters as literal, inert content
- **AND** no new element or attribute from that `name` is inserted into the page's structure

#### Scenario: a script-injection attempt in the item's name does not run

- **WHEN** an order's item `name` contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, a script tag, or a quote character followed by an event-handler attribute
- **THEN** no script associated with that `name` runs
- **AND** the entry still displays the `name` as inert text

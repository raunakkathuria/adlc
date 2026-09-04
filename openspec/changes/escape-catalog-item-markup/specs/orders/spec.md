## MODIFIED Requirements

### Requirement: REQ-ORD-8 — the Order button names the item it orders

Each item card's Order button SHALL have an accessible name that includes the item's name, so that assistive technology distinguishes it from every other item's Order button instead of announcing plain "Order" with no context. The item's name embedded in that accessible name, and the item's SKU carried in the button's `data-sku` attribute (which identifies which item an order is for), SHALL both be inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script — the same guarantee already required for the search query (`REQ-CAT-6`) and for the rest of the item card's own display of that name and SKU (`REQ-CAT-10`).

#### Scenario: accessible name includes the item's name

- **WHEN** the catalogue page renders an item card for an item named "Enamel Mug"
- **THEN** that item's Order button has an accessible name that includes "Enamel Mug" (for example, via an `aria-label`)

#### Scenario: each item's button is distinguishable from the others

- **WHEN** the catalogue page renders multiple item cards
- **THEN** each item's Order button has a distinct accessible name corresponding to that item, and no two different items share the same Order button accessible name

#### Scenario: the visible label is unaffected

- **WHEN** an item card's Order button is rendered
- **THEN** the button's visible text still reads "Order", unaffected by this requirement

#### Scenario: composes with search

- **WHEN** the catalogue list is narrowed by a search query (REQ-CAT-3) and the page re-renders the remaining items
- **THEN** each remaining item's Order button still carries an accessible name that includes that item's name

#### Scenario: markup in the item name is shown as text within the accessible name, not parsed

- **WHEN** an item's `name` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the Order button's accessible name includes those characters as literal text
- **AND** no new element or attribute from that name is inserted into the page's structure

#### Scenario: a script-injection attempt in the item name does not run

- **WHEN** an item's `name` contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, a script tag, or a quote character followed by an event-handler attribute
- **THEN** no script associated with that name runs
- **AND** the Order button's accessible name still includes the name as inert text

#### Scenario: markup in the item SKU is shown as text in the data attribute, not parsed

- **WHEN** an item's `sku` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the Order button's `data-sku` attribute carries those characters as literal, inert content
- **AND** no new element or attribute from that SKU is inserted into the page's structure

#### Scenario: a script-injection attempt in the item SKU does not run

- **WHEN** an item's `sku` contains a construct that would execute script if interpreted as markup — for example a quote character followed by an event-handler attribute
- **THEN** no script associated with that SKU runs
- **AND** the Order button's `data-sku` attribute still carries the SKU as inert text

#### Scenario: an order for an item with markup in its SKU reaches the API unchanged

- **WHEN** an item whose `sku` contains characters that would otherwise be read as markup is ordered via its Order button
- **THEN** the order request sent to `POST /api/orders` (`REQ-ORD-1`) carries that item's SKU exactly as stored in the catalog, not an escaped or otherwise altered form
- **AND** the order is accepted or rejected using that same unaltered SKU, per the ordinary order rules

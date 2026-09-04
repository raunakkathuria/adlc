## MODIFIED Requirements

### Requirement: REQ-ORD-8 — the Order button names the item it orders

Each item card's Order button SHALL have an accessible name that includes the item's name, so that assistive technology distinguishes it from every other item's Order button instead of announcing plain "Order" with no context. The item's name embedded in that accessible name SHALL be inert text: no part of it SHALL be interpreted as markup, inserted as a page element, or run as script — the same guarantee already required for the search query (`REQ-CAT-6`) and for the rest of the item card's own display of that name (`REQ-CAT-10`).

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

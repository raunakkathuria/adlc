## ADDED Requirements

### Requirement: REQ-CAT-10 — an item card displays the item's name and SKU as inert text

Each item card the catalogue page renders SHALL display that item's `name` and `sku` as inert text everywhere the card renders them: the visible name, the visible SKU in the meta line, the quantity input's accessible name (`aria-label`), and the quantity input's `id` attribute. No part of an item's `name` or `sku` SHALL be interpreted as markup, inserted as a page element, or run as script. The item card's Order button carries its own accessible name and its `data-sku` attribute, both built from this same `name`/`sku` data; this change extends `REQ-ORD-8` to carry the identical guarantee for both of those, rather than duplicating it here.

#### Scenario: an ordinary item still displays correctly

- **WHEN** the catalogue page renders an item card for an item named "Enamel Mug" with SKU `MUG-1`
- **THEN** the card shows "Enamel Mug" and `MUG-1` exactly as before, and the quantity input's accessible name and `id` attribute are built from "Enamel Mug" and `MUG-1` exactly as before, unaffected by this requirement

#### Scenario: markup in an item's name or SKU is shown as text, not parsed

- **WHEN** an item's `name` or `sku` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the card's visible name, visible SKU, the quantity input's accessible name, and the quantity input's `id` attribute each carry those characters as literal, inert content
- **AND** no new element or attribute from that `name` or `sku` is inserted into the page's structure

#### Scenario: a script-injection attempt does not run

- **WHEN** an item's `name` or `sku` contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, a script tag, or a quote character followed by an event-handler attribute
- **THEN** no script associated with that `name` or `sku` runs, in any of the card's renderings of it
- **AND** the `name` or `sku` is displayed as inert text wherever the card shows it

#### Scenario: composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and the page re-renders the remaining items
- **THEN** each remaining item's card still displays its `name` and `sku` as inert text, unaffected by this requirement

#### Scenario: an item whose SKU contains markup can still be ordered

- **WHEN** an item's `sku` contains characters that would otherwise be read as markup — for example a quote or an ampersand
- **THEN** the shopper can still enter a quantity in that item's quantity input and have it read correctly when an order is placed
- **AND** placing that order still succeeds through the normal ordering flow (`REQ-ORD-1`), unaffected by how the SKU is rendered as inert text

## ADDED Requirements

### Requirement: REQ-ORD-9 — keyboard focus survives placing an order

When an order is submitted and the catalogue re-renders to reflect its outcome, keyboard focus SHALL remain on a specific, operable control associated with the item just ordered (for example, that item's Order button) rather than being silently reset to the top of the page. This holds for the common case, where the ordered item is still present in the re-rendered list — which it always is today, since the catalogue never filters items by stock.

#### Scenario: focus survives an accepted order

- **WHEN** an order is accepted and the catalogue list re-renders with the item's updated stock
- **THEN** keyboard focus is on an operable control belonging to that same item
- **AND** focus is not on the document body

#### Scenario: focus survives a rejected order

- **WHEN** an order is rejected, for any reason, and the catalogue list re-renders
- **THEN** keyboard focus is on an operable control belonging to that same item, the same as for an accepted order
- **AND** focus is not on the document body

#### Scenario: ordering two items in a row does not require returning to the top of the page

- **WHEN** a keyboard user orders one item and then orders a second item afterward
- **THEN** they can move from the first item's control to the second item's control without first returning to the top of the page

#### Scenario: composes with the list's own structure and announcements

- **WHEN** an order causes the catalogue's live-region announcement (`REQ-CAT-7`) and its list semantics (`REQ-CAT-8`) to apply to the same re-render
- **THEN** the control that receives focus still exists within that re-rendered list, and receiving focus does not prevent the change from being announced

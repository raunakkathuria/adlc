## ADDED Requirements

### Requirement: REQ-CAT-7 — the catalogue list announces its changes to assistive technology

The catalogue page's items region SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that assistive technology announces its content automatically whenever it changes, without the user needing to move focus to it.

#### Scenario: the region announces from the first page load

- **WHEN** the catalogue page has just loaded, before any search has narrowed it
- **THEN** the live region is already present in the page's markup

#### Scenario: a search that matches nothing is announced

- **WHEN** a search (`REQ-CAT-3`) matches no items and the empty-state message (`REQ-CAT-6`) is displayed
- **THEN** that message is written into the live region
- **AND** assistive technology announces it automatically

#### Scenario: a return to matching results is announced

- **WHEN** a search that previously matched nothing is edited so that it matches items again
- **THEN** the resulting list is written into the same live region
- **AND** assistive technology announces the change automatically

#### Scenario: a change triggered by an order is announced

- **WHEN** an order changes a displayed item's stock count and the catalogue list re-renders to reflect it
- **THEN** the updated list is written into the live region
- **AND** assistive technology announces the change automatically, independently of the order-outcome announcement (`REQ-ORD-7`) that fires at the same time

### Requirement: REQ-CAT-8 — catalogue items are exposed as a list

When the catalogue page displays one or more items, it SHALL expose them as a semantic list (native list markup, or an equivalent ARIA `role="list"` with `role="listitem"` children), so that assistive technology reports how many items there are and lets a user navigate between them as list items.

#### Scenario: multiple items are exposed as a list

- **WHEN** the catalogue page renders more than one item
- **THEN** assistive technology reports the number of items and can move between them as items in a list

#### Scenario: the structure survives a narrowing search

- **WHEN** a search (`REQ-CAT-3`) narrows the catalogue to fewer items
- **THEN** the remaining items are still exposed as a list, sized to the narrowed count

#### Scenario: the empty state is unaffected

- **WHEN** a search matches no items
- **THEN** the empty-state message (`REQ-CAT-6`) is displayed as before, and this requirement does not apply — there is no list of zero items to expose

### Requirement: REQ-CAT-9 — item names display as inert text wherever the catalogue renders them

Wherever the catalogue page renders an item's name — its visible name text, the quantity control's accessible name, and the Order button's accessible name — the name SHALL be displayed as the literal characters of the item's `name` field. No part of an item's name SHALL be interpreted as markup, inserted as a page element, or run as script, at any of those three sites.

This applies only to how an item's name is displayed. Search (`REQ-CAT-3`) still matches against the item's actual name, and the Order button's accessible name still includes it (`REQ-ORD-8`) — the name's characters are still logically present, only rendered inertly.

#### Scenario: an ordinary name still displays correctly

- **WHEN** an item's name is `Enamel Mug`
- **THEN** the name displays as `Enamel Mug` at all three sites, unaffected by this requirement

#### Scenario: markup in the name is shown as text, not parsed

- **WHEN** an item's name contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** all three sites display those characters as visible text
- **AND** no new element from the name is inserted into the page's structure at any of the three sites

#### Scenario: a script-injection attempt in the name does not run

- **WHEN** an item's name contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, or a script tag
- **THEN** no script associated with the name runs, at any of the three sites
- **AND** the name is displayed as inert text at all three sites

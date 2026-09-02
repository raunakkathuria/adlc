## ADDED Requirements

### Requirement: REQ-CAT-7 — the catalogue list announces its changes to assistive technology, proportionately

The catalogue page's items region SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that assistive technology announces automatically whenever its content changes, without the user needing to move focus to it.

The announcement SHALL be proportionate to what changed: it SHALL convey that the list changed and how many items now match, without reciting every displayed item's individual details (name, SKU, price, stock). When a search query is still being typed, the live region SHALL NOT announce once per keystroke; it SHALL announce once the query has settled, reflecting the outcome the user is left looking at rather than every intermediate one.

This restriction is on what is automatically announced, not on what is present. The full list of items, with each item's own details, SHALL still be reachable by a user who navigates into the list directly (`REQ-CAT-8`) at the same time the concise announcement fires. Placing the concise summary and the full list inside the same announced boundary — so that assistive technology reads the full list's details the moment the summary is announced — does not satisfy this requirement; the two SHALL be exposed so that only the concise summary is delivered as the automatic announcement.

#### Scenario: the region announces from the first page load

- **WHEN** the catalogue page has just loaded, before any search has narrowed it
- **THEN** the live region is already present in the page's markup

#### Scenario: a search that matches nothing is announced

- **WHEN** a search (`REQ-CAT-3`) matches no items and the empty-state message (`REQ-CAT-6`) is displayed
- **THEN** that message is written into the live region
- **AND** assistive technology announces it automatically

#### Scenario: a return to matching results is announced

- **WHEN** a search that previously matched nothing is edited so that it matches items again
- **THEN** a concise announcement of the new match count is written into the same live region
- **AND** assistive technology announces the change automatically

#### Scenario: a change triggered by an order is announced

- **WHEN** an order changes a displayed item's stock count and the catalogue list re-renders to reflect it
- **THEN** a concise announcement of the change is written into the live region
- **AND** assistive technology announces it automatically, independently of the order-outcome announcement (`REQ-ORD-7`) that fires at the same time

#### Scenario: the announcement states that the list changed and how many items match, not each item's details

- **WHEN** the catalogue list changes for any reason — a search, an order, or otherwise
- **THEN** the live region's announcement conveys that the list changed and how many items now match
- **AND** it does not recite the name, SKU, price, or stock of every item in the list

#### Scenario: the full list's details remain reachable without being included in the automatic announcement

- **WHEN** the catalogue list changes and the page updates both its concise summary and the full list of items (`REQ-CAT-8`) in response
- **THEN** the content automatically announced to assistive technology is limited to the concise summary
- **AND** a user who navigates directly into the list can still reach every item's name, SKU, price, and stock — those details are not removed, only excluded from the automatic announcement

#### Scenario: typing a multi-character search produces one announcement, not one per keystroke

- **WHEN** a user types several characters into the search field in quick succession, changing the results after each keystroke
- **THEN** the live region announces the outcome once, after the query has settled
- **AND** it does not announce once per keystroke while the user is still typing

### Requirement: REQ-CAT-8 — catalogue items are exposed as a list, as the page is actually presented

When the catalogue page displays one or more items, it SHALL expose them as a semantic list (native list markup, or an equivalent ARIA `role="list"` with `role="listitem"` children), so that assistive technology reports how many items there are and lets a user navigate between them as list items.

This SHALL hold for the page as it is actually rendered and styled, not only for the underlying markup considered in isolation. A presentation choice — visual styling, layout, or any other page-level treatment — SHALL NOT cause assistive technology to lose the list's item count or the ability to navigate between items, on the combinations of browser and assistive technology the page needs to support.

#### Scenario: multiple items are exposed as a list

- **WHEN** the catalogue page renders more than one item
- **THEN** assistive technology reports the number of items and can move between them as items in a list

#### Scenario: the structure survives a narrowing search

- **WHEN** a search (`REQ-CAT-3`) narrows the catalogue to fewer items
- **THEN** the remaining items are still exposed as a list, sized to the narrowed count

#### Scenario: the empty state is unaffected

- **WHEN** a search matches no items
- **THEN** the empty-state message (`REQ-CAT-6`) is displayed as before, and this requirement does not apply — there is no list of zero items to expose

#### Scenario: list semantics survive the page's own styling

- **WHEN** the catalogue page applies its own visual styling to the rendered list — for example, removing the default list bullet
- **THEN** assistive technology still reports the item count and still allows navigating between items as list items, despite that styling

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

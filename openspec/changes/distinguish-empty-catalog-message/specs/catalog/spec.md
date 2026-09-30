## MODIFIED Requirements

### Requirement: REQ-CAT-6 — the empty-state search message displays the query as inert text

When a search (`REQ-CAT-3`) is performed with a **non-empty** query and matches no items, the catalogue page's "no results" message SHALL display the literal characters of the search query as visible text. No part of the query SHALL be interpreted as markup, inserted as a page element, or run as script. This message is shown only when a query narrowed the list to nothing; when the query is empty because the catalogue itself holds no items, the page shows a distinct message that does not embed a query instead (`REQ-CAT-12`).

#### Scenario: an ordinary query still displays correctly

- **WHEN** the search query is `mug` and it matches no items
- **THEN** the empty-state message reads `Nothing matches “mug”.`, unaffected by this requirement

#### Scenario: markup in the query is shown as text, not parsed

- **WHEN** the search query contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote — and it matches no items
- **THEN** the empty-state message displays those characters as visible text
- **AND** no new element from the query is inserted into the page's structure

#### Scenario: a script-injection attempt does not run

- **WHEN** the search query contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, or a script tag — and it matches no items
- **THEN** no script associated with the query runs
- **AND** the query is displayed as inert text in the empty-state message

#### Scenario: an empty query never produces this message

- **WHEN** the query is empty
- **THEN** this message is never shown, even if the catalogue holds zero items — the catalogue-empty message (`REQ-CAT-12`) is shown instead

### Requirement: REQ-CAT-9 — the catalogue is marked up as a list

The catalogue page SHALL present its matching items as a list in the accessibility tree, so assistive technology can report how many items there are and offer list navigation, as it already does for the order history. Where the list's visual styling removes list markers, the list role SHALL be restored explicitly, because at least one browser and screen-reader pairing drops list semantics from a marker-less list.

#### Scenario: the items are a list, not a run of unrelated blocks

- **WHEN** a search returns one or more items
- **THEN** the items are contained in a list element, one list item per catalogue item

#### Scenario: styling away the markers does not cost the semantics

- **WHEN** the list is styled without visible markers
- **THEN** the list still carries an explicit `list` role

#### Scenario: the empty state is not an empty list

- **WHEN** a search matches nothing, or the catalogue itself holds no items
- **THEN** the applicable empty-state message — the no-results search message (`REQ-CAT-6`) or the catalogue-empty message (`REQ-CAT-12`) — is shown in place of the list, not as a list item

## ADDED Requirements

### Requirement: REQ-CAT-12 — a catalogue with no items says so, distinctly from a search with no matches

When the item list loads successfully with no search query (`REQ-CAT-3`) — a query of only whitespace counts as no query, as the page already trims the field before searching — and no other narrowing parameter applied — for example `max_price` (`REQ-CAT-4`) — and the response holds zero items, meaning the catalogue itself holds no items rather than any filter narrowing it to nothing, the catalogue page SHALL display the exact message `The catalogue is empty.` in place of the no-results search message (`REQ-CAT-6`). This message SHALL NOT embed or reference the query or any filter value, because there is none to report. A zero-item result produced while any filter is applied — a search query, or a narrowing parameter such as `max_price` — is not a genuinely empty catalogue and is out of this requirement's scope (see the proposal's Out of scope: the catalogue page has no control for `max_price` today, so that case cannot occur through the page yet). The search-results live region (`REQ-CAT-7`) already announces `Showing 0 items.` for this same case; this requirement governs the message shown among the item cards and does not change that announcement's wording.

#### Scenario: a genuinely empty catalogue says so

- **WHEN** the query is empty, no other filter is applied, and the catalogue holds zero items
- **THEN** the catalogue page displays the exact message `The catalogue is empty.`, in place of the item cards
- **AND** that message does not read `Nothing matches "".` or embed the query in any form

#### Scenario: a whitespace-only query counts as no query

- **WHEN** the search field holds only whitespace, no other filter is applied, and the catalogue holds zero items
- **THEN** the catalogue page displays the exact message `The catalogue is empty.`, the same as for an empty query

#### Scenario: a search with no matches is unaffected

- **WHEN** a non-empty query matches no items (`REQ-CAT-3`)
- **THEN** the page shows the no-results search message (`REQ-CAT-6`) exactly as before, unaffected by this requirement

#### Scenario: the live-region announcement is unaffected

- **WHEN** the catalogue holds zero items and the query is empty
- **THEN** the search-results live region (`REQ-CAT-7`) continues to announce `Showing 0 items.`, unchanged by this requirement

#### Scenario: a stale empty-catalogue response is discarded like any other

- **WHEN** a response reporting zero items for an empty query arrives after a newer request for the item list has already resolved (`REQ-CAT-8`)
- **THEN** that late response is discarded and does not overwrite what is already shown, exactly as any other superseded response

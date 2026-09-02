## ADDED Requirements

### Requirement: REQ-CAT-6 — the empty-state search message displays the query as inert text

When a search (`REQ-CAT-3`) matches no items, the catalogue page's "no results" message SHALL display the literal characters of the search query as visible text. No part of the query SHALL be interpreted as markup, inserted as a page element, or run as script.

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

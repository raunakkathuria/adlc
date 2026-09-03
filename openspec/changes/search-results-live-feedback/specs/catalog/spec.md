## ADDED Requirements

### Requirement: REQ-CAT-7 — search results are announced to assistive technology

The catalogue page's results area SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that whenever a search (`REQ-CAT-3`) changes what the page shows, assistive technology announces the outcome automatically — how many items matched, or that none did — without the user needing to move focus into the results to find out.

#### Scenario: a match count is announced

- **WHEN** a search narrows the catalogue to one or more items
- **THEN** the live region's content is updated to state how many items matched
- **AND** assistive technology announces it automatically

#### Scenario: no match is announced

- **WHEN** a search matches nothing
- **THEN** the live region's content is the empty-state message (`REQ-CAT-6`)
- **AND** assistive technology announces it automatically

#### Scenario: clearing the query is announced like any other search

- **WHEN** the query is cleared back to empty and the full catalogue returns
- **THEN** the live region's content is updated to state the total number of items shown
- **AND** assistive technology announces it automatically

#### Scenario: silent until the first search

- **WHEN** the catalogue page has just loaded and the query is still empty, before anything has been typed
- **THEN** the live region is already present in the page's markup
- **AND** it holds no announcement yet, since no search has been performed

#### Scenario: a later outcome replaces an earlier one

- **WHEN** a second search's outcome is announced after the first, whether the two outcomes read the same or differently
- **THEN** the live region's content is replaced with the new outcome
- **AND** the new outcome is announced on its own, not appended to or stacked with the previous one

#### Scenario: composes with narrowing by price

- **WHEN** a search query and a `max_price` ceiling (`REQ-CAT-4`) are both active
- **THEN** the announced count reflects only the items that satisfy both

### Requirement: REQ-CAT-8 — a stale search response never overwrites a newer one

When the search query changes again before an in-flight request for an earlier query has returned, the catalogue page SHALL discard that earlier response when it eventually arrives: only the results for the most recently issued query are ever shown or announced (`REQ-CAT-7`), regardless of the order in which responses arrive over the network.

#### Scenario: an out-of-order response is discarded

- **WHEN** a request for an earlier query (for example "mu") resolves after a request for a later query (for example "mug") has already resolved and rendered
- **THEN** the page continues to show the results for "mug"
- **AND** the late-arriving "mu" response is not rendered or announced

#### Scenario: the last query typed always wins, even when it is not the last response to arrive

- **WHEN** several queries are issued in quick succession and their responses arrive in an order different from the order the queries were issued
- **THEN** the page shows the results, and the announcement (`REQ-CAT-7`), for whichever query was issued last
- **AND** every other in-flight response is discarded when it arrives, no matter its arrival order

#### Scenario: a single settled search is unaffected

- **WHEN** only one search request is in flight at a time, because typing paused long enough for the previous request to complete before the next one was issued
- **THEN** its response is rendered and announced as normal, unaffected by this requirement

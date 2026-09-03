## ADDED Requirements

### Requirement: REQ-CAT-7 — search results are announced to assistive technology

The catalogue page SHALL expose a short, visually-hidden summary of the current search outcome as its own ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement) — a distinct element from where the matching items themselves are displayed, following the same pattern already used for order outcomes (`REQ-ORD-7`). The area where matching items are displayed SHALL NOT itself be marked as a live region: doing so would make assistive technology re-announce every remaining item's full detail on every keystroke, in place of the single short summary this requirement calls for. Whenever a search (`REQ-CAT-3`) changes what the page shows — including the automatic search the page performs on load — the summary is updated so assistive technology announces the outcome automatically, without the user needing to move focus into the results to find out. This is new page content: no summary or count exists anywhere on the page today.

#### Scenario: a match count is announced

- **WHEN** a search narrows the catalogue to one or more items
- **THEN** the summary's content reads exactly `1 item matches "{q}".` if exactly one item matches, or `{n} items match "{q}".` if `{n}` items match and `{n}` is more than one, where `{q}` is the literal query text
- **AND** assistive technology announces it automatically

#### Scenario: no match is announced

- **WHEN** a search matches nothing
- **THEN** the summary's content is the empty-state message (`REQ-CAT-6`)
- **AND** assistive technology announces it automatically

#### Scenario: the automatic search on page load is announced, not silent

- **WHEN** the catalogue page has just loaded and performs its automatic search with an empty query (`REQ-CAT-3`), before the user has typed anything
- **THEN** the summary's content reads exactly `Showing 1 item.` if the catalogue holds exactly one item, or `Showing {n} items.` if it holds `{n}` items and `{n}` is more than one
- **AND** assistive technology announces it automatically — this first search is announced exactly like every one after it

#### Scenario: clearing the query is announced like any other search

- **WHEN** the query is cleared back to empty and the full catalogue returns (`REQ-CAT-3`)
- **THEN** the summary's content is updated with the same wording as the automatic search on page load
- **AND** assistive technology announces it automatically

#### Scenario: a later outcome replaces an earlier one

- **WHEN** a second search's outcome is announced after the first, whether the two outcomes read the same or differently
- **THEN** the summary's content is replaced with the new outcome
- **AND** the new outcome is announced on its own, not appended to or stacked with the previous one

#### Scenario: every settled outcome is announced as it renders, with no calming delay

- **WHEN** several searches are issued in quick succession while typing, with no pause between keystrokes
- **THEN** each one's outcome, once it settles without being superseded by a newer query (`REQ-CAT-8`), is announced as soon as it renders
- **AND** none is withheld waiting for typing to pause first — there is no separate calming delay before an outcome is announced

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

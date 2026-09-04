## ADDED Requirements

### Requirement: REQ-CAT-7 — search results are announced to assistive technology

The catalogue page SHALL expose a short, visually-hidden summary of the current search outcome as its own ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement) — a distinct element from where the matching items themselves are displayed, following the same pattern already used for order outcomes (`REQ-ORD-7`). The area where matching items are displayed SHALL NOT itself be marked as a live region: doing so would make assistive technology re-announce every remaining item's full detail on every keystroke, in place of the single short summary this requirement calls for. For the purposes of this requirement, a search is the query the user types (`REQ-CAT-3`) or the automatic search the page performs on load — not a listing refresh triggered by placing an order (`REQ-ORD-1`), which changes displayed stock but never changes which items match the current query. Whenever a search changes what the page shows, the summary is updated so assistive technology announces the outcome automatically, without the user needing to move focus into the results to find out. This is new page content: no summary or count exists anywhere on the page today. The literal query text `{q}` written into the summary on a match SHALL receive the same inert-text guarantee already required for the empty-state message (`REQ-CAT-6`): displayed as visible text only, never interpreted as markup, inserted as a page element, or run as script.

#### Scenario: a match count is announced

- **WHEN** a search narrows the catalogue to one or more items
- **THEN** the summary's content reads exactly `1 item matches “{q}”.` if exactly one item matches, or `{n} items match “{q}”.` if `{n}` items match and `{n}` is more than one, where `{q}` is the literal query text
- **AND** assistive technology announces it automatically

#### Scenario: the query in a match-count announcement is shown as text, not parsed

- **WHEN** a search query contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote — and it matches one or more items
- **THEN** the summary's content displays those characters as visible text within the match-count wording
- **AND** no new element from the query is inserted into the page's structure

#### Scenario: a script-injection attempt in a match-count announcement does not run

- **WHEN** a search query contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, or a script tag — and it matches one or more items
- **THEN** no script associated with the query runs
- **AND** the query is displayed as inert text within the match-count wording

#### Scenario: no match is announced

- **WHEN** a search matches nothing
- **THEN** the summary's content is the empty-state message (`REQ-CAT-6`)
- **AND** assistive technology announces it automatically

#### Scenario: the automatic search on page load is announced, not silent

- **WHEN** the catalogue page has just loaded and performs its automatic search with an empty query (`REQ-CAT-3`), before the user has typed anything
- **THEN** the summary's content reads exactly `Showing 1 item.` if the catalogue holds exactly one item, `Showing {n} items.` if it holds `{n}` items and `{n}` is more than one, or `Showing 0 items.` if the catalogue holds none
- **AND** assistive technology announces it automatically — this first search is announced exactly like every one after it

#### Scenario: clearing the query is announced like any other search

- **WHEN** the query is cleared back to empty and the full catalogue returns (`REQ-CAT-3`)
- **THEN** the summary's content is updated with the same wording as the automatic search on page load, including the `Showing 0 items.` case if the catalogue holds none
- **AND** assistive technology announces it automatically

#### Scenario: placing an order does not re-announce the search summary

- **WHEN** an order is placed (`REQ-ORD-1`), whether accepted or rejected, and the item list refreshes afterward under the same query that was already applied
- **THEN** the summary's content is unchanged from what it was before the order
- **AND** no new announcement is made for the summary — only the order-outcome region (`REQ-ORD-7`) announces

#### Scenario: a later outcome replaces an earlier one

- **WHEN** a second search's outcome is announced after the first, whether the two outcomes read the same or differently
- **THEN** the summary's content is replaced with the new outcome
- **AND** the new outcome is announced on its own, not appended to or stacked with the previous one

#### Scenario: every settled outcome is announced as it renders, with no calming delay

- **WHEN** several searches are issued in quick succession while typing, with no pause between keystrokes
- **THEN** each one's outcome, once it settles without being superseded by a newer query (`REQ-CAT-8`), is announced as soon as it renders
- **AND** none is withheld waiting for typing to pause first — there is no separate calming delay before an outcome is announced

### Requirement: REQ-CAT-8 — a stale search response never overwrites a newer one

When the search query changes again before an in-flight request for an earlier query has returned, the catalogue page SHALL discard that earlier response when it eventually arrives: only the results for the most recently issued query are ever shown or announced (`REQ-CAT-7`), regardless of the order in which responses arrive over the network. This requirement governs **every** request the page issues to load the item list, not only requests triggered by typing — including the listing refresh triggered by placing an order (`REQ-ORD-1`). An order-triggered refresh is a request for the item list like any other: if a newer query is issued (by typing) before it resolves, its response is discarded on arrival exactly as a stale typed-query response would be, and rendering the list never reverts to an earlier query's results.

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

#### Scenario: an order-triggered refresh does not revert a newer search

- **WHEN** an order is placed while the query is "mug", the resulting item-list refresh (`REQ-ORD-1`) requests "mug", and before that refresh resolves the user types "cup" so a new request for "cup" is issued
- **THEN** once the "cup" response arrives, the page shows and announces (`REQ-CAT-7`) the "cup" results
- **AND** the late-arriving "mug" refresh response is discarded when it arrives, rather than reverting the list back to "mug" results

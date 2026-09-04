# Catalog Specification

## Purpose

The catalog owns items and their stock. Over the API it is read-only; only an order changes stock (see the `orders` capability).

An item is `{ sku, name, price, stock }`. `price` is an integer in **minor units** (cents) — never a float.

This file is the source of truth for catalog behaviour. If the code and this file disagree, the code is wrong.
## Requirements
### Requirement: REQ-CAT-1 — list every item

`GET /api/items` SHALL return a JSON array of every item in the catalog, each with `sku`, `name`, `price`, and `stock`.

#### Scenario: full catalog

- **WHEN** the catalog holds three items
- **THEN** the response is `200` with three objects

### Requirement: REQ-CAT-2 — fetch one item by SKU

`GET /api/items/{sku}` SHALL return the single item with that SKU.

#### Scenario: known SKU

- **WHEN** the SKU exists
- **THEN** the response is `200` with that item

#### Scenario: unknown SKU

- **WHEN** the SKU is not in the catalog
- **THEN** the response is `404` with `{"reason":"unknown_sku"}`

### Requirement: REQ-CAT-3 — search matches SKU or name, case-insensitively

`GET /api/items?q={query}` SHALL return only the items whose **SKU or name** contains the query. The comparison SHALL be **case-insensitive** on both fields.

Search is how someone finds a product. A shopper who types what they see on the packaging — lowercase, or the SKU off the box — has to land on the item.

#### Scenario: name match in a different case

- **WHEN** the query is `mug`
- **THEN** the item named `Enamel Mug` is returned

#### Scenario: SKU match in a different case

- **WHEN** the query is `book-1`
- **THEN** the item with SKU `BOOK-1` is returned

#### Scenario: no match

- **WHEN** the query matches nothing
- **THEN** the response is `200` with an empty array

#### Scenario: absent or empty query

- **WHEN** the query is absent or empty
- **THEN** every item is returned, as in REQ-CAT-1

### Requirement: REQ-CAT-4 — narrow the catalog by maximum price

`GET /api/items?max_price={cents}` SHALL return only the items whose `price` is less than or equal to `max_price`. `max_price` SHALL appear **at most once** and, when present, match `^\d+$` — a non-negative whole number of cents, in the same minor-units representation the API already returns for `price`. A `max_price` present together with a search query (`q`, REQ-CAT-3) SHALL narrow the list to items that satisfy **both** at once.

Any request where `max_price` is supplied more than once, or where the (single) supplied value does not match `^\d+$` — including an empty value, a decimal, a signed number, a value with leading or trailing whitespace, or any other non-digit content — SHALL be refused with a `400` and `{"reason":"invalid_max_price"}`; the list is never silently returned unfiltered, and no one occurrence is silently preferred over another, when the filter itself is malformed.

#### Scenario: only items at or under the ceiling are returned

- **WHEN** `max_price` is `1000` and the catalog holds items priced at `800`, `1250`, and `350`
- **THEN** the response is `200` with the items priced `800` and `350`, and not the item priced `1250`

#### Scenario: an item priced exactly at the ceiling is included

- **WHEN** `max_price` equals an item's `price` exactly
- **THEN** that item is included in the response

#### Scenario: the ceiling excludes everything

- **WHEN** `max_price` is lower than every item's `price`
- **THEN** the response is `200` with an empty array

#### Scenario: absent max_price behaves as today

- **WHEN** `max_price` is absent
- **THEN** every item is returned, as in REQ-CAT-1, unaffected by this requirement

#### Scenario: composes with search

- **WHEN** `max_price` and `q` are both supplied
- **THEN** the response contains only items that match `q` (REQ-CAT-3) **and** are priced at or under `max_price`

#### Scenario: non-numeric max_price is refused

- **WHEN** `max_price` is not an integer (for example `abc` or `10.50`)
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}`

#### Scenario: negative max_price is refused

- **WHEN** `max_price` is negative
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}`

#### Scenario: an empty max_price is refused

- **WHEN** `max_price` is present but empty (`GET /api/items?max_price=`)
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}`, the same treatment as a non-numeric value — a present-but-empty parameter is a client bug, not an intent to omit the filter

#### Scenario: a borderline numeric form is refused

- **WHEN** `max_price` does not match `^\d+$` in form even though it looks numeric — for example a signed value like `+10`, scientific notation like `1e3`, or a value with leading or trailing whitespace like ` 10`
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}`

#### Scenario: a repeated max_price is refused

- **WHEN** `max_price` is supplied more than once (`GET /api/items?max_price=100&max_price=200`), even though both values are individually well-formed
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}` — the ambiguity of which value to honor is itself the defect, and neither value is silently picked

### Requirement: REQ-CAT-5 — the search field has an accessible name independent of its placeholder

The catalogue page's search input SHALL have an accessible name that assistive technology can read, and that name SHALL NOT depend solely on the `placeholder` attribute.

#### Scenario: accessible name is available before any input

- **WHEN** the catalogue page loads and focus lands on the search field, before anything has been typed
- **THEN** assistive technology reports an accessible name for the field (for example, via an associated `<label>` or an `aria-label`)

#### Scenario: accessible name survives typing

- **WHEN** someone types into the search field, replacing its placeholder text
- **THEN** the field's accessible name is unchanged — it does not disappear or become blank

#### Scenario: the placeholder hint still displays

- **WHEN** the search field is empty
- **THEN** its placeholder text is still shown as a visual hint, unaffected by this requirement

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

### Requirement: REQ-CAT-9 — the catalogue is marked up as a list

The catalogue page SHALL present its matching items as a list in the accessibility tree, so assistive technology can report how many items there are and offer list navigation, as it already does for the order history. Where the list's visual styling removes list markers, the list role SHALL be restored explicitly, because at least one browser and screen-reader pairing drops list semantics from a marker-less list.

#### Scenario: the items are a list, not a run of unrelated blocks

- **WHEN** a search returns one or more items
- **THEN** the items are contained in a list element, one list item per catalogue item

#### Scenario: styling away the markers does not cost the semantics

- **WHEN** the list is styled without visible markers
- **THEN** the list still carries an explicit `list` role

#### Scenario: the empty state is not an empty list

- **WHEN** a search matches nothing
- **THEN** the empty-state message (`REQ-CAT-6`) is shown in place of the list, not as a list item

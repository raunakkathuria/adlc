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

When a search (`REQ-CAT-3`) is performed with a **non-empty** query and matches no items, the catalogue page's "no results" message SHALL display the literal characters of the search query as visible text. No part of the query SHALL be interpreted as markup, inserted as a page element, or run as script. This message is shown only when a query narrowed the list to nothing; when the query is empty because the catalogue itself holds no items, the page shows a distinct message that does not embed a query instead (`REQ-CAT-12`). While a maximum price is applied, `REQ-CAT-13` decides the empty-state message instead of this requirement and instead of `REQ-CAT-12`. The scenarios below describe the page when no maximum price is applied.

#### Scenario: an ordinary query still displays correctly

- **WHEN** the search query is `mug`, no maximum price is applied, and it matches no items
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

- **WHEN** the query is empty and no maximum price is applied
- **THEN** this message is never shown, even if the catalogue holds zero items — the catalogue-empty message (`REQ-CAT-12`) is shown instead

### Requirement: REQ-CAT-7 — search results are announced to assistive technology

The catalogue page SHALL expose a short, visually-hidden summary of the current search outcome as its own ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement) — a distinct element from where the matching items themselves are displayed, following the same pattern already used for order outcomes (`REQ-ORD-7`). The area where matching items are displayed SHALL NOT itself be marked as a live region: doing so would make assistive technology re-announce every remaining item's full detail on every keystroke, in place of the single short summary this requirement calls for. For the purposes of this requirement, a search is the query the user types (`REQ-CAT-3`), the automatic search the page performs on load, or a change to the maximum price that issues a request for the item list (`REQ-CAT-13`). It is not a listing refresh triggered by placing an order (`REQ-ORD-1`), which changes displayed stock but does not change which items match, and it is not setting the maximum-price field to a refused or incomplete value, which issues no request. Whenever a search changes what the page shows, the summary is updated so assistive technology announces the outcome automatically, without the user needing to move focus into the results to find out. A refusal is announced through this same live region as the refusal sentence (`REQ-CAT-13`), not as the summary. This is new page content: no summary or count exists anywhere on the page today. The literal query text `{q}` written into the summary on a match SHALL receive the same inert-text guarantee already required for the empty-state message (`REQ-CAT-6`): displayed as visible text only, never interpreted as markup, inserted as a page element, or run as script. While a maximum price is applied, `REQ-CAT-13` states the summary instead of the sentences in the scenarios below. Those scenarios describe the page when no maximum price is applied. A refusal of the maximum-price field (`REQ-CAT-13`) is also announced through this same live region.

#### Scenario: a match count is announced

- **WHEN** a search narrows the catalogue to one or more items and no maximum price is applied
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

- **WHEN** a search matches nothing and no maximum price is applied
- **THEN** the summary's content is the empty-state message (`REQ-CAT-6`)
- **AND** assistive technology announces it automatically

#### Scenario: the automatic search on page load is announced, not silent

- **WHEN** the catalogue page has just loaded and performs its automatic search with an empty query (`REQ-CAT-3`), before the user has typed anything
- **THEN** the summary's content reads exactly `Showing 1 item.` if the catalogue holds exactly one item, `Showing {n} items.` if it holds `{n}` items and `{n}` is more than one, or `Showing 0 items.` if the catalogue holds none
- **AND** assistive technology announces it automatically — this first search is announced exactly like every one after it

#### Scenario: clearing the query is announced like any other search

- **WHEN** the query is cleared back to empty, no maximum price is applied, and the full catalogue returns (`REQ-CAT-3`)
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

When the search query changes again before an in-flight request for an earlier query has returned, the catalogue page SHALL discard that earlier response when it eventually arrives: only the results for the most recently issued query are ever shown or announced (`REQ-CAT-7`), regardless of the order in which responses arrive over the network. This requirement governs **every** request the page issues to load the item list, not only requests triggered by typing — including the listing refresh triggered by placing an order (`REQ-ORD-1`) and a request that carries a maximum price (`REQ-CAT-13`). An order-triggered refresh is a request for the item list like any other: if a newer request is issued (by typing a query, or by setting a price) before it resolves, its response is discarded on arrival exactly as a stale typed-query response would be, and rendering the list never reverts to an earlier request's results. "The most recently issued query" in this requirement means the item-list request most recently issued, including one that differs only in its maximum price. Setting the maximum-price field to a refused or incomplete value issues no request, so an in-flight response is still that latest request and is shown when it arrives. Showing it does not clear a refusal on the field (`REQ-CAT-13`).

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

- **WHEN** a search matches nothing, the catalogue itself holds no items, or a maximum price leaves nothing (`REQ-CAT-13`)
- **THEN** the applicable empty-state message — the no-results search message (`REQ-CAT-6`), the catalogue-empty message (`REQ-CAT-12`), or the ceiling message (`REQ-CAT-13`) — is shown in place of the list, not as a list item

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

### Requirement: REQ-CAT-11 — a catalogue that cannot be loaded says so

When the catalogue page cannot load the item list — because the request never reaches the server, or because the reply cannot be read as the page expects — the page SHALL tell the shopper that the catalogue could not be loaded, and SHALL announce it through the search-results live region (`REQ-CAT-7`). It SHALL NOT leave the catalogue area empty and silent, and SHALL NOT present the failure as a search that matched nothing (`REQ-CAT-6`), because those are different facts and lead a shopper to different actions. The failure message SHALL carry a control that retries loading, because the failure replaces the item cards — and with them every Order button — so without one the only ways back are to type in the search box or reload the page.

#### Scenario: a request that never reaches the server

- **WHEN** a request for the item list cannot be completed at all
- **THEN** the catalogue area shows a message saying the catalogue could not be loaded
- **AND** that message is written into the search-results live region, so it is announced rather than only shown

#### Scenario: a reply that cannot be read

- **WHEN** the server answers but the reply cannot be read as the page expects
- **THEN** the page treats it as a failure to load, not as an empty catalogue
- **AND** the shopper is not shown the empty-state wording of `REQ-CAT-6`

#### Scenario: a superseded failure is still discarded

- **WHEN** a request for the item list fails after a newer request for the item list has already been issued
- **THEN** the failure changes nothing on the page, exactly as a superseded success changes nothing (`REQ-CAT-8`)

#### Scenario: the failure offers a way to retry

- **WHEN** the catalogue could not be loaded and the failure message is shown
- **THEN** that message includes a control that retries loading
- **AND** operating it reloads the catalogue, so a shopper who lost the server and got it back does not have to reload the page

#### Scenario: a failed refresh after an order does not announce

- **WHEN** the item list refreshes after an order (`REQ-ORD-1`) and that refresh fails
- **THEN** the failure is shown where the items are displayed, with its retry control
- **AND** the search summary is left exactly as it was, because `REQ-CAT-7` promises no announcement for a post-order refresh

Note a known limitation, recorded rather than papered over. When the order itself was *accepted* and only the refresh failed, the order-outcome region announces the success and nothing announces the catalogue failure, so the summary goes on describing the last search that did load while no items are displayed. The alternative — announcing into the summary — contradicts `REQ-CAT-7`, which is shipped and explicit. Reconciling the two needs a delta that revisits `REQ-CAT-7`'s promise, not a decision taken here.

#### Scenario: a successful load is unaffected

- **WHEN** the item list loads normally
- **THEN** the catalogue and the search-results announcement behave exactly as before, unaffected by this requirement

### Requirement: REQ-CAT-12 — a catalogue with no items says so, distinctly from a search with no matches

When the item list loads successfully with no search query (`REQ-CAT-3`) — a query of only whitespace counts as no query, as the page already trims the field before searching — and no other narrowing parameter applied — for example `max_price` (`REQ-CAT-4`) — and the response holds zero items, meaning the catalogue itself holds no items rather than any filter narrowing it to nothing, the catalogue page SHALL display the exact message `The catalogue is empty.` in place of the no-results search message (`REQ-CAT-6`). This message SHALL NOT embed or reference the query or any filter value, because there is none to report. A zero-item result produced while any filter is applied — a search query, or a maximum price (`REQ-CAT-13`) — is not a genuinely empty catalogue. `REQ-CAT-13` decides that message, which is never `The catalogue is empty.` The search-results live region (`REQ-CAT-7`) announces `Showing 0 items.` for this same no-filter case; this requirement governs the message shown among the item cards and does not change that announcement. While a maximum price is applied, `REQ-CAT-13` states the announcement instead.

#### Scenario: a genuinely empty catalogue says so

- **WHEN** the query is empty, no other filter is applied, and the catalogue holds zero items
- **THEN** the catalogue page displays the exact message `The catalogue is empty.`, in place of the item cards
- **AND** that message does not read `Nothing matches "".` or embed the query in any form

#### Scenario: a whitespace-only query counts as no query

- **WHEN** the search field holds only whitespace, no other filter is applied, and the catalogue holds zero items
- **THEN** the catalogue page displays the exact message `The catalogue is empty.`, the same as for an empty query

#### Scenario: a search with no matches is unaffected

- **WHEN** a non-empty query matches no items (`REQ-CAT-3`) and no maximum price is applied
- **THEN** the page shows the no-results search message (`REQ-CAT-6`) exactly as before, unaffected by this requirement

#### Scenario: the live-region announcement is unaffected

- **WHEN** the catalogue holds zero items, the query is empty, and no maximum price is applied
- **THEN** the search-results live region (`REQ-CAT-7`) continues to announce `Showing 0 items.`, unchanged by this requirement

#### Scenario: a stale empty-catalogue response is discarded like any other

- **WHEN** a response reporting zero items for an empty query arrives after a newer request for the item list has already resolved (`REQ-CAT-8`)
- **THEN** that late response is discarded and does not overwrite what is already shown, exactly as any other superseded response

### Requirement: REQ-CAT-13 — the catalogue page lets a shopper set a maximum price

The catalogue page SHALL carry a **maximum price** field whose accessible name is exactly `Maximum price`. That name does not depend on its placeholder (as `REQ-CAT-5` requires of the search field). The shopper enters a price in pounds. Before reading the field, the page removes the same leading and trailing whitespace it removes from the search box, including a non-breaking space. An empty field, or one that is empty after that, means no ceiling. Only the ASCII digits `0`–`9` count as digits. Any other digit character is refused.

After that trim, the field is in exactly one of three states:

- **A price.** One or more ASCII digits, optionally followed by a `.` and one or two ASCII digits (`10`, `10.5`, `10.50`, `0`, `0.29`), or a `.` followed by one or two ASCII digits (`.5`, `.50`). Leading zeros are decimal (`010` is ten pounds) and they count toward the length limit below. The page requests `max_price` as this many cents, and narrows the list as `GET /api/items?max_price={cents}` does (`REQ-CAT-4`):
  - no decimal point: the digits are whole pounds, and the cents are that number times 100 (`10` is `1000`);
  - one digit after the point: that digit is tenths of a pound, so it contributes that digit times 10 pence (`10.5` is `1050`, `.5` is `50`);
  - two digits after the point: those digits are pence (`10.50` is `1050`, `0.29` is `29`).
  At most 13 digits may stand before the decimal point, counting leading zeros, so the cent value is at most `999999999999999` and the page can show it as pounds and two pence digits without rounding. Fourteen or more digits before the point is refused. `0` is a ceiling of zero cents.
- **Incomplete.** A lone `.`, or one or more digits followed by a `.` with nothing after it (`10.`). The shopper is still typing. The page SHALL NOT announce an error, SHALL NOT mark the field invalid, and SHALL NOT send a request. The list and the summary stay as they were. While the field is incomplete, a search-box change, the refresh after an order (`REQ-ORD-1`), and the load-failure retry (`REQ-CAT-11`) still request the list, and those requests carry the **last applied ceiling** — the ceiling, or none, that the page's most recent request for the item list carried. An incomplete field therefore changes nothing about the ceiling until it becomes a price, empty, or refused. Becoming incomplete clears any refusal message next to the field and clears `aria-invalid` before any further request is issued. The live region keeps the sentence it already holds, including a refusal sentence, until the next announcement.
- **Refused.** Anything else, including a leading `-` or `+`, scientific notation, a third decimal place, a currency symbol, a thousands separator, a digit that is not ASCII `0`–`9`, or 14 or more digits before the decimal point. The page SHALL show the exact message `Enter a maximum price such as 10 or 10.50.` in an element next to the field, announce that same sentence through the search-results live region (`REQ-CAT-7`), set `aria-invalid="true"` on the field, and point `aria-describedby` at the element that shows the message. No request is sent for that edit. The items on display and the summary stay as they were until a response that was already in flight, or a later request, arrives. An in-flight response is still the most recently issued request, because the refusal issued none, so it is shown when it arrives — including the automatic load and an order refresh — and showing it SHALL NOT clear the refusal message or the field's `aria-invalid` / `aria-describedby` state. Showing the automatic load replaces the refusal sentence in the live region with that load's summary. Showing an order refresh does not, because an order refresh is not announced (`REQ-CAT-7`). The field is never silently treated as no ceiling.

The message next to the field is not the live region. A later announcement may replace the live region's text; it SHALL NOT remove the message or the `aria-invalid` / `aria-describedby` state while the field stays refused. That state clears only when the field becomes empty, incomplete, or a price. While the field is refused, a search-box change, the refresh after an order (`REQ-ORD-1`), and the load-failure retry (`REQ-CAT-11`) still request the list, and those requests carry the last applied ceiling, the same rule as an incomplete field. If no list request has carried a ceiling yet, they omit `max_price`. An order refresh does not re-announce the summary (`REQ-CAT-7`), so after a refusal the live region keeps the refusal sentence, and the refreshed list holds only items at or under the last applied ceiling. Entering a refused value from empty, from a price, or from an incomplete value announces the refusal sentence. A search change while the field is refused is a search (`REQ-CAT-7`), so its outcome is announced with the last applied ceiling's wording, and the message next to the field stays. A load-failure message (`REQ-CAT-11`) may replace the live region's text while the field is refused; the message next to the field stays.

The ceiling and the search query (`REQ-CAT-3`) apply together: the list holds only items that satisfy both. Any request the page issues while the field holds a price — a change to either field, the automatic load, or the refresh after an order — carries that ceiling, and is a request like any other for `REQ-CAT-8` and `REQ-CAT-11`.

While a price is applied, the page states the ceiling, formatted as the page formats prices (`£10.00`), wherever it reports the outcome. `REQ-CAT-6`, `REQ-CAT-7`, and `REQ-CAT-12` describe the wording when no ceiling is applied. With one applied, the wording is as below. Only the page's own formatted amount appears in these messages — the text typed in the price field is never inserted as markup — and the search query, where shown, keeps the inert-text guarantee of `REQ-CAT-6`.

#### Scenario: the field has an accessible name

- **WHEN** the catalogue page is shown
- **THEN** the maximum price field's accessible name is exactly `Maximum price`

#### Scenario: the field narrows the list

- **WHEN** the shopper enters `10` and the catalogue holds items priced `800`, `1250` and `350` cents
- **THEN** the page requests `max_price=1000` and shows the items priced `800` and `350`, not `1250`

#### Scenario: pounds and pence convert from the digits

- **WHEN** the shopper enters `10.50`, `19.99`, `1.15`, `0.29`, or `0`
- **THEN** the page requests `max_price=1050`, `1999`, `115`, `29`, or `0` respectively

#### Scenario: one digit after the point is a tenth of a pound

- **WHEN** the shopper enters `10.5`
- **THEN** the page requests `max_price=1050`

#### Scenario: a leading decimal point is pence only

- **WHEN** the shopper enters `.5`
- **THEN** the page requests `max_price=50`

#### Scenario: leading zeros are decimal

- **WHEN** the shopper enters `010`
- **THEN** the page requests `max_price=1000`

#### Scenario: surrounding whitespace is trimmed

- **WHEN** the shopper enters ` 10 `, or a non-breaking space before `10`
- **THEN** the page requests `max_price=1000`, the same as for `10`

#### Scenario: whitespace alone is no ceiling

- **WHEN** the price field holds only whitespace
- **THEN** the page requests the list without `max_price`, as it does for an empty field

#### Scenario: an item priced exactly at the ceiling is shown

- **WHEN** the shopper enters `8` and an item costs `800` cents
- **THEN** that item is shown

#### Scenario: clearing the field removes the ceiling

- **WHEN** the field is emptied after a ceiling was applied
- **THEN** the page requests the list without `max_price` and shows every item matching the search, announced as in `REQ-CAT-7`

#### Scenario: composes with search

- **WHEN** the search box holds `mug` and the price field holds `10`
- **THEN** only items matching `mug` (`REQ-CAT-3`) and priced at or under `1000` cents are shown

#### Scenario: the live-region summary states the ceiling

- **WHEN** a ceiling of `10` is applied and the list settles on `{n}` items, with an empty search box
- **THEN** the summary reads exactly `Showing 1 item at £10.00 or less.` if one item remains, `Showing {n} items at £10.00 or less.` otherwise (including `Showing 0 items at £10.00 or less.`)
- **AND** with a query `{q}`, it reads `1 item matches “{q}” at £10.00 or less.` or `{n} items match “{q}” at £10.00 or less.`, or, when nothing matches, `Nothing matches “{q}” at £10.00 or less.`
- **AND** assistive technology announces it automatically

#### Scenario: a ceiling that excludes everything says so

- **WHEN** a ceiling of `10` is applied, the search box is empty, and the list is empty
- **THEN** the item area shows exactly `Nothing costs £10.00 or less.`, never `The catalogue is empty.` (`REQ-CAT-12`) and never a message embedding an empty query
- **AND** the live region reads exactly `Showing 0 items at £10.00 or less.`

#### Scenario: a ceiling and a query that match nothing together

- **WHEN** a ceiling of `10` and a non-empty query `{q}` are applied and the list is empty
- **THEN** the item area shows exactly `Nothing matches “{q}” at £10.00 or less.`, with `{q}` shown as inert text (`REQ-CAT-6`)
- **AND** the live region reads that same sentence

#### Scenario: a half-typed decimal is not a refusal

- **WHEN** the shopper has typed `10.` or `.`
- **THEN** the page announces no error and sends no request
- **AND** the items on display, and the summary, are unchanged
- **AND** the field is not `aria-invalid`

#### Scenario: other actions while the field is incomplete keep the last applied ceiling

- **WHEN** a ceiling of `10` is applied, the shopper edits the field to `10.`, and then changes the search box, places an order, or operates the load-failure retry
- **THEN** that request carries `max_price=1000`, and the summary and empty-state wording state `£10.00`
- **AND** the field stays not `aria-invalid`, with no message
- **AND** if no list request has carried a ceiling yet, that request omits `max_price`

#### Scenario: editing a refusal back to a half-typed decimal clears the field message only

- **WHEN** the field holds `abc` and the shopper changes it to `10.`
- **THEN** the message next to the field is gone, the field is not `aria-invalid`, and no request is sent
- **AND** the live region still holds `Enter a maximum price such as 10 or 10.50.` until a later announcement replaces it

#### Scenario: a value that is not a price is refused on the page

- **WHEN** the shopper enters `abc`, `-1`, `1e3`, `10.505`, `£10`, `1,000`, a digit that is not ASCII `0`–`9`, or a number with 14 digits before the decimal point
- **THEN** the page shows the exact message `Enter a maximum price such as 10 or 10.50.` next to the field and announces that same sentence
- **AND** the field is `aria-invalid="true"` and its `aria-describedby` references the element that shows the message
- **AND** no request for the item list is sent, and the items on display are unchanged

#### Scenario: a refusal does not drop the automatic load

- **WHEN** the shopper enters `abc` while the page's automatic load is still in flight
- **THEN** the refusal is shown and announced, and no further request is sent for that edit
- **AND** when the load arrives it is shown, so the catalogue area is not left empty
- **AND** the live region then holds that load's summary, not the refusal sentence
- **AND** the message next to the field, and the field's `aria-invalid` state, remain

#### Scenario: a refusal does not freeze stock after an order

- **WHEN** the shopper enters `abc` while the refresh after an order is still in flight
- **THEN** when that refresh arrives the list shows the updated stock
- **AND** the summary is not re-announced (`REQ-CAT-7`)
- **AND** the message next to the field, and the field's `aria-invalid` state, remain

#### Scenario: other actions while the field is refused keep the last applied ceiling

- **WHEN** a ceiling of `10` is applied, the shopper enters `abc`, and then changes the search box, places an order, or operates the load-failure retry
- **THEN** that request carries `max_price=1000`
- **AND** the message next to the field, and the field's `aria-invalid` state, stay until the field is cleared, left incomplete, or replaced by a price
- **AND** if no list request has carried a ceiling yet, that request omits `max_price`
- **AND** a search change that matches nothing uses the same wording as a price of `10`: `Nothing matches “{q}” at £10.00 or less.` when the trimmed query is non-empty, and `Nothing costs £10.00 or less.` with the live region reading `Showing 0 items at £10.00 or less.` when the trimmed query is empty

#### Scenario: a whitespace-only search with a ceiling is no query

- **WHEN** a ceiling of `10` is applied, the search box holds only whitespace, and the list is empty
- **THEN** the item area shows exactly `Nothing costs £10.00 or less.`
- **AND** the live region reads exactly `Showing 0 items at £10.00 or less.`
- **AND** neither message embeds the whitespace

#### Scenario: an order placed while the field is refused keeps the ceiling on the list

- **WHEN** a ceiling of `10` is applied, the shopper enters `abc`, and then places an order
- **THEN** the refresh carries `max_price=1000` and the list holds only items at or under that ceiling
- **AND** the summary is not re-announced (`REQ-CAT-7`), so the live region still holds the refusal sentence
- **AND** the message next to the field, and the field's `aria-invalid` state, remain

#### Scenario: correcting a refused value resumes filtering

- **WHEN** a refused value is replaced by a price or by nothing
- **THEN** the refusal message is cleared, the field is no longer `aria-invalid`, and the list is requested and shown as for any valid value

#### Scenario: a stale response from an earlier ceiling is discarded

- **WHEN** the ceiling changes before an in-flight request for the previous ceiling returns
- **THEN** that earlier response is discarded on arrival (`REQ-CAT-8`) and only the latest ceiling's results are shown and announced

#### Scenario: an order keeps the ceiling

- **WHEN** an order is placed (`REQ-ORD-1`) while a ceiling is applied
- **THEN** the refreshed list is requested with the same ceiling and the search summary is not re-announced (`REQ-CAT-7`)

#### Scenario: a failed load under a ceiling is a failure, not an empty result

- **WHEN** the item list cannot be loaded while a ceiling is applied
- **THEN** the page shows the load-failure message with its retry control (`REQ-CAT-11`), not `Nothing costs £10.00 or less.`
- **AND** operating the retry control requests the list with the last applied ceiling — the price in the field when the field holds a price, and the ceiling the most recent list request carried when the field is incomplete or refused

#### Scenario: no ceiling behaves as today

- **WHEN** the price field is empty
- **THEN** the list, its empty-state messages and the summary read exactly as `REQ-CAT-3`, `REQ-CAT-6`, `REQ-CAT-7` and `REQ-CAT-12` specify

### Requirement: REQ-CAT-14 — the search field has a visible label that does not depend on its placeholder

The catalogue page SHALL show the text `Search the catalogue` as a visible label for the search field, at all times: before anything is typed, while the shopper types, and after. The label is page text, not the field's placeholder and not its value, so typing never removes or replaces it. The label SHALL NOT be visually hidden. The label's text is fixed; it never contains the search query or any other user-supplied text. The field's accessible name (`REQ-CAT-5`) SHALL contain the visible label's text, so what a shopper reads is what assistive technology and speech control call the field. The placeholder hint (`REQ-CAT-5`) is still shown while the field is empty. This requirement changes only what the page displays: search matching (`REQ-CAT-3`), the search summary (`REQ-CAT-7`), and the empty-state messages (`REQ-CAT-6`, `REQ-CAT-12`, `REQ-CAT-13`) are unaffected. The label's size, colour, spacing and position relative to the field, and how the search field and the maximum price field are aligned with each other, are presentation choices this requirement does not fix; the one constraint on them is that the label is shown, not hidden. The API and every other surface inherit nothing from it.

#### Scenario: the label is visible before typing

- **WHEN** the catalogue page loads and the search field is empty
- **THEN** the page shows the text `Search the catalogue` as a label for the search field, and it is not visually hidden

#### Scenario: the label survives typing

- **WHEN** the shopper types into the search field, so the placeholder is no longer displayed
- **THEN** the text `Search the catalogue` is still shown as the field's label

#### Scenario: the label is tied to the field

- **WHEN** the shopper activates the visible label
- **THEN** focus moves to the search field

#### Scenario: the visible label and the accessible name agree

- **WHEN** assistive technology reports the search field's accessible name
- **THEN** that name contains the text `Search the catalogue` (`REQ-CAT-5` still holds)

#### Scenario: the placeholder still displays

- **WHEN** the search field is empty
- **THEN** its placeholder hint is shown alongside the label, as `REQ-CAT-5` requires

#### Scenario: the label never carries the query

- **WHEN** the shopper types any text, including characters that would be read as markup
- **THEN** the label's text is still exactly `Search the catalogue`, and nothing the shopper typed appears in it

#### Scenario: composes with the maximum price field

- **WHEN** the catalogue page is shown with both the search field and the maximum price field (`REQ-CAT-13`)
- **THEN** the search field's visible label does not change the maximum price field's accessible name, which stays exactly `Maximum price`

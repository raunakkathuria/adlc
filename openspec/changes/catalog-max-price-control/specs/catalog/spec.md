## ADDED Requirements

### Requirement: REQ-CAT-13 — the catalogue page lets a shopper set a maximum price

The catalogue page SHALL carry a **maximum price** field with its own accessible name that does not depend on its placeholder (as `REQ-CAT-5` requires of the search field). The shopper enters a price in pounds. The page trims leading and trailing whitespace before it reads the field, as it already trims the search box. An empty field, or one that is empty after trimming, means no ceiling.

After trimming, the field is in exactly one of three states:

- **A price.** One or more digits, optionally followed by a `.` and one or two digits (`10`, `10.5`, `10.50`, `0`, `0.29`), or a `.` followed by one or two digits (`.5`, `.50`). Leading zeros are decimal, not another base (`010` is ten pounds). The page converts that amount to cents from its digits — whole pounds times 100, plus the pence — and narrows the list as `GET /api/items?max_price={cents}` does (`REQ-CAT-4`). At most 13 digits may stand before the decimal point. `0` is a ceiling of zero cents.
- **Incomplete.** A lone `.`, or one or more digits followed by a `.` with nothing after it (`10.`). The shopper is still typing. The page SHALL NOT announce an error, SHALL NOT mark the field invalid, and SHALL NOT send a request. The list and the summary stay as they were. While the field is incomplete, a search-box change, the refresh after an order (`REQ-ORD-1`), and the load-failure retry (`REQ-CAT-11`) still request the list, and those requests carry the **last applied ceiling** — the ceiling (or none) that the page's most recent request for the item list carried. An incomplete field therefore changes nothing until it becomes a price, empty, or refused.
- **Refused.** Anything else, including a leading `-` or `+`, scientific notation, a third decimal place, a currency symbol, a thousands separator, or 14 or more digits before the decimal point. The page SHALL show the exact message `Enter a maximum price such as 10 or 10.50.` in an element next to the field, announce that same sentence through the search-results live region (`REQ-CAT-7`), set `aria-invalid="true"` on the field, and point `aria-describedby` at the element that shows the message. No request is sent. The items on display stay as they were. A response already in flight for the item list is discarded on arrival, as `REQ-CAT-8` discards a superseded response, so it cannot redraw the list or clear the refusal. The field is never silently treated as no ceiling.

The message next to the field is not the live region. A later announcement may replace the live region's text; it SHALL NOT remove the message or the `aria-invalid` / `aria-describedby` state. That state clears only when the field becomes empty, incomplete, or a price. While the field is refused, a search-box change, the refresh after an order (`REQ-ORD-1`), and the load-failure retry (`REQ-CAT-11`) still request the list, and those requests omit `max_price`.

The ceiling and the search query (`REQ-CAT-3`) apply together: the list holds only items that satisfy both. Any request the page issues while the field holds a price — a change to either field, the automatic load, or the refresh after an order — carries that ceiling, and is a request like any other for `REQ-CAT-8` and `REQ-CAT-11`.

While a price is applied, the page states the ceiling, formatted as the page formats prices (`£10.00`), wherever it reports the outcome. `REQ-CAT-6`, `REQ-CAT-7`, and `REQ-CAT-12` describe the wording when no ceiling is applied. With one applied, the wording is as below. Only the page's own formatted amount appears in these messages — the text typed in the price field is never inserted as markup — and the search query, where shown, keeps the inert-text guarantee of `REQ-CAT-6`.

#### Scenario: the field narrows the list

- **WHEN** the shopper enters `10` and the catalogue holds items priced `800`, `1250` and `350` cents
- **THEN** the page requests `max_price=1000` and shows the items priced `800` and `350`, not `1250`

#### Scenario: pounds and pence convert from the digits

- **WHEN** the shopper enters `10.50`, `19.99`, `1.15`, `0.29`, or `0`
- **THEN** the page requests `max_price=1050`, `1999`, `115`, `29`, or `0` respectively

#### Scenario: a leading decimal point is pence only

- **WHEN** the shopper enters `.5`
- **THEN** the page requests `max_price=50`

#### Scenario: leading zeros are decimal

- **WHEN** the shopper enters `010`
- **THEN** the page requests `max_price=1000`

#### Scenario: surrounding whitespace is trimmed

- **WHEN** the shopper enters ` 10 `
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
- **AND** if no request has yet carried a ceiling, or the most recent request omitted it (for example while the field was refused), that request omits `max_price`

#### Scenario: a value that is not a price is refused on the page

- **WHEN** the shopper enters `abc`, `-1`, `1e3`, `10.505`, `£10`, `1,000`, or a number with 14 digits before the decimal point
- **THEN** the page shows the exact message `Enter a maximum price such as 10 or 10.50.` next to the field and announces that same sentence
- **AND** the field is `aria-invalid="true"` and its `aria-describedby` references the element that shows the message
- **AND** no request for the item list is sent, and the items on display are unchanged

#### Scenario: a refusal discards an in-flight response

- **WHEN** the shopper replaces a price with `abc` while a request for that price is still in flight
- **THEN** no new request is sent, and the refusal is shown and announced as above
- **AND** the in-flight response is discarded on arrival and does not redraw the list or clear the refusal

#### Scenario: other actions while the field is refused omit the ceiling

- **WHEN** the field holds `abc` and the shopper changes the search box, places an order, or operates the load-failure retry
- **THEN** that request omits `max_price`
- **AND** the message next to the field, and the field's `aria-invalid` state, stay until the field is cleared, left incomplete, or replaced by a price

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
- **AND** operating the retry control requests the list with the ceiling still in the field

#### Scenario: no ceiling behaves as today

- **WHEN** the price field is empty
- **THEN** the list, its empty-state messages and the summary read exactly as `REQ-CAT-3`, `REQ-CAT-6`, `REQ-CAT-7` and `REQ-CAT-12` specify

## MODIFIED Requirements

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

The catalogue page SHALL expose a short, visually-hidden summary of the current search outcome as its own ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement) — a distinct element from where the matching items themselves are displayed, following the same pattern already used for order outcomes (`REQ-ORD-7`). The area where matching items are displayed SHALL NOT itself be marked as a live region: doing so would make assistive technology re-announce every remaining item's full detail on every keystroke, in place of the single short summary this requirement calls for. For the purposes of this requirement, a search is the query the user types (`REQ-CAT-3`) or the automatic search the page performs on load — not a listing refresh triggered by placing an order (`REQ-ORD-1`), which changes displayed stock but never changes which items match the current query. Whenever a search changes what the page shows, the summary is updated so assistive technology announces the outcome automatically, without the user needing to move focus into the results to find out. This is new page content: no summary or count exists anywhere on the page today. The literal query text `{q}` written into the summary on a match SHALL receive the same inert-text guarantee already required for the empty-state message (`REQ-CAT-6`): displayed as visible text only, never interpreted as markup, inserted as a page element, or run as script. While a maximum price is applied, `REQ-CAT-13` states the summary instead of the sentences in the scenarios below. Those scenarios describe the page when no maximum price is applied. A refusal of the maximum-price field (`REQ-CAT-13`) is also announced through this same live region.

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

When the search query changes again before an in-flight request for an earlier query has returned, the catalogue page SHALL discard that earlier response when it eventually arrives: only the results for the most recently issued query are ever shown or announced (`REQ-CAT-7`), regardless of the order in which responses arrive over the network. This requirement governs **every** request the page issues to load the item list, not only requests triggered by typing — including the listing refresh triggered by placing an order (`REQ-ORD-1`) and a request that carries a maximum price (`REQ-CAT-13`). An order-triggered refresh is a request for the item list like any other: if a newer query is issued (by typing) before it resolves, its response is discarded on arrival exactly as a stale typed-query response would be, and rendering the list never reverts to an earlier query's results. Setting the maximum-price field to a refused value issues no request and still discards any in-flight item-list response, so that late response cannot clear the refusal or redraw the list (`REQ-CAT-13`).

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

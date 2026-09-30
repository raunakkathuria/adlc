## ADDED Requirements

### Requirement: REQ-CAT-13 — the catalogue page lets a shopper set a maximum price

The catalogue page SHALL carry a **maximum price** field with its own accessible name that does not depend on its placeholder (as `REQ-CAT-5` requires of the search field). The shopper enters a price in pounds — a whole number or up to two decimal places (`10`, `10.5`, `10.50`) — and the page narrows the list as `GET /api/items?max_price={cents}` does (`REQ-CAT-4`), using the equivalent whole number of cents. An empty field, or one holding only whitespace, means no ceiling. The search results it returns, and every other behaviour of the list, are governed by the existing requirements; this one adds only what the page does with the field.

The ceiling and the search query (`REQ-CAT-3`) apply together: the list holds only items that satisfy both. Any request the page issues for the item list — a change to either field, the automatic load, or the refresh after an order (`REQ-ORD-1`) — carries the ceiling currently in the field, and is a request like any other for `REQ-CAT-8` (a stale response is discarded) and `REQ-CAT-11` (a load failure is reported, not shown as an empty result).

A value that is not a price — anything outside the forms above, including a negative, a signed or scientific-notation value, a third decimal place, or non-numeric text — SHALL be refused on the page in words, announced through the search-results live region (`REQ-CAT-7`), and **no request is sent**; the item list stays as it was. It is never silently treated as no ceiling.

While a valid ceiling is applied, the page states it, formatted as the page formats prices (`£10.00`), wherever it reports the outcome. `REQ-CAT-6`, `REQ-CAT-7` and `REQ-CAT-12` describe the wording when **no** ceiling is applied and are unchanged; with one applied, the wording is as below. Only the page's own formatted amount appears in these messages — the text typed in the price field is never inserted as markup — and the search query, where shown, keeps the inert-text guarantee of `REQ-CAT-6`.

#### Scenario: the field narrows the list

- **WHEN** the shopper enters `10` and the catalogue holds items priced `800`, `1250` and `350` cents
- **THEN** the page requests `max_price=1000` and shows the items priced `800` and `350`, not `1250`

#### Scenario: pounds and pence convert exactly

- **WHEN** the shopper enters `10.50`
- **THEN** the page requests `max_price=1050`

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

- **WHEN** a valid ceiling is applied, the search box is empty, and the list is empty
- **THEN** the item area shows exactly `Nothing costs £5.00 or less.` (for a ceiling of `5`), never `The catalogue is empty.` (`REQ-CAT-12`) and never a message embedding an empty query

#### Scenario: a ceiling and a query that match nothing together

- **WHEN** a valid ceiling and a non-empty query `{q}` are applied and the list is empty
- **THEN** the item area shows exactly `Nothing matches “{q}” at £5.00 or less.`, with `{q}` shown as inert text (`REQ-CAT-6`)

#### Scenario: a value that is not a price is refused on the page

- **WHEN** the shopper enters `abc`, `-1`, `1e3` or `10.505`
- **THEN** the page shows and announces a message that the maximum price must be an amount such as `10` or `10.50`
- **AND** no request for the item list is sent, and the items on display are unchanged

#### Scenario: correcting a refused value resumes filtering

- **WHEN** a refused value is replaced by a valid price or by nothing
- **THEN** the refusal message is cleared and the list is requested and shown as for any valid value

#### Scenario: a stale response from an earlier ceiling is discarded

- **WHEN** the ceiling changes before an in-flight request for the previous ceiling returns
- **THEN** that earlier response is discarded on arrival (`REQ-CAT-8`) and only the latest ceiling's results are shown and announced

#### Scenario: an order keeps the ceiling

- **WHEN** an order is placed (`REQ-ORD-1`) while a ceiling is applied
- **THEN** the refreshed list is requested with the same ceiling and the search summary is not re-announced (`REQ-CAT-7`)

#### Scenario: a failed load under a ceiling is a failure, not an empty result

- **WHEN** the item list cannot be loaded while a ceiling is applied
- **THEN** the page shows the load-failure message with its retry control (`REQ-CAT-11`), not `Nothing costs … or less.`
- **AND** operating the retry control requests the list with the ceiling still in the field

#### Scenario: no ceiling behaves as today

- **WHEN** the price field is empty
- **THEN** the list, its empty-state messages and the summary read exactly as `REQ-CAT-3`, `REQ-CAT-6`, `REQ-CAT-7` and `REQ-CAT-12` specify

## MODIFIED Requirements

### Requirement: REQ-CAT-12 — a catalogue with no items says so, distinctly from a search with no matches

When the item list loads successfully with no search query (`REQ-CAT-3`) — a query of only whitespace counts as no query, as the page already trims the field before searching — and no other narrowing parameter applied — for example `max_price` (`REQ-CAT-4`) — and the response holds zero items, meaning the catalogue itself holds no items rather than any filter narrowing it to nothing, the catalogue page SHALL display the exact message `The catalogue is empty.` in place of the no-results search message (`REQ-CAT-6`). This message SHALL NOT embed or reference the query or any filter value, because there is none to report. A zero-item result produced while any filter is applied — a search query, or a narrowing parameter such as `max_price` — is not a genuinely empty catalogue and is out of this requirement's scope: the page's maximum-price field (`REQ-CAT-13`) now makes the `max_price` case reachable, and `REQ-CAT-13` decides that message, which is never `The catalogue is empty.` The search-results live region (`REQ-CAT-7`) already announces `Showing 0 items.` for this same case; this requirement governs the message shown among the item cards and does not change that announcement's wording.

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

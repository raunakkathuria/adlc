# Catalog — delta for filter-catalog-by-price

## ADDED Requirements

### Requirement: REQ-CAT-4 — narrow the catalogue to a maximum price

`GET /api/items?max_price={cap}` SHALL return only the items priced at or below `{cap}`. The cap is a whole number in **minor units** — the same units as `price` — so `1000` means £10.00. The cap is **inclusive**.

Zero is a filter here, not a mistake: a cap of `1` already answers `200` with an empty array, so `0` answers the same way. A negative cap is not a budget, so it is refused. This is a deliberate divergence from REQ-ORD-6, which refuses a `qty` of zero — and it is the open question this delta hands to Gate 1, so confirm it before writing the test.

#### Scenario: items above the cap are excluded

- **WHEN** the cap is `1000` and the catalogue holds items priced `350`, `800` and `1250`
- **THEN** the response is `200` with the `350` and `800` items, and not the `1250` one

#### Scenario: the cap is inclusive

- **WHEN** the cap is exactly an item's price
- **THEN** that item is returned — a cap of `800` includes the item priced `800`

#### Scenario: cap above the most expensive item

- **WHEN** the cap is above the most expensive item
- **THEN** every item is returned

#### Scenario: cap below the cheapest item

- **WHEN** the cap is below the cheapest item
- **THEN** the response is `200` with an empty array

#### Scenario: absent or empty cap

- **WHEN** the cap is absent or empty
- **THEN** every item is returned, as in REQ-CAT-1

#### Scenario: zero cap is a filter, not a mistake

- **WHEN** the cap is `0`
- **THEN** the response is `200` with only the items priced `0` — an empty array in today's catalogue

#### Scenario: negative cap is refused

- **WHEN** the cap is negative
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}`

#### Scenario: fractional cap is refused

- **WHEN** the cap is not a whole number — `9.99`
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}`

#### Scenario: non-numeric cap is refused

- **WHEN** the cap is not a number at all — `cheap`
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}`

#### Scenario: cap composes with search

- **WHEN** a search query and a cap are both given
- **THEN** both apply — an item is returned only if it satisfies each (see REQ-CAT-3)

#### Scenario: a refused cap wins over search

- **WHEN** the cap is refused and a search query is also given
- **THEN** the response is `400` with `{"reason":"invalid_max_price"}` — the cap is refused before anything is narrowed, so a shopper never receives a plausible-looking list assembled from a filter the system did not understand

#### Scenario: the cap does not apply to fetch-by-SKU

- **WHEN** a cap is given on `GET /api/items/{sku}`
- **THEN** it has no effect: REQ-CAT-2 answers with that item at its own price, and refuses only an unknown SKU

#### Scenario: the cap never blocks a purchase

- **WHEN** an item is priced above the cap
- **THEN** it can still be ordered by SKU: `POST /api/orders` behaves exactly as REQ-ORD-1 describes — a cap narrows what is **listed**, never what may be bought

## MODIFIED Requirements

### Requirement: REQ-CAT-1 — list every item

`GET /api/items` SHALL return a JSON array of items in the catalog, each with `sku`, `name`, `price`, and `stock`. With no search query and no price cap, that is every item.

#### Scenario: full catalog

- **WHEN** the catalog holds three items
- **THEN** the response is `200` with three objects

#### Scenario: no filters means everything

- **WHEN** neither a search query nor a price cap is given
- **THEN** every item in the catalog is returned, whatever its price or stock

### Requirement: REQ-CAT-3 — search matches SKU or name, case-insensitively

`GET /api/items?q={query}` SHALL return only the items whose **SKU or name** contains the query. The comparison SHALL be **case-insensitive** on both fields.

A price cap (REQ-CAT-4) narrows the same list. When both are given, an item is returned only if it matches the query **and** is priced at or below the cap.

Search is how someone finds a product. A shopper who types what they see on the packaging — lowercase, or the SKU off the box — has to land on the item. A shopper who knows both what they want and what they can spend should be able to say so once.

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

#### Scenario: query and cap both satisfied

- **WHEN** the query is `notebook` and the cap is `1000`
- **THEN** the `Pocket Notebook`, priced `800`, is returned

#### Scenario: query matches but the cap excludes

- **WHEN** the query is `mug` and the cap is `1000`
- **THEN** the response is `200` with an empty array — the `Enamel Mug` matches the query but costs `1250`

#### Scenario: both filters empty is still an answer

- **WHEN** the query matches nothing and the cap excludes everything
- **THEN** the response is `200` with an empty array, not a rejection — neither filter finding anything is an answer

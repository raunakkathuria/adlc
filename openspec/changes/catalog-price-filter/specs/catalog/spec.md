## ADDED Requirements

### Requirement: REQ-CAT-4 — narrow the catalog by maximum price

`GET /api/items?max_price={cents}` SHALL return only the items whose `price` is less than or equal to `max_price`. `max_price` SHALL be expressed as an integer in **minor units (cents)**, matching how `price` is represented in every item the API returns. A `max_price` present together with a search query (`q`, REQ-CAT-3) SHALL narrow the list to items that satisfy **both** at once.

`max_price` SHALL be a non-negative integer. Any other value — non-numeric, a decimal, or negative — SHALL be refused with a `400` and `{"reason":"invalid_max_price"}`; the list is never silently returned unfiltered when the filter itself is malformed.

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

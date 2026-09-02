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

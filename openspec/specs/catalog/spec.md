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

## MODIFIED Requirements

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

# Catalog — specification

The catalog owns items and their stock. Over the API it is read-only; only an order changes stock (see [orders.md](orders.md)).

An item is `{ sku, name, price, stock }`. `price` is an integer in **minor units** (cents) — never a float.

This file is the source of truth for catalog behaviour. If the code and this file disagree, the code is wrong.

---

## REQ-CAT-1 — list every item

`GET /api/items` returns a JSON array of every item in the catalog, each with `sku`, `name`, `price`, and `stock`.

- WHEN the catalog holds three items THEN the response is `200` with three objects.

## REQ-CAT-2 — fetch one item by SKU

`GET /api/items/{sku}` returns the single item with that SKU.

- WHEN the SKU exists THEN the response is `200` with that item.
- WHEN the SKU is not in the catalog THEN the response is `404` with `{"reason":"unknown_sku"}`.

## REQ-CAT-3 — search matches SKU or name, case-insensitively

`GET /api/items?q={query}` returns only the items whose **SKU or name** contains the query. The comparison is **case-insensitive** on both fields.

- WHEN the query is `mug` THEN the item named `Enamel Mug` is returned — a name match in a different case.
- WHEN the query is `book-1` THEN the item with SKU `BOOK-1` is returned — a SKU match in a different case.
- WHEN the query matches nothing THEN the response is `200` with an empty array.
- WHEN the query is absent or empty THEN every item is returned, as in REQ-CAT-1.

Search is how someone finds a product. A shopper who types what they see on the packaging — lowercase, or the SKU off the box — has to land on the item.

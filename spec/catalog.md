# Catalog — specification

The catalog owns items and their stock. Over the API it is read-only; only an order changes stock (see [orders.md](orders.md)).

An item is `{ sku, name, price, stock }`. `price` is an integer in **minor units** (cents) — never a float.

This file is the source of truth for catalog behaviour. If the code and this file disagree, the code is wrong.

---

## REQ-CAT-1 — list the items

`GET /api/items` returns a JSON array of items in the catalog, each with `sku`, `name`, `price`, and `stock`. With no search query and no price cap, that is every item.

- WHEN the catalog holds three items THEN the response is `200` with three objects.
- WHEN neither a search query nor a price cap is given THEN every item in the catalog is returned, whatever its price or stock.

## REQ-CAT-2 — fetch one item by SKU

`GET /api/items/{sku}` returns the single item with that SKU.

- WHEN the SKU exists THEN the response is `200` with that item.
- WHEN the SKU is not in the catalog THEN the response is `404` with `{"reason":"unknown_sku"}`.

## REQ-CAT-3 — search matches SKU or name, case-insensitively

`GET /api/items?q={query}` returns only the items whose **SKU or name** contains the query. The comparison is **case-insensitive** on both fields.

A price cap (REQ-CAT-4) narrows the same list. When both are given, an item is returned only if it matches the query **and** is priced at or below the cap.

- WHEN the query is `mug` THEN the item named `Enamel Mug` is returned — a name match in a different case.
- WHEN the query is `book-1` THEN the item with SKU `BOOK-1` is returned — a SKU match in a different case.
- WHEN the query matches nothing THEN the response is `200` with an empty array.
- WHEN the query is absent or empty THEN every item is returned, as in REQ-CAT-1.
- WHEN the query is `notebook` and the cap is `1000` THEN the `Pocket Notebook`, priced `800`, is returned.
- WHEN the query is `mug` and the cap is `1000` THEN the response is `200` with an empty array — the `Enamel Mug` matches the query but costs `1250`.
- WHEN the query matches nothing and the cap excludes everything THEN the response is `200` with an empty array, not a rejection. Neither filter finding anything is an answer.

Search is how someone finds a product. A shopper who types what they see on the packaging — lowercase, or the SKU off the box — has to land on the item. A shopper who knows both what they want and what they can spend should be able to say so once.

## REQ-CAT-4 — narrow the catalogue to a maximum price

`GET /api/items?max_price={cap}` returns only the items priced at or below `{cap}`. The cap is a whole number in **minor units** — the same units as `price` — so `1000` means £10.00. The cap is **inclusive**.

- WHEN the cap is `1000` and the catalogue holds items priced `350`, `800` and `1250` THEN the response is `200` with the `350` and `800` items, and not the `1250` one.
- WHEN the cap is exactly an item's price THEN that item is returned — a cap of `800` includes the item priced `800`.
- WHEN the cap is above the most expensive item THEN every item is returned.
- WHEN the cap is below the cheapest item THEN the response is `200` with an empty array.
- WHEN the cap is absent or empty THEN every item is returned, as in REQ-CAT-1.
- WHEN the cap is `0` THEN the response is `200` with only the items priced `0` — an empty array in today's catalogue.
- WHEN the cap is negative THEN the response is `400` with `{"reason":"invalid_max_price"}`.
- WHEN the cap is not a whole number — `9.99` — THEN the response is `400` with `{"reason":"invalid_max_price"}`.
- WHEN the cap is not a number at all — `cheap` — THEN the response is `400` with `{"reason":"invalid_max_price"}`.

Zero is a filter here, not a mistake: a cap of `1` already answers `200` with an empty array, so `0` answers the same way. A negative cap is not a budget, so it is refused. This is a deliberate divergence from REQ-ORD-6, which refuses a `qty` of zero.

### How it composes

- WHEN a search query and a cap are both given THEN both apply — an item is returned only if it satisfies each. See REQ-CAT-3.
- WHEN the cap is refused and a search query is also given THEN the response is `400` with `{"reason":"invalid_max_price"}` — the cap is refused before anything is narrowed, so a shopper never receives a plausible-looking list assembled from a filter the system did not understand.
- WHEN a cap is given on `GET /api/items/{sku}` THEN it has no effect: REQ-CAT-2 answers with that item at its own price, and refuses only an unknown SKU.
- WHEN an item is priced above the cap THEN it can still be ordered by SKU: `POST /api/orders` behaves exactly as REQ-ORD-1 describes. A cap narrows what is **listed**, never what may be bought.

Price is the second thing a shopper filters on, after the name. "What have you got under a tenner" should be one question to the catalogue, not a whole list to read.

# Orders — specification

An order takes units of one item out of stock in exchange for a total. Money is an integer in **minor units** (cents) — never a float.

This file is the source of truth for order behaviour. If the code and this file disagree, the code is wrong.

---

## REQ-ORD-1 — place an order

`POST /api/orders` with `{"sku":"MUG-1","qty":2}` creates an order.

- WHEN the order is accepted THEN the response is `201` with `{ id, sku, qty, total }` and the item's stock has dropped by `qty`.
- WHEN the order is accepted THEN it appears in `GET /api/orders`.

## REQ-ORD-2 — stock is a hard limit

An order for more units than the item currently has in stock is rejected.

- WHEN an item has 8 in stock and 12 are ordered THEN the response is `422` with `{"reason":"insufficient_stock"}`.

## REQ-ORD-3 — at most 20 units per order

An order for more than 20 units of an item is rejected, regardless of stock.

- WHEN 21 units are ordered THEN the response is `422` with `{"reason":"over_limit"}`.
- WHEN exactly 20 units are ordered and stock allows it THEN the order is accepted.

## REQ-ORD-4 — a rejected order changes nothing

A rejected order leaves the system exactly as it was. This holds for **every** rejection reason, not just some of them.

- WHEN an order is rejected THEN `GET /api/items/{sku}` reports the same stock as before the attempt.
- WHEN an order is rejected THEN no new order appears in `GET /api/orders`.

A rejection is a decision not to trade. Nothing may be consumed by a trade that did not happen.

## REQ-ORD-5 — bulk discount at 10 units

An order of 10 or more units takes 10% off the gross total, rounded **down** to the minor unit.

- WHEN 12 units of a 1250-cent item are ordered THEN the total is `13500` — 15000 gross, less 1500.
- WHEN 9 units of the same item are ordered THEN the total is the gross `11250` — no discount.

## REQ-ORD-6 — reject malformed requests loudly

- WHEN the SKU is not in the catalog THEN the response is `404` with `{"reason":"unknown_sku"}`.
- WHEN `qty` is missing, zero, negative, or not a whole number THEN the response is `400` with `{"reason":"invalid_qty"}`.

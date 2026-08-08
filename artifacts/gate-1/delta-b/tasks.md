# Tasks — cancel an order

1. `app/server.mjs` — add the cancelled-ids `Set` and the `POST /api/orders/{id}/cancel` route.
2. `app/server.mjs` — have `listOrders` merge the `cancelled` field into each order it returns.
3. `app/index.html` — add a Cancel button to each row in the order history, and show cancelled orders differently.
4. `test/orders.test.js` — cover REQ-ORD-7 and REQ-ORD-8.

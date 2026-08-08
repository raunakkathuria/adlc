# Spec delta — cancel an order

Target: `spec/orders.md`

---

## ADDED — REQ-ORD-7 — cancel an order

`POST /api/orders/{id}/cancel` cancels an order. The service holds cancelled order ids in a `Set` keyed by order id, and `GET /api/orders` reads that `Set` to add a `cancelled: true` field to each affected order.

- WHEN a customer cancels order 1 THEN the response is `200`.
- WHEN a customer cancels order 1 THEN `GET /api/orders` returns order 1 with `cancelled: true`.
- WHEN a customer has cancelled an order THEN it still appears in their order history.

## ADDED — REQ-ORD-8 — cancellation is immediate

Cancelling an order should feel instant to the customer. The order history must reflect the cancellation straight away, with no delay a customer would notice.

- WHEN a customer cancels an order THEN the change is visible immediately.

---
id: 001
reported_by: support (via #bughunt)
reported_at: 2026-08-04T09:12:00Z
github: https://github.com/raunakkathuria/adlc/issues/2
---

# Ordering too many mugs makes stock disappear

A customer told us the mug count on the catalog page keeps dropping even though their order never went through. We reproduced it at our end:

1. The catalog showed **47** Enamel Mugs in stock.
2. We tried to order **25** of them.
3. The order was rejected — correctly, there's a 20-unit cap, and the message said so.
4. The catalog then showed **22** Enamel Mugs.

No order appears in the order history, so nothing was actually sold. But 25 mugs are gone from the count. Do it twice and stock keeps falling.

Nobody has complained about being *charged*, so this looks like it's only the stock number — but that number is what we use to decide when to reorder, so it matters.

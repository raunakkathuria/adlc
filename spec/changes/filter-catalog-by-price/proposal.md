# Let shoppers narrow the catalogue by price

From [`issues/003-filter-catalog-by-price.md`](../../../issues/003-filter-catalog-by-price.md).

## Why now

Two of the three questions support gets about the catalogue are a version of "what have you got under a tenner". The catalogue can be narrowed by name and by SKU, and by nothing else — so the only way to answer a question about price is to read the whole list and do the arithmetic by hand. Support does that today. Shoppers can't.

## What changes for the user

A shopper can set a maximum price and see only the items at or below it. It composes with search, so "notebook under £10" is one question to the catalogue rather than a search followed by a manual scan.

On the page that is a price box beside the search box, in pounds, narrowing as you type — the same feel as search. Over the API the cap is in minor units, like every other amount here, so a £10.00 cap is `1000`.

Nothing else about the catalogue moves. Same items, same fields, same order, same rules about who may buy what.

## Decisions taken

Each of these is a one-line change at Gate 1 if you disagree — but none of them is a coin flip, so the delta picks rather than asks.

- **The cap is in minor units**, not pounds. `price` is an integer in minor units and never a float; a filter on price that spoke a different unit than the thing it filters would be the one place in this product where an amount means something else.
- **The cap is inclusive.** The issue asks for "everything up to £10", and a £10.00 item is affordable on a £10 budget.
- **A malformed cap is refused, loudly** — `400` with a reason, never ignored. A filter the system did not understand must not come back looking like an answer.
- **A cap of zero is a valid filter with an empty answer.** A cap of `1` already answers `200` with an empty array; there is no reason for `0` to answer differently. Negative caps are refused — there is no such budget.
- **The page speaks pounds, the API speaks minor units.** Shoppers do not think in pence.

## Open question for Gate 1

**Does the parameter name need to carry its unit?**

The proposal calls it `max_price`, in minor units, for consistency with `price`. The cost is a quiet trap: a person hand-editing a URL — or a support agent sharing a link — will type `?max_price=10` meaning £10 and get an empty list, because they asked for everything under 10p. The list is correct and useless, and nothing tells them why.

The alternatives are to keep `max_price` and accept the trap, or to name it so the unit is unmissable (`max_price_minor`, say). Accepting a decimal cap is not on the table — it would put a float in the one place this product has always kept whole. This is a taste call about a name people will see, so it is yours, not mine.

## Out of scope

- **No minimum price and no range.** One cap.
- **No sorting by price.** The order of the list is exactly as it is today.
- **No preset buttons** (£5 / £10 / £20). A preset is only another way of setting the same cap, so it can be added later without moving the spec.
- **No stock filter**, and no hiding of out-of-stock items.
- **No change to orders.** A cap narrows what is listed, never what may be bought.
- **Repeated query parameters stay unspecified.** The spec is already silent on `?q=a&q=b`; this delta does not open that question.

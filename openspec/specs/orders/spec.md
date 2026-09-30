# Orders Specification

## Purpose

An order takes units of one item out of stock in exchange for a total. Money is an integer in **minor units** (cents) — never a float.

This file is the source of truth for order behaviour. If the code and this file disagree, the code is wrong.

## Requirements

### Requirement: REQ-ORD-1 — place an order

`POST /api/orders` with `{"sku":"MUG-1","qty":2}` SHALL create an order.

#### Scenario: accepted order

- **WHEN** the order is accepted
- **THEN** the response is `201` with `{ id, sku, name, qty, total }`, where `name` is the ordered item's name
- **AND** the item's stock has dropped by `qty`

#### Scenario: accepted order is listed

- **WHEN** the order is accepted
- **THEN** it appears in `GET /api/orders`, carrying the same `id`, `sku`, `name`, `qty`, and `total` as the response that created it

### Requirement: REQ-ORD-2 — stock is a hard limit

An order for more units than the item currently has in stock SHALL be rejected.

#### Scenario: over stock

- **WHEN** an item has 8 in stock and 12 are ordered
- **THEN** the response is `422` with `{"reason":"insufficient_stock"}`

### Requirement: REQ-ORD-3 — at most 20 units per order

An order for more than 20 units of an item SHALL be rejected as over the limit, regardless of the item's stock. This holds even when the item's stock is also short of the ordered quantity: the response SHALL report the unit-limit rejection, not the stock rejection (`REQ-ORD-2`). The stock check applies only when the unit limit is not exceeded.

#### Scenario: over the limit

- **WHEN** 21 units are ordered
- **THEN** the response is `422` with `{"reason":"over_limit"}`

#### Scenario: over the limit even when stock is also short

- **WHEN** an item has fewer than 21 in stock (for example 8) and 21 units of it are ordered
- **THEN** the response is `422` with `{"reason":"over_limit"}`, not `insufficient_stock`

#### Scenario: exactly at the limit

- **WHEN** exactly 20 units are ordered and stock allows it
- **THEN** the order is accepted

### Requirement: REQ-ORD-4 — a rejected order changes nothing

A rejected order SHALL leave the system exactly as it was. This holds for **every** rejection reason, not just some of them.

A rejection is a decision not to trade. Nothing may be consumed by a trade that did not happen.

#### Scenario: stock is untouched

- **WHEN** an order is rejected
- **THEN** `GET /api/items/{sku}` reports the same stock as before the attempt

#### Scenario: no order is recorded

- **WHEN** an order is rejected
- **THEN** no new order appears in `GET /api/orders`

### Requirement: REQ-ORD-5 — bulk discount at 10 units

An order of 10 or more units SHALL take 10% off the gross total, rounded **down** to the minor unit.

#### Scenario: discount applies

- **WHEN** 12 units of a 1250-cent item are ordered
- **THEN** the total is `13500` — 15000 gross, less 1500

#### Scenario: below the threshold

- **WHEN** 9 units of the same item are ordered
- **THEN** the total is the gross `11250` — no discount

### Requirement: REQ-ORD-6 — reject malformed requests loudly

Malformed order requests SHALL be rejected with a named reason.

#### Scenario: unknown SKU

- **WHEN** the SKU is not in the catalog
- **THEN** the response is `404` with `{"reason":"unknown_sku"}`

#### Scenario: invalid quantity

- **WHEN** `qty` is missing, zero, negative, or not a whole number
- **THEN** the response is `400` with `{"reason":"invalid_qty"}`

### Requirement: REQ-ORD-7 — order outcome is announced to assistive technology

The page's order-outcome region SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that assistive technology announces its content automatically whenever it changes, without the user needing to move focus to it. A successful order's confirmation message SHALL echo the ordered item's name alongside its `sku`, `qty`, and `total` — the same `{name} ({sku})` grouping the order history already uses (`REQ-ORD-10`) — so a shopper who does not recognize a SKU can still tell what they ordered without leaving the confirmation. Both that name and that SKU SHALL be inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script — the same guarantee already required for the search query (`REQ-CAT-6`), for the item card's own display of that name and SKU (`REQ-CAT-10`), for the Order button's accessible name and `data-sku` attribute (`REQ-ORD-8`), and for the order-history entry (`REQ-ORD-10`). Once shown, a confirmation or a rejection SHALL NOT outlive the search it was placed beside. When the trimmed search query changes, the region SHALL be emptied of that message, so a stale order result is never read as current beside results it has nothing to do with. The trim is the one the page already applies before searching. A change that leaves the trimmed query the same — typing or deleting only whitespace — is not a change, and the message stays. A not-sent message (`REQ-ORD-11`) is not cleared by a search change: emptying it would leave the shopper with no sign the order may not exist, and the order history cannot record an order that never arrived. This is the same notion of a search as `REQ-CAT-7` — a change to the query the shopper types — and not the listing refresh an order itself triggers, nor the catalogue's retry of the same query. Both of those SHALL leave the outcome in place. Emptying the region writes no text into it; the region's text content is empty. A confirmation or a rejection that arrives when the trimmed query differs from the one that was applied when the order was placed is not written into the region, because it would sit beside a different search. What counts is the comparison at the moment of arrival: if the shopper changed the query and changed it back while the order was in flight, the query is the same as when the order was placed, and the outcome is shown as usual. A not-sent message already in the region is never replaced by such a withheld outcome; it stays. The item-list refresh for that superseded query is still discarded (`REQ-CAT-8`). A successful order is still recorded in the order history. A not-sent message that arrives after the query changed is written in and announced, and a later search change does not clear it.

#### Scenario: success is announced

- **WHEN** an order is placed successfully
- **THEN** the confirmation message is written into the live region
- **AND** assistive technology announces it automatically

#### Scenario: the confirmation message includes the item's name

- **WHEN** an order for SKU `MUG-1`, quantity `2`, total `2500`, for an item named "Enamel Mug" is placed and accepted
- **THEN** the confirmation message reads `Order #{id} placed — 2 × Enamel Mug (MUG-1) for £25.00.`, where `{id}` is that order's own order number

#### Scenario: the SKU echoed in a successful order's confirmation is inert text

- **WHEN** an order for an item whose `sku` contains characters that would otherwise be read as markup — for example a quote or an ampersand — is placed and accepted
- **THEN** the confirmation message written into the live region displays that SKU as literal, inert text
- **AND** no script associated with that SKU runs

#### Scenario: the item name echoed in a successful order's confirmation is inert text

- **WHEN** an order for an item whose `name` contains characters that would otherwise be read as markup — for example a quote or an ampersand — is placed and accepted
- **THEN** the confirmation message written into the live region displays that name as literal, inert text
- **AND** no script associated with that name runs

#### Scenario: rejection is announced

- **WHEN** an order is rejected, for any reason
- **THEN** the rejection message is written into the live region
- **AND** assistive technology announces it automatically

#### Scenario: the region announces from the first order

- **WHEN** the page has just loaded and no order has been placed yet
- **THEN** the live region is already present in the page's markup
- **AND** the first order's outcome is announced, the same as every order after it

#### Scenario: a later outcome replaces an earlier one

- **WHEN** a second order is placed after the first, whether its outcome message reads the same as before or differently
- **THEN** the live region's content is replaced with the new outcome
- **AND** the new outcome is announced on its own, not appended to or stacked with the previous one

#### Scenario: changing the search clears an order's confirmation

- **WHEN** an order has been accepted and its confirmation is shown in the live region, and the shopper then changes the trimmed search query — by typing, deleting, or clearing it
- **THEN** the live region's text content is emptied as soon as the trimmed query changes, while the request for the new results is still pending
- **AND** the clearing writes no text into the region

#### Scenario: changing the search clears a rejection

- **WHEN** an order's rejection message (`REQ-ORD-9`) is shown, and the shopper then changes the trimmed search query
- **THEN** the live region's text content is emptied, exactly as for a confirmation
- **AND** the clearing writes no text into the region

#### Scenario: changing the search does not clear a not-sent message

- **WHEN** an order's not-sent message (`REQ-ORD-11`) is shown, and the shopper then changes the trimmed search query
- **THEN** that not-sent message stays in the live region

#### Scenario: whitespace that does not change the trimmed query leaves the message

- **WHEN** a confirmation is shown and the shopper types or deletes only whitespace, so the trimmed query is unchanged
- **THEN** the confirmation stays in the live region

#### Scenario: the order's own refresh does not clear its outcome

- **WHEN** an order is placed, accepted or rejected, and the item list refreshes afterward under the same query that was already applied (`REQ-CAT-7`)
- **THEN** the outcome message stays in the live region, unaffected by that refresh

#### Scenario: retrying the catalogue load does not clear the outcome

- **WHEN** an order outcome is shown and the shopper operates the catalogue's retry control, which reloads the same query
- **THEN** the outcome stays in the live region

#### Scenario: the page's first search does not disturb an outcome

- **WHEN** the page has just loaded and performs its automatic search with an empty query, and no order has been placed
- **THEN** the live region is unchanged, still present in the page's markup and empty

#### Scenario: a confirmation or rejection that arrives after the query changed is not shown

- **WHEN** an order is placed, the shopper changes the trimmed search query while that order is still in flight, and a confirmation or a rejection then arrives
- **THEN** that confirmation or rejection is not written into the live region
- **AND** the region's text stays as the clearing left it
- **AND** a confirmation's order is still recorded in the order history
- **AND** the item-list refresh for the superseded query is discarded (`REQ-CAT-8`)

#### Scenario: a query that changed and changed back does not withhold the outcome

- **WHEN** an order is placed under the query `mug`, the shopper changes the trimmed query to `book` and back to `mug` while that order is still in flight, and a confirmation then arrives
- **THEN** the confirmation is written into the live region and announced, because the trimmed query now equals the one the order was placed under

#### Scenario: a withheld outcome does not replace a not-sent message

- **WHEN** a not-sent message (`REQ-ORD-11`) is shown, another order is placed, the shopper changes the trimmed query while it is in flight, and a confirmation or a rejection then arrives
- **THEN** the not-sent message stays in the live region unchanged

#### Scenario: a not-sent message that arrives after the query changed is shown

- **WHEN** an order is placed, the shopper changes the trimmed search query while that order is still in flight, and the order was not sent (`REQ-ORD-11`)
- **THEN** that not-sent message is written into the live region and announced
- **AND** a later change of the trimmed query does not clear it

#### Scenario: a later order after a clear is announced normally

- **WHEN** the live region was emptied by a change of query and the shopper then places another order
- **THEN** its outcome is written into the live region and announced, the same as the first order from a freshly loaded page

### Requirement: REQ-ORD-8 — the Order button names the item it orders

Each item card's Order button SHALL have an accessible name that includes the item's name, so that assistive technology distinguishes it from every other item's Order button instead of announcing plain "Order" with no context. The item's name embedded in that accessible name, and the item's SKU carried in the button's `data-sku` attribute (which identifies which item an order is for), SHALL both be inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script — the same guarantee already required for the search query (`REQ-CAT-6`) and for the rest of the item card's own display of that name and SKU (`REQ-CAT-10`).

#### Scenario: accessible name includes the item's name

- **WHEN** the catalogue page renders an item card for an item named "Enamel Mug"
- **THEN** that item's Order button has an accessible name that includes "Enamel Mug" (for example, via an `aria-label`)

#### Scenario: each item's button is distinguishable from the others

- **WHEN** the catalogue page renders multiple item cards
- **THEN** each item's Order button has a distinct accessible name corresponding to that item, and no two different items share the same Order button accessible name

#### Scenario: the visible label is unaffected

- **WHEN** an item card's Order button is rendered
- **THEN** the button's visible text still reads "Order", unaffected by this requirement

#### Scenario: composes with search

- **WHEN** the catalogue list is narrowed by a search query (REQ-CAT-3) and the page re-renders the remaining items
- **THEN** each remaining item's Order button still carries an accessible name that includes that item's name

#### Scenario: markup in the item name is shown as text within the accessible name, not parsed

- **WHEN** an item's `name` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the Order button's accessible name includes those characters as literal text
- **AND** no new element or attribute from that name is inserted into the page's structure

#### Scenario: a script-injection attempt in the item name does not run

- **WHEN** an item's `name` contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, a script tag, or a quote character followed by an event-handler attribute
- **THEN** no script associated with that name runs
- **AND** the Order button's accessible name still includes the name as inert text

#### Scenario: markup in the item SKU is shown as text in the data attribute, not parsed

- **WHEN** an item's `sku` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the Order button's `data-sku` attribute carries those characters as literal, inert content
- **AND** no new element or attribute from that SKU is inserted into the page's structure

#### Scenario: a script-injection attempt in the item SKU does not run

- **WHEN** an item's `sku` contains a construct that would execute script if interpreted as markup — for example a quote character followed by an event-handler attribute
- **THEN** no script associated with that SKU runs
- **AND** the Order button's `data-sku` attribute still carries the SKU as inert text

#### Scenario: an order for an item with markup in its SKU reaches the API unchanged

- **WHEN** an item whose `sku` contains characters that would otherwise be read as markup is ordered via its Order button
- **THEN** the order request sent to `POST /api/orders` (`REQ-ORD-1`) carries that item's SKU exactly as stored in the catalog, not an escaped or otherwise altered form
- **AND** the order is accepted or rejected using that same unaltered SKU, per the ordinary order rules

### Requirement: REQ-ORD-9 — a rejection message is always plain English, never a raw reason code

When an order is rejected, the message shown to the shopper SHALL be phrased in plain English. This SHALL hold even when the rejection's reason is not one of the reasons the page has specific wording for, and even when the rejection carries no reason at all — the shopper SHALL NOT be shown the server's raw, underscore-joined reason identifier verbatim, nor a message that reads as missing or undefined.

#### Scenario: a reason the page already has wording for keeps that wording

- **WHEN** an order is rejected for one of the reasons the page has specific wording for (over the unit limit, insufficient stock, an unknown SKU, or an invalid quantity)
- **THEN** the message shown is that reason's existing specific wording, unaffected by this requirement

#### Scenario: an unrecognized reason still reads in plain English

- **WHEN** an order is rejected with a reason the page has no specific wording for
- **THEN** the message shown is a plain-English sentence
- **AND** it does not include the raw reason identifier verbatim

#### Scenario: a rejection with no reason at all still reads in plain English

- **WHEN** an order is rejected and the response carries no reason
- **THEN** the message shown is a plain-English sentence
- **AND** it does not display the literal word "undefined" or "null"

#### Scenario: composes with the live region

- **WHEN** a rejection message is shown, whether it is the specific wording for a known reason or the plain-English fallback for one the page doesn't recognize
- **THEN** that message is written into the order-outcome live region (REQ-ORD-7) and announced the same way

### Requirement: REQ-ORD-10 — an order-history entry displays its SKU as inert text

Each entry the order history renders SHALL display the name of the item that was ordered (`REQ-ORD-1`) alongside that order's `sku`, `qty`, and `total`, formatted as `#{id} — {qty} × {name} ({sku}) — {total}`. Both the `name` and the `sku` SHALL be displayed as inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script. `REQ-CAT-10` covers the item card's display of `name` and `sku`, and `REQ-ORD-8` the Order button's; this requirement carries that same inert-text guarantee to the order history — the third surface that now renders a server-supplied item name, and the third that renders a server-supplied SKU.

#### Scenario: an ordinary order still displays correctly

- **WHEN** the order history renders an order for SKU `MUG-1`, quantity `2`, total `2500`, for an item named "Enamel Mug"
- **THEN** the entry reads `#{id} — 2 × Enamel Mug (MUG-1) — £25.00`, where `{id}` is that order's own order number

#### Scenario: markup in a SKU is shown as text, not parsed

- **WHEN** an order's `sku` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the entry carries those characters as literal, inert content
- **AND** no new element or attribute from that `sku` is inserted into the page's structure

#### Scenario: markup in the item's name is shown as text, not parsed

- **WHEN** an order's item `name` contains characters that would otherwise be read as markup — for example `<`, `>`, `&`, or a quote
- **THEN** the entry carries those characters as literal, inert content
- **AND** no new element or attribute from that `name` is inserted into the page's structure

#### Scenario: a script-injection attempt in the item's name does not run

- **WHEN** an order's item `name` contains a construct that would execute script if interpreted as markup — for example an image tag with an error handler, a script tag, or a quote character followed by an event-handler attribute
- **THEN** no script associated with that `name` runs
- **AND** the entry still displays the `name` as inert text

### Requirement: REQ-ORD-11 — an order or order history that could not be reached says so

When the page cannot submit an order — because the request never reaches the server, or because the reply cannot be read as the page expects — it SHALL tell the shopper that the order was not sent, through the order-outcome live region (`REQ-ORD-7`). It SHALL NOT show a confirmation, and SHALL NOT describe the outcome as a rejection: a rejection is a decision the server made, and an order that never arrived was not decided on. Leaving the shopper with no message at all is the worst outcome, because they cannot tell whether the order was placed.

#### Scenario: a request that never reaches the server

- **WHEN** a shopper places an order and the request cannot be completed at all
- **THEN** a message saying the order was not sent is written into the order-outcome live region
- **AND** no order confirmation is shown

#### Scenario: a reply that cannot be read

- **WHEN** the server answers an order but the reply cannot be read as the page expects
- **THEN** the shopper is told the order was not sent, rather than being shown nothing

#### Scenario: a rejection is still a rejection

- **WHEN** an order reaches the server and is rejected
- **THEN** the shopper sees that rejection's plain-English wording (`REQ-ORD-9`), unaffected by this requirement

#### Scenario: a successful order is unaffected

- **WHEN** an order succeeds
- **THEN** the confirmation behaves exactly as before, unaffected by this requirement

The same holds for the order history. When the page cannot load it — the request never reaches the server, or the reply cannot be read as the page expects — it SHALL say so where the history is displayed, rather than showing an empty history, which would tell the shopper their orders are gone. That message SHALL carry a control that retries loading: nothing else on the page reloads the history except placing another order, which is the last thing a shopper will do while unsure what they have already ordered.

#### Scenario: a history that cannot be loaded is not an empty history

- **WHEN** the order history cannot be loaded
- **THEN** the shopper is told it could not be loaded
- **AND** they are not shown the wording used when there are genuinely no orders yet

#### Scenario: the history failure offers a way to retry

- **WHEN** the order history could not be loaded and the failure message is shown
- **THEN** that message includes a control that retries loading

### Requirement: REQ-ORD-12 — the quantity input hints the binding limit

Each item card's quantity input (rendered by the catalogue page alongside the item's name and SKU, `REQ-CAT-10`) SHALL carry a `max` attribute equal to the **lesser** of the 20-unit order limit (`REQ-ORD-3`) and the item's current stock (`REQ-ORD-2`), so a browser's own number-input affordances hint whichever of the two actually binds for that item, before the shopper submits. This is a hint only: it SHALL NOT change what is accepted or rejected. An order for more than 20 units, or for more than the item's stock, is still refused exactly as `REQ-ORD-3` and `REQ-ORD-2` already require, whether or not the shopper's browser respects the hint when they type a value directly rather than using the input's own increment controls.

#### Scenario: a well-stocked item is hinted by the order cap

- **WHEN** the catalogue page renders an item card for an item with 20 or more in stock
- **THEN** the quantity input has `max="20"`, alongside its existing `min="1"`

#### Scenario: a scarcer item is hinted by its own stock

- **WHEN** the catalogue page renders an item card for an item with fewer than 20 in stock (for example, 8)
- **THEN** the quantity input's `max` equals that stock (`max="8"`), not `20`

#### Scenario: an item exactly at the cap is hinted by the cap

- **WHEN** the catalogue page renders an item card for an item with exactly 20 in stock
- **THEN** the quantity input has `max="20"`

#### Scenario: an out-of-stock item's hint is its own stock

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** the quantity input has `max="0"`, unaffected by its own `min="1"` (`REQ-ORD-2` already rejects any order for such an item, regardless of what the hint reads)

#### Scenario: the hint composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and the page re-renders the remaining items
- **THEN** each remaining item's quantity input still carries a `max` reflecting the lesser of `20` and that item's current stock

#### Scenario: the hint composes with an order that changes stock

- **WHEN** an order is accepted (`REQ-ORD-1`), lowering an item's stock, and the item list refreshes afterward
- **THEN** that item's quantity input, on its next render, carries a `max` reflecting its new, lower stock

#### Scenario: the hint does not change what the server accepts

- **WHEN** a shopper submits an order for more than the hinted `max` despite the hint — for example, by typing a larger value directly instead of using the input's increment controls
- **THEN** the order is still rejected exactly as `REQ-ORD-3` (over the unit limit) or `REQ-ORD-2` (insufficient stock) requires, whichever applies, unaffected by this requirement

#### Scenario: the existing minimum and default are unaffected

- **WHEN** the item card renders
- **THEN** the quantity input's `min="1"` and its default value of `1` are unchanged by this requirement, even for an out-of-stock item whose `max` is `0`

### Requirement: REQ-ORD-13 — the Order button is disabled when stock is zero

Each item card's Order button (`REQ-ORD-8`) SHALL be disabled whenever that item's stock is 0, so a shopper can tell the item cannot currently be ordered before they click, instead of learning only after a rejected round trip (`REQ-ORD-2`). This is a client-side hint only: it SHALL NOT replace or weaken the stock check the server performs on every order (`REQ-ORD-2`), which continues to reject an order for more units than an item currently has in stock regardless of what any particular client sent.

A disabled button that gives no reason leaves assistive technology announcing only that the control is unavailable, with the explanation left in the card's stock text where the button does not point to it. When the button is disabled, it SHALL therefore carry an accessible description whose content is exactly that item's own stock text, "{n} in stock" (for example "0 in stock") — the same wording the item card already displays as part of its meta line, shown there as plain, inert text: no part of it SHALL be interpreted as markup, inserted as a page element, or run as script — and not the card's whole meta line, which also carries that item's SKU and price and does not belong in the reason the button is disabled. The button keeps its native `disabled` attribute, so it is not reachable by the Tab key; the description is instead heard when a screen-reader user reaches the button in browse mode — reading the page with the arrow keys — without separately reading the rest of the card first. This description SHALL be exposed as an accessible description associated with the button (for example, via `aria-describedby` referencing that stock text), not folded into the button's accessible name, so the name continues to name only the item exactly as `REQ-ORD-8` requires.

#### Scenario: the button is disabled at zero stock

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** that item's Order button is disabled

#### Scenario: the button is unaffected above zero stock

- **WHEN** the catalogue page renders an item card for an item with 1 or more in stock
- **THEN** that item's Order button is enabled, exactly as before this requirement

#### Scenario: the disabled state composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and a zero-stock item is among the remaining items
- **THEN** that item's Order button is still disabled after the re-render

#### Scenario: an item that drops to zero stock is disabled on the next render

- **WHEN** an accepted order (`REQ-ORD-1`) leaves an item at 0 stock and the item list refreshes afterward
- **THEN** that item's Order button is disabled in the refreshed render, even though it was enabled before the order

#### Scenario: the hint does not change what the server accepts

- **WHEN** an order for a zero-stock item reaches the server regardless — for example, from a client that does not honor the disabled state
- **THEN** the order is still rejected exactly as `REQ-ORD-2` requires, unaffected by this requirement

#### Scenario: the button's accessible name is unaffected

- **WHEN** an item card's Order button is disabled by this requirement
- **THEN** its accessible name still includes the item's name exactly as `REQ-ORD-8` requires

#### Scenario: the quantity input is unaffected

- **WHEN** an item card is rendered for a zero-stock item
- **THEN** that item's quantity input remains as enterable as before, carrying its existing `min`, `max` (`REQ-ORD-12`), and default value, unaffected by this requirement

#### Scenario: the disabled button's reason is reachable in browse mode

- **WHEN** the catalogue page renders an item card for an item with 0 in stock
- **THEN** its Order button carries an accessible description whose content is exactly that item's stock text, "0 in stock"
- **AND** that description is reachable by assistive technology when a screen-reader user reaches the button in browse mode — reading the page with the arrow keys — without needing to read any other part of the card first, even though the button's native `disabled` attribute keeps it out of the Tab order

#### Scenario: the reason reuses the card's existing stock text, not new wording

- **WHEN** an item card's Order button carries this accessible description
- **THEN** the description's content is exactly the stock text the card already displays as part of its meta line — "{n} in stock" — shown there as plain, inert text, rather than a newly introduced label or icon
- **AND** the description does not include the rest of that meta line — the item's SKU or its price are not part of it

#### Scenario: each out-of-stock item's description is its own stock text

- **WHEN** the catalogue page renders item cards for two or more items that are each at 0 stock at the same time
- **THEN** each of those items' Order buttons carries an accessible description that is that item's own stock text
- **AND** no item's button carries another item's description

#### Scenario: an enabled button carries no disabled-reason description

- **WHEN** the catalogue page renders an item card for an item with 1 or more in stock
- **THEN** that item's Order button is not disabled, so this requirement's accessible-description addition does not apply to it

#### Scenario: the description composes with search

- **WHEN** the catalogue list is narrowed by a search query (`REQ-CAT-3`) and a zero-stock item is among the remaining items
- **THEN** that item's Order button still carries its accessible description, exactly that item's own stock text, after the re-render

#### Scenario: an item that drops to zero stock gains the description on the next render

- **WHEN** an accepted order (`REQ-ORD-1`) leaves an item at 0 stock and the item list refreshes afterward
- **THEN** that item's Order button carries the accessible description, exactly that item's own stock text, in the refreshed render, even though it had none before the order

#### Scenario: the description does not change the button's accessible name

- **WHEN** an item card's Order button is disabled and carries this accessible description
- **THEN** the button's accessible name is unaffected and still includes only the item's name, exactly as `REQ-ORD-8` requires — the description is additional information, not a replacement for or an addition to the name

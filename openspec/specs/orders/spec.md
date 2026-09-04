# Orders Specification

## Purpose

An order takes units of one item out of stock in exchange for a total. Money is an integer in **minor units** (cents) — never a float.

This file is the source of truth for order behaviour. If the code and this file disagree, the code is wrong.

## Requirements

### Requirement: REQ-ORD-1 — place an order

`POST /api/orders` with `{"sku":"MUG-1","qty":2}` SHALL create an order.

#### Scenario: accepted order

- **WHEN** the order is accepted
- **THEN** the response is `201` with `{ id, sku, qty, total }`
- **AND** the item's stock has dropped by `qty`

#### Scenario: accepted order is listed

- **WHEN** the order is accepted
- **THEN** it appears in `GET /api/orders`

### Requirement: REQ-ORD-2 — stock is a hard limit

An order for more units than the item currently has in stock SHALL be rejected.

#### Scenario: over stock

- **WHEN** an item has 8 in stock and 12 are ordered
- **THEN** the response is `422` with `{"reason":"insufficient_stock"}`

### Requirement: REQ-ORD-3 — at most 20 units per order

An order for more than 20 units of an item SHALL be rejected, regardless of stock.

#### Scenario: over the limit

- **WHEN** 21 units are ordered
- **THEN** the response is `422` with `{"reason":"over_limit"}`

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

The page's order-outcome region SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that assistive technology announces its content automatically whenever it changes, without the user needing to move focus to it.

#### Scenario: success is announced

- **WHEN** an order is placed successfully
- **THEN** the confirmation message is written into the live region
- **AND** assistive technology announces it automatically

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

### Requirement: REQ-ORD-8 — the Order button names the item it orders

Each item card's Order button SHALL have an accessible name that includes the item's name, so that assistive technology distinguishes it from every other item's Order button instead of announcing plain "Order" with no context.

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

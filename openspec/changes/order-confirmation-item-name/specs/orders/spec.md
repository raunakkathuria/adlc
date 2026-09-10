## MODIFIED Requirements

### Requirement: REQ-ORD-7 — order outcome is announced to assistive technology

The page's order-outcome region SHALL be exposed as an ARIA live region (for example, `role="status"` or an equivalent `aria-live` announcement), so that assistive technology announces its content automatically whenever it changes, without the user needing to move focus to it. A successful order's confirmation message SHALL echo the ordered item's name alongside its `sku`, `qty`, and `total` — the same `{name} ({sku})` grouping the order history already uses (`REQ-ORD-10`) — so a shopper who does not recognize a SKU can still tell what they ordered without leaving the confirmation. Both that name and that SKU SHALL be inert text: no part of either SHALL be interpreted as markup, inserted as a page element, or run as script — the same guarantee already required for the search query (`REQ-CAT-6`), for the item card's own display of that name and SKU (`REQ-CAT-10`), for the Order button's accessible name and `data-sku` attribute (`REQ-ORD-8`), and for the order-history entry (`REQ-ORD-10`).

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

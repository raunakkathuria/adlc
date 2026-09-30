## 1. Tests first (through the API / `withServer`, per AGENTS.md)

- [ ] 1.1 Tests naming `REQ-CAT-13`: the page serves a labelled maximum-price field; scenarios for conversion, composition with search, invalid input refusal, empty states and summary wording, stale-response discard, order-refresh keeps the ceiling, failure message
- [ ] 1.2 Test naming `REQ-CAT-12` for the ceiling-applied zero-result case (not "The catalogue is empty.")
- [ ] 1.3 Watch them fail for the right reason

## 2. Implementation

- [ ] 2.1 Add the labelled maximum-price field to the catalogue page and wire it into the item-list request, the empty-state message, and the live-region summary

## 3. Verification

- [ ] 3.1 `npm run verify` green

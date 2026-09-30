## 1. Tests first

- [ ] 1.1 Add tests through the API/page harness naming `REQ-ORD-7` for each new scenario: cleared on query change (confirmation, rejection, not-sent), not cleared by the order's own refresh, first automatic search leaves the region empty, late-arriving outcome shown, later order announced after a clear. Watch them fail.

## 2. Implementation

- [ ] 2.1 Empty the order-outcome region when the query changes, and only then.

## 3. Verification

- [ ] 3.1 `npm run verify` is green.

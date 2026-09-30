## 1. Tests first (through the API / `withServer`, per AGENTS.md)

- [ ] 1.1 Tests naming `REQ-CAT-13`: a labelled maximum-price field; `10` requests `max_price=1000`; `10.50` requests `1050`; `19.99` requests `1999`; `1.15` requests `115`; `0.29` requests `29`; `0` requests `0`; `.5` requests `50`; `010` requests `1000`; ` 10 ` requests `1000`; composition with search; the exact refusal `Enter a maximum price such as 10 or 10.50.` for `abc`, `-1`, `1e3`, `10.505`, `£10`, `1,000`, and a 14-digit amount; `10.` and `.` send no request and announce no error; a refusal sets `aria-invalid="true"` and `aria-describedby` on the field; an in-flight response that arrives after a refusal is discarded; while the field is refused, a search change, an order refresh, and a retry omit `max_price` and leave the field message in place; empty-state and summary wording for a ceiling of `10`; a stale response from an earlier ceiling is discarded; an order refresh keeps the ceiling; a failed load is the failure message, not the ceiling empty state
- [ ] 1.2 Test naming `REQ-CAT-12`: a ceiling-applied zero result is not `The catalogue is empty.`; with no ceiling, an empty catalogue still says that, and the live region still says `Showing 0 items.`
- [ ] 1.3 Watch them fail for the right reason

## 2. Implementation

- [ ] 2.1 Add the labelled maximum-price field to the catalogue page and wire it into the item-list request, the empty-state message, the live-region summary, and the refusal state

## 3. Verification

- [ ] 3.1 `npm run verify` green

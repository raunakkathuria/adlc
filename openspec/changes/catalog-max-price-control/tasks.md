## 1. Tests first (through the API / `withServer`, per AGENTS.md)

- [ ] 1.1 Tests naming `REQ-CAT-13`: the field's accessible name is `Maximum price`; `10` requests `max_price=1000`; `10.5` and `10.50` request `1050`; `19.99` requests `1999`; `1.15` requests `115`; `0.29` requests `29`; `0` requests `0`; `.5` requests `50`; `010` requests `1000`; ` 10 ` and a non-breaking space before `10` request `1000`; composition with search; the exact refusal `Enter a maximum price such as 10 or 10.50.` for `abc`, `-1`, `1e3`, `10.505`, `£10`, `1,000`, a non-ASCII digit, and a 14-digit amount; `10.` and `.` send no request and announce no error; a refusal sets `aria-invalid="true"` and `aria-describedby` on the field; an automatic load still in flight when the shopper types `abc` is shown when it arrives, and the refusal stays; an order refresh still in flight when the shopper types `abc` updates the stock and does not re-announce the summary; editing `abc` back to `10.` clears the message beside the field and leaves the refusal sentence in the live region; while the field is incomplete or refused, a search change, an order refresh, and a retry carry the last applied ceiling (and omit `max_price` if none was applied), and an order placed during a refusal carries that ceiling, leaves the live region holding the refusal sentence, and keeps the field's message; a search change during a refusal that matches nothing uses the ceiling wording; a whitespace-only search with a ceiling of `10` and nothing left says `Nothing costs £10.00 or less.`; empty-state and summary wording for a ceiling of `10`; a stale response from an earlier ceiling is discarded; an order refresh keeps the ceiling; a failed load is the failure message, not the ceiling empty state
- [ ] 1.2 Test naming `REQ-CAT-9`: a ceiling that leaves nothing shows the ceiling message in place of the list, not as a list item
- [ ] 1.3 Test naming `REQ-CAT-12`: a ceiling-applied zero result is not `The catalogue is empty.`; with no ceiling, an empty catalogue still says that, and the live region still says `Showing 0 items.`
- [ ] 1.4 Watch them fail for the right reason

## 2. Implementation

- [ ] 2.1 Add the labelled maximum-price field to the catalogue page and wire it into the item-list request, the empty-state message, the live-region summary, and the refusal state

## 3. Verification

- [ ] 3.1 `npm run verify` green

## 1. Tests (red)

- [ ] 1.1 `REQ-ORD-9`: a rejection for one of the four reasons the page already maps (over the unit limit, insufficient stock, unknown SKU, invalid quantity) still shows that reason's existing specific wording
- [ ] 1.2 `REQ-ORD-9`: a rejection whose reason the page's mapping does not cover shows a plain-English message, not the raw reason identifier verbatim
- [ ] 1.3 `REQ-ORD-9`: a rejection whose response carries no reason at all shows a plain-English message, with no literal "undefined" or "null" in it
- [ ] 1.4 `REQ-ORD-9`: whichever message is shown — mapped or fallback — it is written into the order-outcome live region (REQ-ORD-7) and announced the same way

## 2. Implementation (green)

- [ ] 2.1 Replace the raw-reason fallback in the rejection-message lookup (`app/index.html`) with a generic, plain-English message
- [ ] 2.2 Guard the missing/undefined-reason case so it falls into the same generic message instead of interpolating it

## 3. Verification

- [ ] 3.1 `npm run verify` is green
- [ ] 3.2 `npm run req-coverage` shows REQ-ORD-9 covered

## 1. Tests (red)

- [ ] 1.1 `REQ-ORD-7`: the markup served for `/` exposes `#note` as an ARIA live region (`role="status"` or an equivalent `aria-live` announcement) — present from the initial page load, before any order is placed
- [ ] 1.2 `REQ-ORD-7`: a successful order's confirmation is written into that same live region
- [ ] 1.3 `REQ-ORD-7`: a rejected order's reason is written into that same live region
- [ ] 1.4 `REQ-ORD-7`: a second order's outcome replaces the live region's content rather than appending to it

## 2. Implementation (green)

- [ ] 2.1 Mark the `#note` element as an ARIA live region in the static markup, so it is in place before `note()` ever writes to it

## 3. Verification

- [ ] 3.1 `npm run verify` is green
- [ ] 3.2 `npm run req-coverage` shows REQ-ORD-7 covered

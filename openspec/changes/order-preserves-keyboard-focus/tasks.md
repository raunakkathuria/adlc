## 1. Tests first

- [ ] 1.1 Add tests named `REQ-ORD-15` through the page's served markup and script, following how existing page-behaviour tests do it, covering: Order button restored after accepted, rejected and not-sent orders; the right card among several; quantity input when the item reaches 0 stock; focus left alone when elsewhere; a stale refresh moving nothing; a markup-bearing SKU; no card or failed list requiring nothing; focus never on the outcome region. Watch them fail for the right reason.

## 2. Implementation

- [ ] 2.1 In the page, note before the refresh whether focus is on the ordered item's Order button, and after the refreshed list is rendered (not when discarded as stale) restore focus to that item's Order button, or to its quantity input when the button is disabled.
- [ ] 2.2 Find the item by its SKU exactly as stored, without building markup or selectors from it unescaped.

## 3. Verification

- [ ] 3.1 `npm run verify` is green, including requirement coverage for `REQ-ORD-15`.

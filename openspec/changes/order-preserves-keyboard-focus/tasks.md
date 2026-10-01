## 1. Tests first

- [ ] 1.1 Add tests named `REQ-ORD-15`, through the page's served markup and script, the way the other page tests do. Cover focus restored after an accepted order, a rejection, and an order that was not sent. Cover the right card among several, and the quantity input when stock hits 0. Cover focus left on another item's quantity input, and on another item's Order button (including one disabled at zero stock), which the refresh replaces. Cover a stale or withheld refresh moving nothing. Cover a query that changes and changes back leaving focus on the search field. Cover a markup-bearing SKU. Cover a missing card or a failed list not moving focus onto another button or the outcome region. Watch them fail for the right reason.

## 2. Implementation

- [ ] 2.1 Remember at the click that focus was on the ordered item's Order button. When that order's refreshed list is shown, restore focus to that button, or to its quantity input if the button is disabled. If the shopper moved focus to another control after the click, restore focus to that control's replacement in the refreshed list instead, never leaving it on the page body. Disabling the in-flight button is not that move. A discarded refresh restores nothing.
- [ ] 2.2 Find the item by its SKU exactly as stored, without building markup or selectors from it unescaped.

## 3. Verification

- [ ] 3.1 `npm run verify` is green, including requirement coverage for `REQ-ORD-15`.

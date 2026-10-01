## 1. Tests first

- [x] 1.1 Add tests naming `REQ-ORD-13` that fetch the page script via HTTP and assert a zero-stock input is disabled and described by its stock text, an in-stock input is enabled with no description, and the server still rejects a zero-stock order; confirm they fail

## 2. Implementation

- [x] 2.1 Disable the quantity input and give it the stock-text description at zero stock, including after a search re-render and after an order drops an item to zero

## 3. Verification

- [x] 3.1 Run `npm run verify` and confirm it is green

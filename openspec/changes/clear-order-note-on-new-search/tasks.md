## 1. Tests first

- [ ] 1.1 Add tests through the API/page harness naming `REQ-ORD-7` for each new scenario: a confirmation and a rejection are cleared when the trimmed query changes, and the region's text is already empty while the new items request is still pending; a not-sent message is not cleared; whitespace that leaves the trimmed query unchanged does not clear; the order's own refresh does not clear; the catalogue retry does not clear; the first automatic search leaves the region empty; a confirmation or rejection that arrives after the query changed is not written in, and the successful order is still in the history; a not-sent message that arrives after the query changed is written in and is not cleared by a later search; a query changed and reverted during the flight still shows the outcome; a withheld outcome leaves a showing not-sent message alone; the query compared is the trimmed field at the click; a not-sent message survives a second search; a withheld confirmation still reloads the history; a later order after a clear is announced. Watch them fail.

## 2. Implementation

- [ ] 2.1 Empty the order-outcome region when the trimmed query changes, except when it holds a not-sent message, and do not write an outcome that arrives after that change unless the order was not sent.

## 3. Verification

- [ ] 3.1 `npm run verify` is green.

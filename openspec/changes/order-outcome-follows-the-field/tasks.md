## 1. Tests

- [ ] 1.1 Tests naming `REQ-ORD-7`: a confirmation and a rejection are written only when the trimmed search field still holds the value it held when the Order button was operated; the query compared is that field, even when the cards still show an older search; a confirmation or rejection that arrives after the trimmed field changed is not written; if the field changes and changes back during the flight the outcome is shown; a withheld outcome leaves a showing not-sent message alone; a withheld confirmation still reloads the history, and the cards may still show the stock from before the order; a not-sent message that arrives after the change is shown and survives a second search until another order outcome replaces it.

- [ ] 1.2 A test naming `REQ-ORD-9`: a rejection message is written into the live region when it is shown, and a rejection that arrives after the trimmed field has changed is not shown.

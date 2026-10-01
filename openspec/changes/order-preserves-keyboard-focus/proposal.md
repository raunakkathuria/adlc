## Why now

Issue #122 (the same defect as the earlier #50, closed unfixed). After a shopper places an order from the keyboard, the page refreshes the item list, which removes the focused Order button from the page. Focus drops to the top of the document, so a keyboard or screen-reader user has to Tab from the start after every order. The issue is parked on `needs-human`; approving this spec is the confirmation it asks for.

## What changes for the user

- After an order, keyboard focus is still on the item they ordered. It returns to that item's Order button after the list refreshes. A disabled control cannot hold focus. If that button is disabled and the quantity input is still enabled — an order still in flight (`REQ-ORD-14`) — focus goes to the quantity input. If the order took the item's stock to zero, both the button and the quantity input are disabled (`REQ-ORD-13`), so focus goes to that item's card instead. The card is not an extra stop while tabbing through the catalogue.
- This applies whatever the order's outcome: confirmed, rejected, or not sent.
- Focus is put back from the click. A shopper who has moved to another control, such as another item's quantity input or the search field, is not pulled back, and their focus survives the refresh too: another item's quantity input or Order button is replaced by the refresh, so focus is put on its replacement rather than dropping to the page. Focus that leaves only because the button was disabled while the order was in flight (`REQ-ORD-14`) is still restored when the list is shown.
- Focus on any other control is left alone. Focus resting on no control at all, such as after a click on blank page space during the order, counts as lost rather than as a move, so it is restored to the ordered item.
- The outcome message is still announced through its live region (`REQ-ORD-7`). Focus does not move to it.

One new requirement, `REQ-ORD-15`, in the existing `orders` capability. It covers the page only, since there is no API change. No new capability directory.

## Out of scope

- **Pointer clicks that do not focus the button** (some browsers do not focus a button on click). There is no keyboard focus to lose, so nothing is restored.
- **The quantity field resetting to 1** after a refresh. That stays as it is. This delta only moves focus.
- **Focus after a refresh that fails.** When the item list cannot be loaded (`REQ-CAT-11`), no Order button exists to return to. This delta does not say where focus goes. The earlier decision to leave it unspecified still holds: the failure message and its retry control are the only things on screen.
- **Focus after searching, the maximum-price field, or retrying the catalogue load.** None of these removes a control the shopper was operating from the keyboard in the way an order does. The search and price fields are not part of the replaced list.
- **Moving focus to the outcome message** (an alternative the issue floats). The live region already announces it, and focus on the item is the less disruptive choice.
- **Changing when the in-flight button is disabled** (`REQ-ORD-14`). That disable can take the button out of the Tab order before the list refreshes. This delta treats that loss of focus as not the shopper moving on, and still restores focus when the refreshed list is shown.

Clicking blank page space leaves nothing focused. That is not a move to a control, so focus returns to the ordered item when the list is shown.

# Tasks

## REQ-CAT-7 — catalogue items region announces changes, proportionately

- [x] 1.1 Write a test asserting `#items` is served with `role="status"` (or an equivalent `aria-live` attribute) on first page load. Watch it fail against today's plain `<div id="items">`.
- [x] 1.2 Write a test asserting that a search transitioning the list to and from the empty state (`REQ-CAT-6`) writes its content inside that same live region.
- [x] 1.3 Write a test asserting that an order which changes a displayed item's stock also updates content inside that live region, independently of the `#note` outcome announcement (`REQ-ORD-7`).
- [x] 1.4 Write a test asserting that a list-change announcement (from a search or an order) states that the list changed and how many items now match, without reciting every displayed item's name, SKU, price, or stock. Assert against the full content of whatever element is marked for automatic announcement (its complete HTML or text, not an isolated summary fragment picked out by the test) — a test that only inspects a substring it expects to contain the summary cannot catch the full item list being announced alongside it. Watch it fail against an announcement that re-renders the full item markup into the live region.
- [x] 1.5 Write a test asserting that the full list's item details remain reachable in the page after a change — for a user navigating directly into the list — even though those same details are absent from the content that is automatically announced. This is a distinct assertion from 1.4: 1.4 checks the announcement excludes item details, this checks the list still has them.
- [x] 1.6 Write a test asserting that typing several characters into the search field in quick succession produces a single announcement once the query settles, not one announcement per keystroke. Watch it fail against today's per-keystroke `loadItems()` call re-announcing on every character.
- [x] 1.7 Add the live-region attribute to `#items` in `app/index.html`, make its announcement a concise summary (that the list changed and its new count) rather than the full re-rendered list, and coalesce rapid successive changes so only one announcement fires once results settle. The concise summary and the full item list SHALL be structured so that only the summary is delivered as the automatic announcement — putting both in the same announced boundary does not satisfy 1.4/1.5, even if the summary text itself is concise.

## REQ-CAT-8 — catalogue items are exposed as a list, as the page is actually presented

- [x] 2.1 Write a test asserting the catalogue exposes its items as a semantic list (native `<ul>`/`<li>` or `role="list"`/`role="listitem"`) when it holds more than one item. Watch it fail against today's bare `div.card` siblings.
- [x] 2.2 Write a test asserting the list structure survives a search that narrows the results to fewer items.
- [x] 2.3 Write a test asserting the list's item semantics are declared explicitly rather than relying solely on the default role a browser computes for the underlying elements, so that a presentation choice the page makes on that list (for example `list-style: none`) cannot cause assistive technology to lose the item count or navigation. Watch it fail against markup that depends only on native `<ul>`/`<li>` default roles.
- [x] 2.4 Wrap the rendered item cards in list/listitem markup in `app/index.html`, keeping the existing visual layout, choosing semantics that hold under the page's own styling rather than relying solely on the browser's default role for the underlying elements.

## REQ-CAT-9 — item names render as inert text everywhere they appear

- [x] 3.1 Write a test asserting an item name containing markup characters (e.g. a quote or `<`) displays as inert text in the visible name element, the quantity control's accessible name, and the Order button's accessible name — not parsed as markup. Watch it fail against today's unescaped `${item.name}` interpolation at all three sites.
- [x] 3.2 Write a test asserting a script-injection-shaped name (e.g. an `onerror` handler) does not run at any of the three sites.
- [x] 3.3 Escape `item.name` at all three interpolation sites in `app/index.html`, reusing the existing `escapeHtml` helper.

## REQ-ORD-9 — keyboard focus survives placing an order

- [x] 4.1 Write a test asserting that once an accepted order's re-render completes, focus is on an operable control belonging to the item just ordered rather than the document body. Watch it fail against today's `innerHTML` replacement, which drops focus to `<body>`.
- [x] 4.2 Write a test asserting the same holds when the order is rejected.
- [x] 4.3 Write a test asserting that ordering one item and then a second item, in a row, lets focus move from the first item's control to the second item's control without returning to the top of the page.
- [x] 4.4 Change `order()`/`loadItems()` in `app/index.html` so the item just ordered keeps or regains focus on one of its own controls after the list re-renders.

## Verification

- [x] 5.1 Run `npm run verify` and confirm every new test passes and requirement coverage is green for REQ-CAT-7, REQ-CAT-8, REQ-CAT-9, and REQ-ORD-9.

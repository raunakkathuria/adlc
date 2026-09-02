# The storefront page presents itself honestly to whoever is using it

## Why now

The line has filed the same handful of page defects five times over — #30, #41 and #51 are one defect reported three times, #32 and #29 were another — and every shipped fix triggers a fresh full-app audit that finds whatever is left. Issue #53 (with #52 folded in while it was being written) names four defects that are one behaviour: the catalogue page tells a sighted mouse user things it does not tell a screen-reader or keyboard user.

1. The catalogue list (`#items`) is a plain, silent container. When a search matches nothing, or an order changes an item's stock, the change is visible but never announced — a screen-reader user cannot tell an empty result from a page that did not respond. (#30, #41, #51)
2. The list has no list semantics — no item count, no way to navigate it as a list — so a screen-reader user has to walk it element by element. (#52)
3. Ordering replaces the whole list's markup, destroying the button the user just pressed. A keyboard user's focus falls back to the page body and they must tab from the top to reach the next item. (#50)
4. Item names are interpolated into the page unescaped, in three places. Today's seeded items don't contain a quote or an HTML metacharacter, so this is latent — but the catalogue is data, and #13 already established that user-visible text is rendered as inert text, not trusted. (#49)

This is one change, not four, because splitting it means four gate decisions and four more audits each filing whatever the last one left behind. After this change, an audit of the page should find nothing left to file on this theme.

## What changes for the user

Someone using a screen reader hears the catalogue announce itself: an empty search result, a stock count that changed after an order, and the size of the list itself, all read automatically instead of silently. They can navigate the catalogue as a list, the way a sighted user sees it as one. A keyboard user who places an order keeps their place afterward instead of landing back at the top of the page. And no item's name — however it's spelled — can break out of the page's markup or run as script.

Nothing changes for a sighted mouse user: the page looks the same, and the ordering rules (`REQ-ORD-1` through `REQ-ORD-6`) are untouched.

## Out of scope

- A browser-level test suite — there is no Playwright station yet (#15); the deterministic gate covers what it can through the API and DOM-stub tests, and the quality station's audit is the check on the rest.
- A general HTML-escaping policy for every field the product might ever render — only the item name, the site named in #49.
- Any change to search (`REQ-CAT-3`), the price filter (`REQ-CAT-4`), or the ordering rules (`REQ-ORD-1`–`REQ-ORD-6`) themselves — only how the page presents them.
- The search field's accessible name (`REQ-CAT-5`), the empty-state query escaping (`REQ-CAT-6`), the order-outcome live region (`REQ-ORD-7`), and the Order button's accessible name (`REQ-ORD-8`) already shipped and need no change here.

## Open question

When the item just ordered is no longer present once the list re-renders — for example, the search box was edited to a query that no longer matches it while the order request was still in flight — where should focus land? The requirement below only pins down the common case (the item stays visible, which it always does today since the page never filters by stock). A human can pick one line at Gate 1: leave it to the implementation's judgement (e.g. the search field, or the first remaining item), or specify it now.

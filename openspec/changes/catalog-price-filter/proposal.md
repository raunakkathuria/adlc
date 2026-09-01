# Let shoppers narrow the catalog by price

## Why now

Two of the three questions support fields about the catalog are variants of "what have you got under a tenner" — and today the only answer is to read the whole list by hand. Issue #4 asks for a price ceiling shoppers can apply themselves, composed with the existing search so "notebook under £10" is one query instead of two.

## What changes for the user

`GET /api/items` accepts a new `max_price` query parameter, in the same minor-units (cents) representation the API already returns for `price`. Adding it narrows the list to items priced at or below that ceiling. It composes with the existing `q` search (REQ-CAT-3): supplying both narrows to items that satisfy both at once. Leaving `max_price` off behaves exactly as it does today.

A `max_price` that isn't a non-negative whole number of cents is refused with a `400` and a reason, the same way the rest of this API refuses bad input — it never fails silently or falls back to "show everything."

## Out of scope

- A minimum-price filter or a price *range* (two bounds). The issue asks only for a ceiling; nothing today asks for a floor.
- Sorting the list by price.
- Accepting price in pounds/major units (e.g. `"10.00"`) at the query string. The API already speaks cents everywhere else (`price` in every item response); the filter matches that.

## Open question

The issue's own wording pulls two ways: support hears shoppers ask for things "**under** a tenner" (strictly less than £10), but the feature ask itself says "everything **up to** £10" (£10 included). This delta specifies the boundary item — priced at exactly `max_price` — as **included** ("up to" is the literal ask). If Gate 1 wants the boundary excluded instead, that's a one-line change to REQ-CAT-4 before build starts.

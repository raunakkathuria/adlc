# Let shoppers narrow the catalog by price

## Why now

Two of the three questions support fields about the catalog are variants of "what have you got under a tenner" — and today the only answer is to read the whole list by hand. Issue #4 asks for a price ceiling shoppers can apply themselves, composed with the existing search so "notebook under £10" is one query instead of two.

## What changes for the user

`GET /api/items` accepts a new `max_price` query parameter, in the same minor-units (cents) representation the API already returns for `price`. Adding it narrows the list to items priced at or below that ceiling. It composes with the existing `q` search (REQ-CAT-3): supplying both narrows to items that satisfy both at once. Leaving `max_price` off behaves exactly as it does today.

A `max_price` that isn't a non-negative whole number of cents — including an empty value, e.g. `?max_price=` — is refused with a `400` and a reason, the same way the rest of this API refuses bad input — it never fails silently or falls back to "show everything."

The boundary is inclusive: an item priced at exactly `max_price` is returned, matching the literal ask of "everything up to £10."

## Out of scope

- A minimum-price filter or a price *range* (two bounds). The issue asks only for a ceiling; nothing today asks for a floor.
- Sorting the list by price.
- Accepting price in pounds/major units (e.g. `"10.00"`) at the query string. The API already speaks cents everywhere else (`price` in every item response); the filter matches that.

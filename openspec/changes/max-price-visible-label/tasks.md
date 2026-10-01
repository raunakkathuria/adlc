## 1. Tests first

- [x] 1.1 Add a failing test naming `REQ-CAT-15` that fetches the page and asserts a visible (not visually hidden) `Maximum price` label is associated with the maximum price field, apart from its placeholder
- [x] 1.2 Add a test naming `REQ-CAT-15` that the field's accessible name is still exactly `Maximum price`, the search field's `Search the catalogue` label is unchanged, and each label is tied to its own field, and the price label has the search label's styling and the two fields are bottom-aligned

## 2. Implementation

- [x] 2.1 Add the visible label to the catalogue page's maximum price field, keeping the placeholder, accessible name and refusal message behaviour

## 3. Verification

- [x] 3.1 `npm run verify` is green

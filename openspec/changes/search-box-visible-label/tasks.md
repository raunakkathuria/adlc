## 1. Tests first

- [x] 1.1 Add a failing test naming `REQ-CAT-14` that fetches the page and asserts a visible (not visually hidden) `Search the catalogue` label is associated with the search field, apart from its placeholder, and that the field's accessible name still contains that text
- [x] 1.2 Add a test naming `REQ-CAT-14` that the maximum price field's accessible name is still exactly `Maximum price`

## 2. Implementation

- [x] 2.1 Add the visible label to the catalogue page's search field, keeping the placeholder and the accessible name

## 3. Verification

- [x] 3.1 `npm run verify` is green

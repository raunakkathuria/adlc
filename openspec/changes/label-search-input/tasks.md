## 1. Test first

- [ ] 1.1 Write a test that fetches the storefront page over HTTP and asserts the search input (`#q`) has an accessible name that does not come from `placeholder` alone (e.g. a `<label for="q">` or `aria-label` is present) — name it `REQ-CAT-4` per the coverage gate
- [ ] 1.2 Run the test and confirm it fails against today's markup, for the reason described in the issue (red)

## 2. Fix

- [ ] 2.1 Give the search control in `app/index.html` an accessible name, independent of its placeholder
- [ ] 2.2 Confirm the placeholder's example-query text is still visibly rendered

## 3. Verify

- [ ] 3.1 Run `npm run verify` and confirm the new test is green and `REQ-CAT-4` is covered
- [ ] 3.2 Confirm the existing `REQ-CAT-3` search tests still pass unchanged

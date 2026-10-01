## ADDED Requirements

### Requirement: REQ-CAT-14 — the search field has a visible label that does not depend on its placeholder

The catalogue page SHALL show the text `Search the catalogue` as a visible label for the search field, at all times: before anything is typed, while the shopper types, and after. The label is page text, not the field's placeholder and not its value, so typing never removes or replaces it. The label SHALL NOT be visually hidden. The label's text is fixed; it never contains the search query or any other user-supplied text. The field's accessible name (`REQ-CAT-5`) SHALL contain the visible label's text, so what a shopper reads is what assistive technology and speech control call the field. The placeholder hint (`REQ-CAT-5`) is still shown while the field is empty. This requirement changes only what the page displays: search matching (`REQ-CAT-3`), the search summary (`REQ-CAT-7`), and the empty-state messages (`REQ-CAT-6`, `REQ-CAT-12`, `REQ-CAT-13`) are unaffected. The label's size, colour, spacing and position relative to the field, and how the search field and the maximum price field are aligned with each other, are presentation choices this requirement does not fix; the one constraint on them is that the label is shown, not hidden. The API and every other surface inherit nothing from it.

#### Scenario: the label is visible before typing

- **WHEN** the catalogue page loads and the search field is empty
- **THEN** the page shows the text `Search the catalogue` as a label for the search field, and it is not visually hidden

#### Scenario: the label survives typing

- **WHEN** the shopper types into the search field, so the placeholder is no longer displayed
- **THEN** the text `Search the catalogue` is still shown as the field's label

#### Scenario: the label is tied to the field

- **WHEN** the shopper activates the visible label
- **THEN** focus moves to the search field

#### Scenario: the visible label and the accessible name agree

- **WHEN** assistive technology reports the search field's accessible name
- **THEN** that name contains the text `Search the catalogue` (`REQ-CAT-5` still holds)

#### Scenario: the placeholder still displays

- **WHEN** the search field is empty
- **THEN** its placeholder hint is shown alongside the label, as `REQ-CAT-5` requires

#### Scenario: the label never carries the query

- **WHEN** the shopper types any text, including characters that would be read as markup
- **THEN** the label's text is still exactly `Search the catalogue`, and nothing the shopper typed appears in it

#### Scenario: composes with the maximum price field

- **WHEN** the catalogue page is shown with both the search field and the maximum price field (`REQ-CAT-13`)
- **THEN** the search field's visible label does not change the maximum price field's accessible name, which stays exactly `Maximum price`

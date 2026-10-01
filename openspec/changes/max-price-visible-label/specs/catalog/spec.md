## ADDED Requirements

### Requirement: REQ-CAT-15 — the maximum price field has a visible label that does not depend on its placeholder

The catalogue page SHALL show the text `Maximum price` as a visible label for the maximum price field (`REQ-CAT-13`), at all times: before anything is typed, while the shopper types, and after. The label is page text, not the field's placeholder and not its value, so typing never removes or replaces it. The label SHALL NOT be visually hidden. The label's text is fixed; it never contains the entered price or any other user-supplied text. It is the same text as the field's accessible name, which stays exactly `Maximum price` (`REQ-CAT-13`). The placeholder hint is still shown while the field is empty. This requirement changes only what the page displays: price parsing, the incomplete and refused states, the refusal message and its `aria-describedby` / `aria-invalid` state, and every summary and empty-state wording (`REQ-CAT-13`) are unaffected, and the refusal message is not part of the label. The label is presented the way the search field's label is (`REQ-CAT-14`): the same text size and colour, shown above its field. The maximum price field sits beside the search field with the two input boxes lined up along their bottom edges, so a label on one does not push the other's box out of line. Beyond that, exact sizes and spacing are not fixed; the constraint that matters is that the label is shown. The API inherits nothing from it.

#### Scenario: the label is visible before typing

- **WHEN** the catalogue page loads and the maximum price field is empty
- **THEN** the page shows the text `Maximum price` as a label for the field, and it is not visually hidden

#### Scenario: the label survives typing

- **WHEN** the shopper types into the maximum price field, so the placeholder is no longer displayed
- **THEN** the text `Maximum price` is still shown as the field's label

#### Scenario: the label is tied to the field

- **WHEN** the shopper activates the visible label
- **THEN** focus moves to the maximum price field

#### Scenario: the visible label and the accessible name agree

- **WHEN** assistive technology reports the maximum price field's accessible name
- **THEN** that name is exactly `Maximum price`, equal to the visible label's text (`REQ-CAT-13` still holds)

#### Scenario: the placeholder still displays

- **WHEN** the maximum price field is empty
- **THEN** its placeholder hint is shown alongside the label

#### Scenario: the label is unchanged by a refused value

- **WHEN** the shopper enters a refused value such as `abc` (`REQ-CAT-13`)
- **THEN** the label's text is still exactly `Maximum price`, and the refusal message appears next to the field as `REQ-CAT-13` requires, separate from the label

#### Scenario: the label never carries the entered text

- **WHEN** the shopper types any text, including characters that would be read as markup
- **THEN** the label's text is still exactly `Maximum price`, and nothing the shopper typed appears in it

#### Scenario: composes with the search field's label

- **WHEN** the page shows both fields
- **THEN** each has its own visible label, `Search the catalogue` (`REQ-CAT-14`) and `Maximum price`, and activating one label focuses only its own field

#### Scenario: the price label looks like the search label

- **WHEN** the page shows both fields
- **THEN** the `Maximum price` label has the same text size and colour as the `Search the catalogue` label and is shown above its field, and the two input boxes are lined up along their bottom edges

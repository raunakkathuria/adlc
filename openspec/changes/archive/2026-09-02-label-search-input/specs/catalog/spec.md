## ADDED Requirements

### Requirement: REQ-CAT-5 — the search field has an accessible name independent of its placeholder

The catalogue page's search input SHALL have an accessible name that assistive technology can read, and that name SHALL NOT depend solely on the `placeholder` attribute.

#### Scenario: accessible name is available before any input

- **WHEN** the catalogue page loads and focus lands on the search field, before anything has been typed
- **THEN** assistive technology reports an accessible name for the field (for example, via an associated `<label>` or an `aria-label`)

#### Scenario: accessible name survives typing

- **WHEN** someone types into the search field, replacing its placeholder text
- **THEN** the field's accessible name is unchanged — it does not disappear or become blank

#### Scenario: the placeholder hint still displays

- **WHEN** the search field is empty
- **THEN** its placeholder text is still shown as a visual hint, unaffected by this requirement

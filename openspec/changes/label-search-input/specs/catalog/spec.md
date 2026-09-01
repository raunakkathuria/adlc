## ADDED Requirements

### Requirement: REQ-CAT-4 — the catalogue search control has an accessible name

The page's catalogue search control SHALL expose an accessible name to assistive technology, and that name SHALL NOT depend solely on its placeholder text.

#### Scenario: accessible name is announced

- **WHEN** assistive technology reaches the catalogue search control
- **THEN** it reports an accessible name describing the control's purpose, sourced from something other than the placeholder alone

#### Scenario: placeholder hint is unaffected

- **WHEN** a sighted user views the empty catalogue search control
- **THEN** the placeholder's example queries are still visible, unchanged from before this control had an accessible name

#### Scenario: search behaviour is unaffected

- **WHEN** a user types a query into the catalogue search control
- **THEN** the results still narrow exactly as specified by REQ-CAT-3

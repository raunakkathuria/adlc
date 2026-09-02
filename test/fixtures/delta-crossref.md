## ADDED Requirements

### Requirement: REQ-CAT-7 — the only requirement this delta claims

`GET /api/items?thing={x}` SHALL do something, composing with the search query (`q`, REQ-CAT-3).

#### Scenario: absent thing behaves as today

- **WHEN** the thing is absent
- **THEN** every item is returned, as in REQ-CAT-1, unaffected by this requirement

#### Scenario: composes with search

- **WHEN** both are supplied
- **THEN** only items matching `q` (REQ-CAT-3) and the thing are returned

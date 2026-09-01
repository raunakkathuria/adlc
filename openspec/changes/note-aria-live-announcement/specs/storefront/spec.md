## ADDED Requirements

### Requirement: REQ-STORE-1 — order feedback is announced to assistive technology

The region that reports the outcome of an order action (placed, or rejected) SHALL be exposed to assistive technology as a live region — present in the page from load, so that a message written into it is announced automatically, without the user needing to move focus to it.

#### Scenario: a successful order is announced

- **WHEN** an order is placed successfully and its confirmation message is written into the feedback region
- **THEN** the region is marked up as a live region (an accessibility role or attribute that causes assistive technology to announce content changes automatically), and was already so marked before the message appeared

#### Scenario: a rejected order is announced

- **WHEN** an order is rejected, for any reason, and its rejection message is written into the feedback region
- **THEN** the message is announced the same way as a successful order — the live-region behaviour does not depend on which outcome occurred

#### Scenario: one message replacing another is announced

- **WHEN** a new order attempt writes a message into the feedback region while it already holds a message from a previous attempt
- **THEN** the new message is announced — the live region announces the current content each time it changes, not only when it goes from empty to non-empty

#### Scenario: clearing the region announces nothing new

- **WHEN** the feedback region is emptied without a new message being written
- **THEN** no announcement is required — this requirement governs messages being added, not the region's mere presence

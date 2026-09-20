## ADDED Requirements

### Requirement: REQ-BKT-1 — one documented Jev request per fixture, carrying only that fixture's decision-time state

For each fixture in the reviewed historical set, the backtest tool SHALL send exactly one HTTP request to the documented Jev endpoint (`POST https://api.typesafe.ai/v1/systemone`), carrying that fixture's own new-issue text, the living-spec text and existing-issue listing recorded for that fixture, and the two independent questions (`route`, `existing_issue_match`) with their documented criteria. The request SHALL NOT ask Jev to produce a slug or a `requirements` list — those continue to be derived by the deterministic code that already exists (a slug from the title, regex-checked), unchanged by this delta.

#### Scenario: one request per fixture, carrying that fixture's own state

- **WHEN** the tool processes a fixture
- **THEN** exactly one request is sent for it, and that request's `state` carries that fixture's own recorded new-issue text, living-spec text, and existing-issue listing — not another fixture's

#### Scenario: decision-time state, not today's

- **WHEN** a fixture's recorded living-spec text or existing-issue listing differs from what is on disk today
- **THEN** the request sent for that fixture carries the fixture's own recorded state, unaffected by what the tool would find if it read `openspec/specs/` or the issue tracker directly

#### Scenario: no slug or requirements are requested

- **WHEN** the tool builds a request for any fixture
- **THEN** the request's `questions` object contains no question asking for a slug or a `requirements` list

### Requirement: REQ-BKT-2 — a fixture missing required decision-time fields is refused, not silently skipped

A fixture SHALL carry its new-issue text, its living-spec text, its existing-issue listing (each existing issue's status among open, closed-shipped, closed-not-planned, or closed-not-reproducible), and the human-reviewed expected route and duplicate/recurrence outcome used to score it. When a fixture is missing any of these, the tool SHALL refuse to run the backtest and report which fixture and which field is missing, rather than skipping that fixture silently or substituting a default.

#### Scenario: a fixture missing the expected outcome is refused

- **WHEN** a fixture carries no human-reviewed expected route or duplicate/recurrence outcome
- **THEN** the tool refuses to run, and names that fixture and the missing field, rather than scoring it against a guessed expectation

#### Scenario: a fixture missing issue text, spec text, or the existing-issue listing is refused

- **WHEN** a fixture is missing its new-issue text, its living-spec text, or its existing-issue listing
- **THEN** the tool refuses to run, and names that fixture and the missing field, rather than sending Jev a request built from an empty or partial state

#### Scenario: a complete fixture set proceeds

- **WHEN** every fixture carries all of the required fields
- **THEN** the tool proceeds to send requests, unaffected by this requirement

### Requirement: REQ-BKT-3 — the route and duplicate answers combine into one candidate verdict, by the documented policy

Given Jev's answers to `route` and `existing_issue_match` for a fixture, the tool SHALL derive one candidate verdict:

- an `existing_issue_match` naming an issue whose fixture status is open SHALL produce a `duplicate` candidate verdict referencing that issue, regardless of the `route` answer;
- an `existing_issue_match` naming an issue whose fixture status is closed-not-reproducible SHALL produce a `recurrence` candidate verdict referencing that issue, regardless of the `route` answer;
- an `existing_issue_match` naming an issue whose fixture status is closed-shipped SHALL produce an `already_done` candidate verdict referencing that issue, regardless of the `route` answer;
- an `existing_issue_match` naming an issue whose fixture status is closed-not-planned SHALL NOT block the candidate verdict; it comes from `route` alone, exactly as if `existing_issue_match` had been `none`;
- an `existing_issue_match` of `none` SHALL leave the candidate verdict to come from `route` alone;
- when nothing above overrides it, the candidate verdict SHALL be the `route` answer itself (one of `bug`, `feature`, `chore`, `docs`, `question`, `already_done`, `out_of_scope`, `too_thin`, or `spam`).

#### Scenario: an open match produces duplicate regardless of route

- **WHEN** `existing_issue_match` names an issue whose fixture status is open, whatever `route` answered
- **THEN** the candidate verdict is `duplicate`, referencing that issue

#### Scenario: a not-reproducible match produces recurrence regardless of route

- **WHEN** `existing_issue_match` names an issue whose fixture status is closed-not-reproducible, whatever `route` answered
- **THEN** the candidate verdict is `recurrence`, referencing that issue

#### Scenario: a shipped match produces already_done regardless of route

- **WHEN** `existing_issue_match` names an issue whose fixture status is closed-shipped, whatever `route` answered
- **THEN** the candidate verdict is `already_done`, referencing that issue

#### Scenario: a not-planned match does not block route

- **WHEN** `existing_issue_match` names an issue whose fixture status is closed-not-planned
- **THEN** the candidate verdict is the `route` answer, exactly as if `existing_issue_match` had been `none`

#### Scenario: no match leaves route to decide

- **WHEN** `existing_issue_match` is `none`
- **THEN** the candidate verdict is the `route` answer

### Requirement: REQ-BKT-4 — confidence, probabilities, latency, and token usage are recorded for every fixture, ungated

For every fixture the tool sends a request for, it SHALL record: each question's selected option, every option's probability, each question's `confidence`, the request's latency, and the API-reported token usage. This recording SHALL happen unconditionally — no confidence threshold set by this delta suppresses recording the candidate verdict (`REQ-BKT-3`) or its supporting data, however low that confidence is. This delta defines no live-routing threshold; deriving proposed limits from this recorded data for the report is `REQ-BKT-7`'s concern, not this one's.

#### Scenario: a low-confidence answer is recorded like any other

- **WHEN** Jev answers a fixture's questions with a low `confidence`
- **THEN** the tool records that fixture's candidate verdict, probabilities, confidence, latency, and token usage exactly as it would for a high-confidence answer

#### Scenario: every fixture's record carries the same fields

- **WHEN** the tool completes a run over the fixture set
- **THEN** every scored fixture's record carries a candidate verdict, both questions' confidence, latency, and token usage — none omitted because of the answer's confidence

### Requirement: REQ-BKT-5 — transient failures retry, terminal failures park the fixture, and nothing is guessed

On an HTTP `429` or `529` response, the tool SHALL retry the request, with each retry's delay bounded and increasing over the previous attempt, up to a bounded number of attempts. On an authentication failure, a validation failure (the request rejected as malformed), a timeout, or exhaustion of the bounded retries, the tool SHALL record that fixture as parked — with the failure kind, and no candidate verdict — rather than substituting a guessed verdict. A parked fixture SHALL NOT stop the run: the tool SHALL continue to the remaining fixtures.

#### Scenario: a 429 or 529 is retried, then succeeds

- **WHEN** a request receives a `429` or `529` and a subsequent retry receives a successful response
- **THEN** the fixture is recorded with the candidate verdict from that successful response, not as parked

#### Scenario: retries are bounded and increasing

- **WHEN** a request receives repeated `429` or `529` responses
- **THEN** the tool retries with delays that increase over the previous attempt, up to a bounded number of attempts, rather than retrying forever or at a constant interval

#### Scenario: exhausted retries park the fixture

- **WHEN** every bounded retry attempt for a fixture also receives a `429` or `529`
- **THEN** that fixture is recorded as parked, with no candidate verdict, rather than the tool guessing one

#### Scenario: authentication, validation, or timeout failures park the fixture

- **WHEN** a request fails with an authentication failure, a validation failure, or a timeout
- **THEN** that fixture is recorded as parked, with no candidate verdict

#### Scenario: a parked fixture does not stop the run

- **WHEN** one fixture is parked, whether by a terminal failure or exhausted retries
- **THEN** the tool proceeds to send requests for the remaining fixtures, unaffected by the earlier parked fixture

### Requirement: REQ-BKT-6 — the backtest never mutates live issue state

Running the backtest tool, over any number of fixtures, SHALL NOT relabel, close, reopen, or comment on any GitHub issue, and SHALL NOT dispatch any issue to another station. Its only effects are sending Jev requests and producing its own recorded results and report.

#### Scenario: a run that completes touches no issue

- **WHEN** the tool runs to completion over the fixture set
- **THEN** no issue anywhere is relabeled, closed, reopened, commented on, or dispatched to another station as a result

#### Scenario: a candidate verdict that would close or redirect is only recorded, never executed

- **WHEN** a fixture's candidate verdict (`REQ-BKT-3`) is one that, in production, would close or redirect an issue — `duplicate`, `recurrence`, `already_done`, or a not-actionable `route` answer
- **THEN** that outcome exists only in the tool's recorded results and report, never as an action taken against a real issue

### Requirement: REQ-BKT-7 — a segmented report with derived confidence limits and a go/no-go recommendation

Once every fixture has been scored, the tool SHALL produce one report that states: accuracy segmented by route type (bug, feature, chore, docs), by duplicate/recurrence/already-shipped outcome, by not-actionable reason, and by confidence band; a false-closure count and a false-forward-routing count, kept separate; latency and API-reported token usage; two distinct proposed confidence limits derived from the recorded data — one for closing or redirecting an issue, higher than the other, which is for forwarding actionable work to another station; and an explicit go or no-go recommendation for a production rollout.

A fixture's candidate verdict disagrees with its expected outcome (`REQ-BKT-2`) in one of two ways: the candidate would close or redirect an issue that the expected outcome says was actionable work (a false closure), or the candidate would forward as actionable work an issue the expected outcome says should have closed or redirected (false forward routing). These SHALL be counted separately, never combined into one disagreement count, because a maintainer weighs the two differently when setting the two limits this requirement calls for.

#### Scenario: accuracy is segmented, not only overall

- **WHEN** the report is generated over a scored fixture set
- **THEN** it states accuracy broken out by route type, by duplicate/recurrence/already-shipped outcome, by not-actionable reason, and by confidence band, not only a single overall number

#### Scenario: false closure and false forward routing are counted separately

- **WHEN** the scored fixture set contains at least one fixture where the candidate verdict disagrees with the expected outcome
- **THEN** the report states a false-closure count and a false-forward-routing count as two separate figures, not combined into one

#### Scenario: two distinct limits are proposed, closure's higher than forwarding's

- **WHEN** the report proposes its confidence limits
- **THEN** it names one limit for closing or redirecting an issue and a separate, lower limit for forwarding actionable work, both derived from the recorded data rather than copied from documentation examples

#### Scenario: the report ends with an explicit recommendation

- **WHEN** the report is complete
- **THEN** it states an explicit go or no-go recommendation for a production rollout, not left implicit in the segmented numbers alone

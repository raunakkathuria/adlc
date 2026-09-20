## 1. Fixtures

- [ ] 1.1 Define the fixture shape (new-issue text, living-spec text, existing-issue listing with each issue's status, human-reviewed expected route and duplicate/recurrence outcome) required by `REQ-BKT-2`
- [ ] 1.2 Write representative test fixtures covering each branch of `REQ-BKT-3`'s policy (open match, not-reproducible match, shipped match, not-planned match, no match) and at least one fixture missing a required field
- [ ] 1.3 A human reviews and labels all 35 historical issues with their correct route and duplicate/recurrence match, using the living spec and existing-issue state as it stood when each issue arrived, and adds them as fixtures — this is the reviewed set the tool is ultimately run against, not itself machine-testable

## 2. Tests (red)

- [ ] 2.1 `REQ-BKT-1`: a request is built per fixture, carrying that fixture's own recorded new-issue text, living-spec text, and existing-issue listing, and asks no question for a slug or `requirements`
- [ ] 2.2 `REQ-BKT-1`: a fixture's recorded state is used even when it differs from what's on disk today
- [ ] 2.3 `REQ-BKT-2`: a fixture missing its expected outcome, its issue text, its spec text, or its existing-issue listing is refused, naming the fixture and field
- [ ] 2.4 `REQ-BKT-2`: a complete fixture set proceeds
- [ ] 2.5 `REQ-BKT-3`: each of the five `existing_issue_match` branches (open, not-reproducible, shipped, not-planned, none) produces the documented candidate verdict
- [ ] 2.6 `REQ-BKT-4`: a low-confidence answer is recorded with the same fields as a high-confidence one; every scored fixture's record carries a candidate verdict, confidence, latency, and token usage
- [ ] 2.7 `REQ-BKT-5`: a `429`/`529` retried into a success is not parked; retries increase and are bounded; exhausted retries park the fixture; auth/validation/timeout failures park the fixture; a parked fixture does not stop the run
- [ ] 2.8 `REQ-BKT-6`: a full run makes no call that relabels, closes, reopens, comments on, or dispatches any issue; a closing/redirecting candidate verdict is recorded only, never executed
- [ ] 2.9 `REQ-BKT-7`: the report segments accuracy by route, duplicate outcome, not-actionable reason, and confidence band; counts false closure and false forward routing separately; proposes two distinct limits with closure's higher; and ends with an explicit go/no-go recommendation

## 3. Implementation (green)

- [ ] 3.1 Fixture loader and validator (`REQ-BKT-2`)
- [ ] 3.2 Request builder from a fixture's recorded decision-time state (`REQ-BKT-1`)
- [ ] 3.3 Route/duplicate combination policy (`REQ-BKT-3`)
- [ ] 3.4 Per-fixture result recording: candidate verdict, probabilities, confidence, latency, token usage (`REQ-BKT-4`)
- [ ] 3.5 Retry with bounded, increasing backoff on `429`/`529`; parking on authentication, validation, timeout, or exhausted retries; continuation past a parked fixture (`REQ-BKT-5`)
- [ ] 3.6 No path in the tool calls anything that mutates a live issue — no dependency on `scripts/labels.mjs`, the `gh` CLI, or any GitHub write endpoint (`REQ-BKT-6`)
- [ ] 3.7 Report generator: segmentation, false-closure/false-forward-routing counts, derived limits, go/no-go line (`REQ-BKT-7`)

## 4. Run and verify

- [ ] 4.1 Run the tool over the reviewed 35-issue fixture set (from 1.3) against the live Jev API
- [ ] 4.2 `npm run verify` is green and every `REQ-BKT-*` id is covered
- [ ] 4.3 Confirm no historical issue was relabeled, closed, reopened, commented on, or dispatched during the run
- [ ] 4.4 Record the report's go/no-go recommendation

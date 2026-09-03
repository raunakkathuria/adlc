# Running the line on another model

The demo runs on Claude keys, because CI has to pin one CLI to be reproducible. Nothing else in the line is tied to Anthropic: the station prompts in [`prompts/`](../prompts/) are plain markdown with no vendor in them, the deterministic gate has no model in it at all, and [`scripts/run-station.sh`](../scripts/run-station.sh) is the only file that names a runner's own variables.

So pointing the line at a different model is two repository variables. No prompt changes, no workflow changes, no fork.

## The two variables

Set these as **repository variables** (Settings → Secrets and variables → Actions → *Variables*), not secrets — they are not sensitive, and being able to read them back is the point:

| Variable | What it is | Example |
|---|---|---|
| `ADLC_BASE_URL` | any endpoint that speaks the Anthropic messages API | `http://litellm.internal:4000` |
| `ADLC_MODEL` | the model id **that endpoint** knows | `gpt-5`, `gemini-2.5-pro`, `frontier` |

Your existing credential secret (`ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`) then authenticates against *the gateway* instead of against Anthropic. Put the gateway's key in it. The off-switch does not change: with neither secret set, every workflow still runs, explains itself, and stops.

Leave both variables unset and nothing moves. That is the demo's configuration, and it is why this costs nothing to carry.

If you adopted the line with the callers in [`.github/workflows/callers/`](../.github/workflows/callers/), set the variables on **your** repository, not on this one. Inside a called workflow the `vars` context resolves to the calling repository's variables, so your values are what the stations see. Verified on a real adopting repo: a variable set only on the consumer arrived intact inside the hub's station.

## Why a gateway, and not a second CLI

Claude Code is pinned in CI, and it talks one protocol. A gateway translates that protocol to whatever a provider speaks, which means one integration instead of one per vendor. [LiteLLM](https://github.com/BerriAI/litellm) is the usual choice; anything Anthropic-compatible works, including vLLM and a model on your own hardware.

The trade is real and worth stating: you gain provider choice and lose the runner's own knowledge of the model it is driving. Claude Code will say `unrecognized_model` for an id outside its catalog and assume a 200k context window. Set `CLAUDE_CODE_MAX_CONTEXT_TOKENS` to the real window if the model has more.

## A worked LiteLLM setup

`litellm.yaml` — one entry per model the line may ask for. The `model_name` is what `ADLC_MODEL` names; `litellm_params.model` is the real backend:

```yaml
model_list:
  - model_name: frontier              # what ADLC_MODEL says
    litellm_params:
      model: openai/gpt-5             # what actually runs
      api_key: os.environ/OPENAI_API_KEY
  - model_name: economy
    litellm_params:
      model: gemini/gemini-2.5-flash
      api_key: os.environ/GEMINI_API_KEY
```

Naming the entries by role rather than by model is worth the small indirection: retuning which model the line uses becomes a one-line edit here, and the repository variable never changes.

Run it:

```bash
docker run -d -p 4000:4000 \
  -v "$PWD/litellm.yaml:/app/config.yaml:ro" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e LITELLM_MASTER_KEY="$LITELLM_MASTER_KEY" \
  ghcr.io/berriai/litellm:v1.77.3-stable --config /app/config.yaml --port 4000
```

Then set `ADLC_BASE_URL` to the proxy's URL, `ADLC_MODEL` to `frontier`, and your credential secret to the `LITELLM_MASTER_KEY` value.

A GitHub-hosted runner cannot reach a proxy on your laptop. In CI the gateway needs to be somewhere the runner can resolve — an internal host reachable from your network, a self-hosted runner, or a service the workflow starts itself.

## Checking it before you trust it

Curl the gateway directly. **Send `content-type: application/json`** — without it LiteLLM reports a confusing `missing 2 required positional arguments` that looks like a proxy bug and is not:

```bash
curl -s -X POST "$ADLC_BASE_URL/v1/messages" \
  -H "x-api-key: $GATEWAY_KEY" \
  -H 'anthropic-version: 2023-06-01' \
  -H 'content-type: application/json' \
  -d '{"model":"frontier","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}'
```

A reply whose `model` field is your *backend* id means the route works. Then run one station by hand, which is the same path CI takes:

```bash
ADLC_BASE_URL=http://localhost:4000 ADLC_MODEL=frontier \
ANTHROPIC_API_KEY="$GATEWAY_KEY" \
  bash scripts/run-station.sh prompts/triage.md "Read" issues/001-rejected-order-eats-stock.md
```

## Validated against a real non-Anthropic model

Gemini, through LiteLLM, on the real `scripts/run-station.sh`. The proxy returned an
Anthropic-shaped reply from a Gemini backend:

```json
{"id":"dCCZ…","type":"message","role":"assistant","model":"gemini-2.5-flash",
 "content":[{"type":"text","text":"PROVIDER OK"}],"stop_reason":"end_turn",
 "usage":{"input_tokens":8,"output_tokens":24}}
```

More usefully, the **triage station** ran against a real issue file and its verdict parsed cleanly
through `intake.yml`'s own parser — the same route, slug and type Claude produces:

```
{"actionable":true,"type":"bug","slug":"rejected-order-eats-stock",
 "duplicate_of":null,"recurrence_of":null,"requirements":["REQ-ORD-4"]}
Why: … stock decreases even when an order is rejected, which directly contradicts REQ-ORD-4 …

route: reproduce   slug: rejected-order-eats-stock   type: bug
```

That is the check worth doing on your own provider, because it is the one that can fail quietly.
The stations parse model output strictly, and a model that formats a verdict slightly differently
gets routed wrong rather than erroring — `design.md`'s known-gaps list has five instances of exactly
that. Run one station and put its output through the station's parser before you trust a new model
with the whole line.

## How the seam works

`run-station.sh` maps the line's own names onto the runner's:

```bash
if [ -n "${ADLC_BASE_URL:-}" ]; then export ANTHROPIC_BASE_URL="$ADLC_BASE_URL"; fi
if [ -n "${ADLC_MODEL:-}" ]; then export ANTHROPIC_MODEL="$ADLC_MODEL"; fi
```

`ANTHROPIC_*` here is the CLI's wire protocol, not a claim about who serves the model. Every agent step passes `ADLC_*` and nothing else, so swapping the runner is still one file — and `test/callers.test.js` fails if a station names a runner variable directly, or if any agent step forgets to pass the seam. Miss one station and it would quietly keep talking to Anthropic while the rest of the line used the gateway, which is worse than not supporting this at all.

On credentials: with a base URL set, `ANTHROPIC_API_KEY` is sent as an `x-api-key` header and `CLAUDE_CODE_OAUTH_TOKEN` as `authorization: Bearer`. LiteLLM accepts either, so whichever secret you already have works.

## What this does not change

The gates. A different model does not make its output trustworthy, which is the entire argument of this repo — the deterministic gate has no model in it, the reviewer never wrote the code, the Verifier re-derives behaviour from the spec, and both accountable decisions stay with a person. Swap the model and every one of those still holds. That is the point of keeping the vendor in one file.

# Site Ideas: AI and quota readiness

## Current implementation

- `LocalAiProvider` generates deterministic **predefined template suggestions**, not output from a hosted AI model. The UI and JSON response identify their source as `templates`.
- Domain names are **unverified suggestions** until a real registrar is connected. `/domains` cannot verify or sell domains without that integration.
- The site-ideas route checks Turnstile on new requests, the per-cookie and per-IP daily limit, saved-answer cache and the global monthly token budget. A cached answer for one provider is not reused for another provider.
- `AI_MONTHLY_TOKEN_BUDGET` defaults to 2,000,000 simulated/accounted tokens. **0 turns the feature off** even for cached answers; negative, fractional or invalid values also fail closed. This follows `docs/DECISIONS.md`.
- Before a new request the backend computes a conservative upper-bound token estimate and refuses calls that cannot fit in the remaining monthly allowance.
- If the Supabase project is configured but `ai_usage` or `free_tool_cache` is unavailable, the tool fails with 503 instead of silently switching to process memory. AI usage DB writes and reads report errors.

## Remaining integration and cost-critical work

- [ ] Decide and connect a real AI model vendor, approved model, authentication and region with server-only keys; the local template provider is not a model and an API key alone is not proof of working AI.
- [ ] Implement **atomic Postgres budget reservations / concurrent per-user quota claims** before enabling paid inference. Current read-check-write accounting is not atomic across multiple requests or application instances, so the preflight estimate is **not a hard multi-worker budget guarantee**.
- [ ] Record provider-verified billable token use, retries, timeouts, rate-limit responses and per-feature cost; reconcile against actual provider invoices.
- [ ] Verify production Supabase migration 0029 on isolated staging, enforce staging table/RLS assertions, and test service outages and concurrent requests.
- [ ] Establish abuse protection, audit, privacy consent and retention policy for prompts and cached results.

No real inference API calls, new secrets, live database migration or hosting changes are part of this patch.

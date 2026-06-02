---
name: verify-intent
description: Design the executable feedback loop for an intent — fastest check, highest-confidence check, manual fallback, observable shipped signal, and what shouldn't regress. Use when an intent is drafted but its verification field is empty or just says "add tests." Turns the spec into a runnable contract instead of a document.
---

<what-to-do>

Load the active intent. If `PATHMODE_API_KEY` is set, call `get_current_intent`. Otherwise read `intent.md` from the project root.

Walk the user through the five verification dimensions below. Ask ONE question at a time. For each question, propose your best-guess answer based on the intent's outcomes and what's visible in the codebase (existing tests, observability hooks, CI config).

The five dimensions:

1. **Fastest check** — What's the quickest signal that the code is broken? (typecheck, single unit test, lint rule)
2. **Highest-confidence check** — What's the most reliable signal it actually works? (e2e test, integration test, manual flow)
3. **Manual fallback** — If automation isn't available, what's the 30-second manual check? (curl command, screen recording flow, console query)
4. **Observable shipped signal** — Once deployed, what tells you it's working in production? (metric, log pattern, user behavior change)
5. **What must not regress** — What existing behavior would a fix here accidentally break? (named cases the user worries about)

For each answer, capture it. In team mode, call `log_implementation_note` with the dimension and answer (e.g., `verification:fastest_check: npm run typecheck`). In local mode, append to the `## Verification` section of `intent.md`.

When all five are answered, summarize the loop:

```
Verification loop for this intent:
- Fastest: [command/check]
- Highest-confidence: [command/check]
- Manual fallback: [steps]
- Shipped signal: [metric/log]
- Must not regress: [named cases]
```

</what-to-do>

<supporting-info>

## Why five dimensions, not "tests"

A `verification` field that says "add tests" is a document, not a contract. It doesn't tell an implementation agent what to actually run, and it doesn't tell a reviewer what to check.

The five-dimension breakdown turns verification into something runnable:

- The agent knows the **fastest check** to run after every change → tight feedback loop
- The agent knows the **highest-confidence check** to run before declaring done → catches issues
- The user has a **manual fallback** when CI is broken or the test framework is mid-migration
- The team has a **shipped signal** to watch in production → closes the deploy-to-verify gap
- Everyone knows what **must not regress** → prevents the "fix that broke unrelated thing" pattern

## Concrete example

Intent: "Payment completes in under 3 seconds (p95)"

Bad verification: "Add a test for the payment timeout."

Good verification (five dimensions):

- Fastest check: `pnpm vitest run payment-timeout.test.ts` — 2s, runs locally on save
- Highest-confidence: `pnpm playwright test payment-flow.spec.ts` — 30s, hits the actual payment provider sandbox
- Manual fallback: Open `/checkout`, add a $1 item, complete payment, time the wall clock from "pay" click to confirmation screen
- Shipped signal: Datadog metric `checkout.payment.duration.p95` < 3000ms over 24h after deploy
- Must not regress: Refund flow (uses the same payment service); guest checkout (different code path that calls the same client)

The first version is a wish. The second version is a contract.

## Mode behavior

- **Team mode** — Each answer becomes a `log_implementation_note` keyed by dimension. When the verification schema lands in the spec model (planned), these notes will migrate to a structured `verification` field. Until then, notes are the durable store.
- **Local mode** — Answers append to `## Verification` in `intent.md` as a markdown section. Simple, no schema dependency.

## Pairing with other skills

- After `compile-intent` produces a spec, run `verify-intent` before treating the spec as agent-ready. A spec without a verification loop is not agent-ready.
- Before `handoff-intent`, check that the verification loop ran — if outcomes are claimed delivered but verification was never designed, that's a gap to surface.
- `review-against-intent` consumes the verification field to know what "delivered" means.

</supporting-info>

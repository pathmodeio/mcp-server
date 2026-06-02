---
name: review-against-intent
description: Review code changes against the active intent's outcomes and constraints. Use after writing code meant to implement an intent, or when reviewing a PR to check it actually delivers on the spec. Anchors review to product intent, not generic code style.
---

<what-to-do>

Load the active intent. If `PATHMODE_API_KEY` is set, call `get_current_intent` (Pathmode MCP). Otherwise read `intent.md` from the project root.

Identify the changed files using git diff against the base branch (or staged changes if no base specified).

For each outcome in the intent, check whether the changes actually deliver it — with specific file/line evidence. For each constraint, check whether the changes respect it. For each edge case, check whether it's handled.

Report:
- Outcomes delivered (with file/line evidence)
- Outcomes not yet delivered (and what's missing)
- Constraint violations (specific files/lines)
- Edge cases that look unhandled

Do NOT review for unrelated code style, formatting, or quality concerns. That's not this skill's job. Stay anchored to the intent.

</what-to-do>

<supporting-info>

## Why anchor to intent, not generic review

Most code review tools check correctness, style, or security. They cannot check whether the code does what it was MEANT to do, because they don't see the intent.

This skill bridges that gap. It treats the intent spec as a contract and the code change as the proposed satisfaction of that contract. A PR can pass every other check and still fail this one — because the intent it was supposed to deliver isn't actually delivered.

## What "delivers an outcome" looks like

For an outcome like "Payment completes in under 3 seconds (p95)":

- ✓ The payment code path has a measurable timeout under 3s
- ✓ There's a metric or test confirming p95 behavior
- ✓ Failure modes are handled (covers the constraint side)

A code change that adds a feature without a corresponding metric does NOT deliver this outcome. Surface that gap.

## Constraint violations

Constraints are hard limits — "PII must not survive a logout", "checkout must not block on network calls > 500ms", etc.

If a change introduces a constraint violation, treat it as a blocker. Be specific: name the constraint, name the file/line, explain how the change violates it.

## Logging gaps

When the review finds gaps, the user often wants to record what's not yet done so a future session can pick it up. Call `log_implementation_note` for each significant gap. Make the note self-contained — the next reader won't have this conversation's context.

</supporting-info>

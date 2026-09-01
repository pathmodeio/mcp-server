---
id: "INT-MCP-LOCAL-PREFLIGHT-001"
status: "approved"
userGoal: "Check and improve product intent before a coding agent builds"
objective: "Help builders catch vague or contradictory product decisions before an implementation agent turns them into code"
evidence:
  - type: "observation"
    source: "Published readiness corpus and local-mode workflow"
    excerpt: "A deterministic preflight can name incomplete objectives, outcomes, constraints, edge cases, and verification without sending the repository to a hosted service."
    anchors: ["objective", "outcome:0"]
outcomes:
  - "The same unchanged intent.md receives the same six-gate verdict on every local run"
  - "A keyless user can compile, save, and preflight an intent.md with zero Pathmode API calls"
  - "Every failed gate names the field and quotes the text it could not confirm or reports that nothing was found"
constraints:
  - "Local mode must work without signup, API key, model call, or network access"
  - "Saving an intent must never silently replace a different intent in the repository"
  - "Workspace-scoped operations must authenticate and authorize the caller before privileged access"
edgeCases:
  - scenario: "A field contains meaningful text that the deterministic gate cannot confidently classify"
    expectedBehavior: "The verdict reports the field as unconfirmed and allows an explicit content-bound confirmation"
  - scenario: "The repository already contains a different intent.md"
    expectedBehavior: "The save is refused unless the user explicitly chooses how to resolve the conflict"
verification:
  - "Run npm test in packages/mcp-server and confirm the readiness, parser, save-conflict, and authorization tests pass"
  - "Run preflight twice on the same fixture and confirm byte-identical verdict content"
  - "Run local mode without PATHMODE_API_KEY and confirm no Pathmode API request is made"
healthMetrics:
  - "Published MCP tools remain backward compatible within their documented version"
  - "The browser and MCP implementations remain in parity across the readiness corpus"
---

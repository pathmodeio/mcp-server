# @pathmode/mcp-server

Connect Claude Code, Cursor, and other AI agents to your [Pathmode](https://pathmode.io) Intent Layer.

Get strategic context, dependency graph analysis, and structured implementation prompts — so your AI agent builds the right thing, not just any thing.

## Features

- **Intent context** — Structured specs with objectives, outcomes, constraints, and edge cases
- **Dependency graph analysis** — Critical path, cycle detection, bottleneck identification
- **Context export** — Generate CLAUDE.md, .cursorrules, and intent.md files
- **Workspace strategy** — Vision, non-negotiables, architecture principles
- **Constitution rules** — Mandatory constraints for all implementations
- **Implementation tracking** — Status updates and technical decision logging

## Quick Start

```bash
npx @pathmode/mcp-server
```

## Setup

### Claude Desktop

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pathmode": {
      "command": "npx",
      "args": ["@pathmode/mcp-server"],
      "env": {
        "PATHMODE_API_KEY": "pm_live_..."
      }
    }
  }
}
```

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "pathmode": {
      "command": "npx",
      "args": ["@pathmode/mcp-server"],
      "env": {
        "PATHMODE_API_KEY": "pm_live_..."
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pathmode": {
      "command": "npx",
      "args": ["@pathmode/mcp-server"],
      "env": {
        "PATHMODE_API_KEY": "pm_live_..."
      }
    }
  }
}
```

### Local Mode (Offline)

Read `intent.md` files from your project directory without an API key:

```json
{
  "mcpServers": {
    "pathmode": {
      "command": "npx",
      "args": ["@pathmode/mcp-server", "--local"]
    }
  }
}
```

## Configuration

| Method | Details |
|--------|---------|
| Environment variable | `PATHMODE_API_KEY=pm_live_...` |
| Config file | `~/.pathmode/config.json` with `apiKey`, `apiUrl`, `workspaceId` |
| Local mode | `--local` flag — reads `intent.md` and `.pathmode/intents/*.md` |

Get your API key from **Settings > API Keys** in the [Pathmode app](https://pathmode.io).

## Tools

### Intent Management

| Tool | Description | Annotations |
|------|-------------|-------------|
| `get_current_intent` | Get the active intent (first approved, or most recent) | readOnly |
| `get_intent` | Get a single intent by ID with full details | readOnly |
| `list_intents` | List all intents, optionally filtered by status | readOnly |
| `search_intents` | Search intents by keyword across goals, objectives, and outcomes | readOnly |
| `update_intent_status` | Update intent status (draft > validated > approved > shipped > verified) | write |
| `log_implementation_note` | Record a technical decision or implementation note | write |

### Strategic Analysis

| Tool | Description | Annotations |
|------|-------------|-------------|
| `analyze_intent_graph` | Analyze dependency graph for critical path, cycles, bottlenecks, and risks | readOnly |
| `get_intent_relations` | Get the dependency graph for a specific intent | readOnly |

### Context & Export

| Tool | Description | Annotations |
|------|-------------|-------------|
| `export_context` | Generate CLAUDE.md, .cursorrules, or intent.md files | readOnly |
| `get_agent_prompt` | Get a structured execution prompt for an intent | readOnly |
| `get_workspace` | Get workspace details including strategy and constitution | readOnly |
| `get_constitution` | Get mandatory constraint rules for the workspace | readOnly |

### Prompts

| Prompt | Description |
|--------|-------------|
| `implement-intent` | Full implementation workflow for a specific intent |
| `review-risks` | Analyze the intent graph for architectural risks |
| `what-next` | Suggest the highest-priority intent to work on next |

### Resources

| URI | Description |
|-----|-------------|
| `intent://current` | Currently active intent |
| `intent://graph` | Full intent dependency graph |
| `intent://workspace-strategy` | Workspace vision, principles, and active constitution rules |

## Usage Examples

### Example 1: Get Implementation Context

**User prompt:** "What should I implement next?"

**Expected tool calls:**
1. `get_current_intent` — Fetches the first approved intent
2. `get_agent_prompt` with `intentId` and `mode: "execute"` — Gets the structured implementation prompt

**Expected output:** A full specification with objective, observable outcomes, constraints, edge cases, and verification steps that the AI agent uses to plan and execute the implementation.

---

### Example 2: Analyze Architectural Risks

**User prompt:** "Are there any risks in our intent dependency graph?"

**Expected tool calls:**
1. `analyze_intent_graph` with `analysis: "full"` — Runs complete graph analysis

**Expected output:**
```json
{
  "summary": { "total": 12, "statusDistribution": { "draft": 3, "approved": 5, "shipped": 4 } },
  "criticalPath": [
    { "id": "abc", "userGoal": "User authentication", "status": "shipped" },
    { "id": "def", "userGoal": "Role-based access control", "status": "approved" },
    { "id": "ghi", "userGoal": "Admin dashboard", "status": "draft" }
  ],
  "cycles": [],
  "bottlenecks": [
    { "id": "def", "userGoal": "Role-based access control", "dependentCount": 4, "status": "approved" }
  ],
  "orphanCount": 2
}
```

The AI agent summarizes: the critical path has 3 steps, "Role-based access control" is a bottleneck blocking 4 other intents and should be prioritized, and 2 intents have no relationships.

---

### Example 3: Generate a CLAUDE.md Context File

**User prompt:** "Generate a CLAUDE.md for this project"

**Expected tool calls:**
1. `export_context` with `format: "claude-md"` — Generates workspace context

**Expected output:** A markdown file containing workspace strategy, active constitution rules, and all approved intents formatted as structured context that can be added to any project's `CLAUDE.md` file. The AI agent can write this directly to disk.

---

### Example 4: Search and Track Implementation

**User prompt:** "Find all intents related to authentication and mark the login one as shipped"

**Expected tool calls:**
1. `search_intents` with `query: "authentication"` — Finds matching intents
2. `update_intent_status` with `intentId` and `status: "shipped"` — Updates the login intent
3. `log_implementation_note` — Documents what was implemented

**Expected output:** The search returns matching intents, the status is updated, and a note is logged documenting the implementation approach.

## Troubleshooting

**"No Pathmode configuration found"**
Set the `PATHMODE_API_KEY` environment variable or create `~/.pathmode/config.json`.

**Tools return "not available in local mode"**
Most tools require cloud mode. Set up an API key, or use `--local` for basic intent reading from `intent.md` files.

**Connection timeout**
Ensure your API key is valid and has the correct scopes (read, write). Check your network connection to `pathmode.io`.

## Privacy Policy

This MCP server connects to the Pathmode API (`pathmode.io`) to read and write intent specifications, workspace data, and constitution rules on behalf of the authenticated user.

**Data collected:** The server transmits your API key for authentication and sends/receives workspace data (intents, constitution rules, workspace strategy) via the Pathmode API.

**Data storage:** The MCP server itself does not store any data locally (except in `--local` mode where it reads existing `intent.md` files from your project directory). All persistent data is stored in Pathmode's cloud infrastructure.

**Third-party sharing:** No data is shared with third parties. The server communicates exclusively with the Pathmode API.

**Data retention:** Data retention follows Pathmode's standard data retention policies. See the full privacy policy at [https://pathmode.io/privacy](https://pathmode.io/privacy).

**Contact:** For privacy inquiries, contact privacy@pathmode.io.

## Support

- Issues: [github.com/pathmodeio/mcp-server/issues](https://github.com/pathmodeio/mcp-server/issues)
- Documentation: [pathmode.io/docs](https://pathmode.io/docs)

## License

MIT

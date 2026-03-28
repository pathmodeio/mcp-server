# @pathmode/mcp-server

Build structured intent specs through Socratic AI conversation — right in your terminal.

No signup. No API key. Just add the MCP server and start talking.

## Intent Compiler

The Intent Compiler turns Claude Code into a Socratic product thinking partner. Describe a problem, paste a support ticket, or explain what's broken — Claude challenges vague thinking, asks pointed questions, runs live quality checks on weak fields, and builds a structured spec.

```
> Help me write an intent spec for our checkout flow

  What's broken about it? When you say "checkout flow" — is the whole
  thing failing, or is there one specific moment where users bail?

> Payment step times out and users get confused

  When you say "times out" — is that 5 seconds or 30? And what does
  the user actually see? A spinner? A blank screen? An error?

> About 8 seconds, they see a spinner with no feedback

  Proposed Objective: "Reduce cart abandonment caused by payment step
  timeouts exceeding 3 seconds, where users see a spinner with no
  status feedback or recovery path."

  Does that capture it, or is there more to the pain?
```

When the spec is ready, Claude saves it as `intent.md` and optionally exports as `.cursorrules` or `CLAUDE.md` — so every AI agent in your project sees the intent as its implementation context.

### Quick Start

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "pathmode": {
      "command": "npx",
      "args": ["@pathmode/mcp-server"]
    }
  }
}
```

Then in Claude Code:

```
> Help me write an intent spec for [your problem here]
```

That's it. No API key needed.

### What You Get

**intent.md** — Structured spec with YAML frontmatter:
```markdown
---
id: "intent_17291..."
version: 1
status: "draft"
---
# Fix Checkout Payment Timeout

## Objective
Reduce cart abandonment caused by payment step
timeouts exceeding 3 seconds.

## Outcomes
- [ ] Payment completes in under 3 seconds (p95)
- [ ] Users see real-time status during processing
- [ ] Failed payments show actionable error with retry

## Edge Cases
- **Network timeout during payment**: Show retry button, no double-charge
- **Unknown provider status**: Hold order, notify user within 30s
```

**.cursorrules** — Agent-directive format for Cursor:
```
# CURRENT OBJECTIVE
You are implementing: "Fix Checkout Payment Timeout"

# SUCCESS OUTCOMES
Your implementation MUST satisfy ALL of these:
- Payment completes in under 3 seconds (p95)
- Users see real-time status during processing
- Failed payments show actionable error with retry
```

**CLAUDE.md** — Appends a `<!-- PATHMODE:START -->` section so Claude Code sees the intent in every conversation.

### Intent Compiler Tools

| Tool | Description |
|------|-------------|
| `intent_save` | Save an intent spec to `intent.md` in the project root |
| `intent_export` | Export as `.cursorrules` or `CLAUDE.md` section |

### Intent Compiler Prompt

| Prompt | Description |
|--------|-------------|
| `compile-intent` | Start a Socratic conversation to build an intent spec |

---

## Team Features (API Key Required)

For teams shipping with AI agents, connect to your [Pathmode](https://pathmode.io) workspace for dependency tracking, strategic context, and governance.

### Setup with API Key

Automatic setup:

```bash
npx @pathmode/mcp-server@latest setup pm_live_...
```

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

Works with Claude Code (`.claude/settings.json`), Claude Desktop (`claude_desktop_config.json`), and Cursor (`.cursor/mcp.json`).

Get your API key from **Settings > API Keys** in the [Pathmode app](https://pathmode.io).

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

### Configuration

| Method | Details |
|--------|---------|
| Environment variable | `PATHMODE_API_KEY=pm_live_...` |
| Config file | `~/.pathmode/config.json` with `apiKey`, `apiUrl`, `workspaceId` |
| Local mode | `--local` flag — reads `intent.md` and `.pathmode/intents/*.md` |
| No config | Intent Compiler works without any configuration |

### Team Tools

#### Intent Management

| Tool | Description |
|------|-------------|
| `get_current_intent` | Get the active intent (first approved, or most recent) |
| `get_intent` | Get a single intent by ID with full details |
| `list_intents` | List all intents, optionally filtered by status |
| `search_intents` | Search intents by keyword across goals, objectives, and outcomes |
| `update_intent_status` | Update intent status (draft > validated > approved > shipped > verified) |
| `log_implementation_note` | Record a technical decision or implementation note |

#### Strategic Analysis

| Tool | Description |
|------|-------------|
| `analyze_intent_graph` | Analyze dependency graph for critical path, cycles, bottlenecks |
| `get_intent_relations` | Get the dependency graph for a specific intent |

#### Context & Export

| Tool | Description |
|------|-------------|
| `export_context` | Generate CLAUDE.md, .cursorrules, or intent.md files. For claude-md, optionally pass a product ID; for cursorrules/intent-md, product is derived from the resolved intent |
| `get_agent_prompt` | Get a structured execution prompt for an intent |
| `get_workspace` | Get workspace details including strategy, active products, and constitution |
| `get_constitution` | Get mandatory constraint rules for the workspace |

#### Team Prompts

| Prompt | Description |
|--------|-------------|
| `implement-intent` | Full implementation workflow for a specific intent |
| `review-risks` | Analyze the intent graph for architectural risks |
| `what-next` | Suggest the highest-priority intent to work on next |

#### Resources

| URI | Description |
|-----|-------------|
| `intent://current` | Currently active intent |
| `intent://graph` | Full intent dependency graph |
| `intent://workspace-strategy` | Workspace vision, principles, and active constitution rules |

## Troubleshooting

**"No Pathmode configuration found"**
This no longer causes an error. The Intent Compiler works without any configuration. Team features require an API key.

**Tools return "not available in local mode"**
Most team tools require cloud mode. Set up an API key, or use `--local` for basic intent reading.

**Connection timeout**
Ensure your API key is valid and has the correct scopes. Check your network connection to `pathmode.io`.

**`setup` starts the server instead of the installer**
Use the latest package version:

```bash
npx @pathmode/mcp-server@latest setup pm_live_...
```

As a fallback, you can bypass setup entirely by setting the key directly in the MCP config:

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

## Privacy Policy

This MCP server connects to the Pathmode API (`pathmode.io`) to read and write intent specifications, workspace data, and constitution rules on behalf of the authenticated user.

The **Intent Compiler** works entirely offline — no data is sent to Pathmode servers. Specs are saved locally to your project directory.

**Data collected (team features only):** The server transmits your API key for authentication and sends/receives workspace data via the Pathmode API.

**Data storage:** The MCP server does not store data locally (except `intent.md` files it creates and in `--local` mode). Persistent data is stored in Pathmode's cloud infrastructure.

**Third-party sharing:** No data is shared with third parties. The server communicates exclusively with the Pathmode API.

Full privacy policy: [pathmode.io/privacy](https://pathmode.io/privacy)

## Links

- [Intent Compiler page](https://pathmode.io/intent-compiler) — Overview and setup guide
- [Try in browser](https://pathmode.io/sandbox) — Interactive sandbox, no install needed
- [Pathmode](https://pathmode.io) — Full platform for teams
- [Issues](https://github.com/pathmodeio/mcp-server/issues)

## License

MIT

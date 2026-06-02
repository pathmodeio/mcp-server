# Pathmode Skills for Claude Code

A skill pack that turns Claude Code into a product-intent-aware development partner.

These skills work with the [@pathmode/mcp-server](https://www.npmjs.com/package/@pathmode/mcp-server). They auto-trigger based on what you ask Claude — no slash commands required.

## Skills

Listed in lifecycle order — most projects use them in roughly this sequence.

| Skill | Use when |
|-------|----------|
| `setup-pathmode-workflow` | First-time setup — capturing test commands, issue tracker, status conventions |
| `compile-intent` | Building a structured spec for what to ship |
| `verify-intent` | Designing the executable feedback loop for a spec (fastest check, manual fallback, shipped signal) |
| `grill-intent` | Stress-testing an existing spec for weaknesses before code is written |
| `split-intent-to-issues` | Breaking a spec into paste-ready Linear / Jira / GitHub Issues tickets |
| `review-against-intent` | Checking code changes against the intent's outcomes and constraints |
| `handoff-intent` | Capturing decisions and discoveries at the end of a session |

## Install

1. Install the MCP server (adds `@pathmode/mcp-server` to your MCP config):

   ```bash
   npx @pathmode/mcp-server@latest setup
   ```

2. Install the skills:

   ```bash
   npx @pathmode/mcp-server install-skills            # project-local (.claude/skills/)
   npx @pathmode/mcp-server install-skills --global   # global (~/.claude/skills/)
   ```

   Pass `--force` to overwrite skills you've previously installed.

3. Restart Claude Code. The skills register at session start.

## What "auto-trigger" means

Skills have a `description` field Claude reads at session start. When you say "help me write a spec for the checkout flow," Claude matches your request against installed skill descriptions and runs the matching skill.

You don't need to remember `/compile-intent` — just talk in plain English.

## Skills + MCP

Each skill orchestrates calls to the @pathmode/mcp-server. The MCP server is the engine — 15+ tools, evidence handling, Socratic preamble, dependency graphs. The skills are the auto-trigger surface on top.

You can also invoke the underlying MCP prompts directly via slash commands:

- `/compile-intent` (also invoked by the `compile-intent` skill)
- `/implement-intent`
- `/review-risks`
- `/what-next`

Skills wrap these in a more discoverable form.

## Modes

- **Local mode** (no API key) — Reads and writes `intent.md` in the project root. Free, no signup, fully offline.
- **Team mode** (`PATHMODE_API_KEY` set) — Syncs intents to a Pathmode workspace. Adds evidence, dependency graphs, constitution rules, and cross-agent context. Get a key from [pathmode.io](https://pathmode.io).

Skills detect the mode at runtime and adapt — same skill names, more capability in team mode.

## Format

Each skill is a `SKILL.md` file with YAML frontmatter (`name`, `description`) and two sections:

- `<what-to-do>` — the imperative the agent follows
- `<supporting-info>` — context, examples, and rules

This matches the [mattpocock/skills](https://github.com/mattpocock/skills) format so the skills are legible to engineers already familiar with that pattern.

## License

MIT — see [LICENSE](../LICENSE) in the package root.

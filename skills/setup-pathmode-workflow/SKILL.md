---
name: setup-pathmode-workflow
description: Interview the user about their development workflow and capture the answers as durable context. Use when starting a new project with Pathmode, onboarding a teammate to an existing project, or when intent specs feel disconnected from how the team actually ships. Output is workflow conventions the next agent session will read.
---

<what-to-do>

Walk the user through the workflow questions below. Ask ONE question at a time. For each question, propose your best-guess answer based on what you can see in the repo (package.json scripts, CI config, README, existing PRs). The user accepts or corrects.

Questions to cover (in order):

1. **Primary agent**: Which AI coding agent does the user primarily work with? (Claude Code, Cursor, Windsurf, Copilot, mixed)
2. **Issue tracker**: Where do tickets live? (Linear, Jira, GitHub Issues, none yet)
3. **Test command**: What does the user run to prove code works locally? (e.g., `npm test`, `pytest`, `pnpm vitest`)
4. **Build/typecheck command**: What does the user run to prove code compiles? (e.g., `npm run build`, `tsc --noEmit`)
5. **PR conventions**: How does code get reviewed before merge? (draft PR + review, trunk-based, solo)
6. **Status mapping**: What concrete event marks an intent as `shipped`? As `verified`? (merge to main, deploy to prod, metric hold for 1 week)
7. **Implementation note convention**: Where should agent decisions get captured? (Pathmode `log_implementation_note`, ADR file, commit messages, PR descriptions)

When all questions are answered, output a single self-contained block the user can paste into their `CLAUDE.md` file (or the equivalent for their agent). Format:

```markdown
## Pathmode Workflow Conventions

- Primary agent: [answer]
- Issue tracker: [answer]
- Test: `[command]`
- Typecheck/build: `[command]`
- PR conventions: [answer]
- Status mapping: shipped = [event]; verified = [event]
- Implementation notes: [convention]
```

If `PATHMODE_API_KEY` is set, ALSO call `log_implementation_note` against a workspace-level convention record (the user's current intent if any, otherwise the first intent in the workspace) so other team members and other agents inherit the conventions.

Do NOT write to a `.pathmode/` directory in the repo. The canonical conventions live in `CLAUDE.md` (visible to every agent session) and in the Pathmode workspace (visible to PMs). The repo is a consumer of intent, not where intent fossilizes.

</what-to-do>

<supporting-info>

## Why these questions

Each question maps to a real friction point in agent-assisted development:

- **Primary agent** → tells Claude which other agents will read the same conventions (different agents have different config file conventions)
- **Issue tracker** → tells `split-intent-to-issues` where to format output for
- **Test command** → tells `review-against-intent` how to check that outcomes are actually delivered
- **Build/typecheck** → same; the fastest feedback loop is usually typecheck
- **PR conventions** → tells `handoff-intent` whether decisions go in PR descriptions or somewhere else
- **Status mapping** → tells `handoff-intent` when to propose `update_intent_status` to `shipped` vs `verified`
- **Implementation note convention** → tells every skill where decisions persist

Without these answers, every skill has to re-ask the same questions every session. Capturing them once makes downstream skills feel native.

## Inferring from the repo

Before asking, look at the repo:

- `package.json` `scripts` field → likely test/build/typecheck commands
- `.github/workflows/` → likely CI commands the team trusts
- `CONTRIBUTING.md`, `CODEOWNERS`, PR templates → PR conventions
- `.linear/`, `.jira/`, `.github/ISSUE_TEMPLATE/` → likely issue tracker
- Existing `CLAUDE.md`, `.cursorrules`, `.windsurfrules` → likely primary agent

For each inference, propose it as the best-guess answer ("Looks like you use Linear — there's a `.linear/` directory. Is that right, or are tickets actually in [other place]?").

## Mode behavior

- **Local mode (no API key)** — Output goes to `CLAUDE.md` only. The user paste-edits it themselves. The skill does not write files.
- **Team mode (`PATHMODE_API_KEY` set)** — Same `CLAUDE.md` output, PLUS a `log_implementation_note` call so the conventions are visible in the Pathmode workspace.

## What this skill does NOT do

- Does not write to `.pathmode/` or any repo subdirectory beyond `CLAUDE.md`
- Does not run npm install, set up CI, or modify the repo's tooling
- Does not connect to Linear/Jira/GitHub APIs — only captures the user's intent for which tracker they use

It is an interview, not an installer.

</supporting-info>

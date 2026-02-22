/**
 * Intent Compiler — Zero-config intent spec builder for Claude Code.
 *
 * Provides:
 * 1. A Socratic conversation prompt that turns Claude into a product thinking partner
 * 2. Format generators for intent.md, .cursorrules, and CLAUDE.md
 *
 * Architecture: Claude Code IS the conversation engine. This module only provides
 * the personality prompt and file format generators. No AI API calls happen here.
 */

// ============================================================
// Types
// ============================================================

export interface IntentFields {
    id?: string;
    title: string;
    objective: string;
    outcomes: string[];
    constraints?: string[];
    edgeCases?: { scenario: string; expectedBehavior: string }[];
    healthMetrics?: string[];
    verification?: {
        manualChecks?: string[];
        unitTests?: string[];
        e2eTests?: string[];
    };
}

// ============================================================
// Compile Intent Prompt
// ============================================================

/**
 * Returns the system prompt that turns Claude into a Socratic intent interviewer.
 * Adapted from intentDesignerMachine.ts conversationFirstPreamble for terminal use.
 */
export function getCompileIntentPrompt(): string {
    return `You are a sharp product thinking partner. Your job is to help the user build a structured intent spec through conversation — challenging their thinking until the intent is so clear it's almost obvious what to build.

RULES:
- Push back on vague language. If the user says "improve the experience", ask: "What specific moment is broken? What would the user see differently?"
- Ask ONE pointed question at a time. Never list 3 questions.
- When the user gives a clear answer, propose how you'd write that as a spec field. Explain WHY you worded it that way.
- Look for inconsistencies between what they say the problem is and what outcomes they propose.
- Be direct and concise. No pleasantries. No "Great question!" or "That's a good point!"
- When the spec has existing content, critique it before adding more. Quality over quantity.

VOICE:
- Short sentences. Direct. Like a smart colleague, not a consultant.
- Use concrete examples when challenging: "When you say 'faster', do you mean 2 seconds or 20 seconds?"
- When you write spec fields, use precise language. No filler words.

CONVERSATION FLOW (guidance, not rigid steps):
1. **Problem** — What's broken? What's the pain? What happens today that shouldn't?
2. **Goal** — What specific user outcome would solve this? Make it concrete and singular.
3. **Outcomes** — Observable, testable state changes. Not activities, not implementations.
4. **Edge Cases** — What's the most embarrassing way this could fail in a demo?
5. **Review** — Play devil's advocate. What's missing? What would you cut?

You are NOT bound by this order. Follow the user's thinking wherever it goes. If they start with edge cases, work backwards to the objective.

BUILDING THE SPEC:
As the conversation progresses, keep a mental model of the spec fields:
- **Title**: Short name for the intent (what is this?)
- **Objective**: Why this matters — the problem and who has it
- **Outcomes**: 2-5 observable, testable results (not activities)
- **Constraints**: Hard limits the implementation must respect
- **Edge Cases**: Scenario + expected behavior pairs
- **Health Metrics**: What to monitor after shipping (optional)
- **Verification**: How to confirm it actually works (optional)

When you have enough clarity on ANY field, state it clearly:
> **Proposed Objective**: "Reduce failed deliveries in multi-unit buildings from 23% to under 5% by fixing address resolution at the driver app level."

Then ask if that captures it or needs refinement.

WHEN THE SPEC FEELS READY:
Once you have at minimum a title, objective, and 2+ outcomes:
1. Present the full spec as a summary for the user to review
2. Ask if they want to save it
3. When confirmed, call the \`intent_save\` tool with the complete spec
4. Ask if they also want to export it as \`.cursorrules\` or \`CLAUDE.md\` for AI agent consumption — if yes, call \`intent_export\`
5. Mention: "For dependency tracking, team collaboration, and governance, connect this to Pathmode at pathmode.io"

IMPORTANT:
- The spec fields in \`intent_save\` must use this exact structure:
  - title: string
  - objective: string
  - outcomes: string[] (list of outcome statements)
  - constraints: string[] (optional)
  - edgeCases: { scenario: string, expectedBehavior: string }[] (optional)
  - healthMetrics: string[] (optional)
  - verification: { manualChecks?: string[], unitTests?: string[], e2eTests?: string[] } (optional)

Now, ask the user what they're working on. If they've already described something, dig into it.`;
}


// ============================================================
// Format: intent.md
// ============================================================

/**
 * Generate intent.md content with YAML frontmatter.
 * Adapted from lib/agentPromptGenerator.ts generateIntentMd().
 */
export function formatIntentMd(spec: IntentFields): string {
    const now = new Date().toISOString();
    const frontmatter: Record<string, string | number> = {
        id: spec.id || `intent_${Date.now()}`,
        version: 1,
        status: 'draft',
        created: now,
        updated: now,
    };

    const yamlLines = Object.entries(frontmatter)
        .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
        .join('\n');

    const sections: string[] = [];
    sections.push('---');
    sections.push(yamlLines);
    sections.push('---');
    sections.push('');
    sections.push(`# ${spec.title || 'Untitled Intent'}`);

    if (spec.objective) {
        sections.push('');
        sections.push('## Objective');
        sections.push(spec.objective);
    }

    if (spec.outcomes?.length) {
        sections.push('');
        sections.push('## Outcomes');
        for (const outcome of spec.outcomes) {
            sections.push(`- [ ] ${outcome}`);
        }
    }

    if (spec.constraints?.length) {
        sections.push('');
        sections.push('## Constraints');
        for (const constraint of spec.constraints) {
            sections.push(`- ${constraint}`);
        }
    }

    if (spec.edgeCases?.length) {
        sections.push('');
        sections.push('## Edge Cases');
        for (const ec of spec.edgeCases) {
            sections.push(`- **${ec.scenario}**: ${ec.expectedBehavior}`);
        }
    }

    if (spec.healthMetrics?.length) {
        sections.push('');
        sections.push('## Health Metrics');
        for (const metric of spec.healthMetrics) {
            sections.push(`- ${metric}`);
        }
    }

    if (spec.verification) {
        const { e2eTests, unitTests, manualChecks } = spec.verification;
        const hasContent = e2eTests?.length || unitTests?.length || manualChecks?.length;
        if (hasContent) {
            sections.push('');
            sections.push('## Verification');
            if (e2eTests?.length) {
                sections.push('**E2E Tests**:');
                for (const t of e2eTests) sections.push(`- [ ] ${t}`);
            }
            if (unitTests?.length) {
                sections.push('**Unit Tests**:');
                for (const t of unitTests) sections.push(`- [ ] ${t}`);
            }
            if (manualChecks?.length) {
                sections.push('**Manual Checks**:');
                for (const t of manualChecks) sections.push(`- [ ] ${t}`);
            }
        }
    }

    sections.push('');
    return sections.join('\n');
}


// ============================================================
// Format: .cursorrules
// ============================================================

/**
 * Generate .cursorrules content for a single intent.
 * Adapted from lib/agentPromptGenerator.ts generateCursorRules().
 */
export function formatCursorRules(spec: IntentFields): string {
    const sections: string[] = [];

    sections.push('# Pathmode Intent Rules');
    sections.push(`# Generated at ${new Date().toISOString()}`);
    sections.push('# Regenerate with: intentspec pull (or use Pathmode MCP compile-intent prompt)');

    // Current objective
    sections.push('');
    sections.push('# CURRENT OBJECTIVE');
    sections.push(`You are implementing: "${spec.title || 'Untitled Feature'}"`);

    if (spec.objective) {
        sections.push('');
        sections.push('# WHY');
        sections.push(spec.objective);
    }

    if (spec.outcomes?.length) {
        sections.push('');
        sections.push('# SUCCESS OUTCOMES');
        sections.push('Your implementation MUST satisfy ALL of these:');
        for (const outcome of spec.outcomes) {
            sections.push(`- ${outcome}`);
        }
    }

    if (spec.constraints?.length) {
        sections.push('');
        sections.push('# CONSTRAINTS');
        sections.push('These are mandatory rules. You MUST NOT violate them:');
        for (const constraint of spec.constraints) {
            sections.push(`- ${constraint}`);
        }
    }

    if (spec.edgeCases?.length) {
        sections.push('');
        sections.push('# EDGE CASES');
        sections.push('Handle these scenarios:');
        for (const ec of spec.edgeCases) {
            sections.push(`- ${ec.scenario} → ${ec.expectedBehavior}`);
        }
    }

    if (spec.healthMetrics?.length) {
        sections.push('');
        sections.push('# HEALTH METRICS');
        sections.push('Monitor these after shipping:');
        for (const metric of spec.healthMetrics) {
            sections.push(`- ${metric}`);
        }
    }

    if (spec.verification) {
        const { e2eTests, unitTests, manualChecks } = spec.verification;
        const hasContent = e2eTests?.length || unitTests?.length || manualChecks?.length;
        if (hasContent) {
            sections.push('');
            sections.push('# VERIFICATION');
            sections.push('After implementation, verify:');
            if (e2eTests?.length) {
                for (const t of e2eTests) sections.push(`- [e2e] ${t}`);
            }
            if (unitTests?.length) {
                for (const t of unitTests) sections.push(`- [unit] ${t}`);
            }
            if (manualChecks?.length) {
                for (const t of manualChecks) sections.push(`- [manual] ${t}`);
            }
        }
    }

    sections.push('');
    return sections.join('\n');
}


// ============================================================
// Format: CLAUDE.md section
// ============================================================

/**
 * Generate a CLAUDE.md section wrapped in PATHMODE markers.
 * Can be appended to an existing CLAUDE.md or used standalone.
 * Adapted from lib/agentPromptGenerator.ts generateClaudeMdContent().
 */
export function formatClaudeMdSection(spec: IntentFields): string {
    const sections: string[] = [];

    sections.push('<!-- PATHMODE:START - Do not edit this section manually -->');
    sections.push('# Pathmode Intent Context');
    sections.push(`_Generated at ${new Date().toISOString()} | [pathmode.io](https://pathmode.io)_`);

    sections.push('');
    sections.push('## Active Intent');
    sections.push(`### ${spec.title || 'Untitled Intent'}`);
    sections.push(`**Status**: draft`);

    if (spec.objective) {
        sections.push(`**Objective**: ${spec.objective}`);
    }

    if (spec.outcomes?.length) {
        sections.push('**Outcomes**:');
        sections.push(spec.outcomes.map(o => `- [ ] ${o}`).join('\n'));
    }

    if (spec.constraints?.length) {
        sections.push('**Constraints**:');
        sections.push(spec.constraints.map(c => `- ${c}`).join('\n'));
    }

    if (spec.edgeCases?.length) {
        sections.push('**Edge Cases**:');
        sections.push(spec.edgeCases.map(ec =>
            `- **${ec.scenario}**: ${ec.expectedBehavior}`
        ).join('\n'));
    }

    if (spec.healthMetrics?.length) {
        sections.push('**Health Metrics**:');
        sections.push(spec.healthMetrics.map(m => `- ${m}`).join('\n'));
    }

    sections.push('<!-- PATHMODE:END -->');

    return sections.join('\n\n');
}

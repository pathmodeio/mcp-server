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
    outcomes: (string | { id?: string; text: string; priority?: 'must' | 'should' | 'could' })[];
    constraints?: string[];
    edgeCases?: { scenario: string; expectedBehavior: string }[];
    healthMetrics?: string[];
    scope?: { inScope?: string[]; outOfScope?: string[] };
    verification?: {
        manualChecks?: string[];
        unitTests?: string[];
        e2eTests?: string[];
    };
}

/** Extract text from a string or structured outcome. */
function getOutcomeText(o: string | { text: string; priority?: string }): string {
    return typeof o === 'string' ? o : o.text;
}

/** Get priority label prefix for an outcome. */
function getPriorityLabel(o: string | { text: string; priority?: string }): string {
    if (typeof o === 'string' || !o.priority) return '';
    return `[${o.priority.toUpperCase()}] `;
}

function getLiveQualityCheckPromptBlock(): string {
    return `LIVE QUALITY CHECKS:
- After EVERY meaningful user answer, silently update your current draft and run a quality pass before asking the next question.
- Do NOT dump the full rubric every turn. Surface only the single most important failing check right now.
- State the issue plainly, then ask ONE pointed follow-up question that resolves that weakness.

QUALITY RUBRIC:
1. Objective quality
   - Reject vague words like "improve", "better", "enhance", "optimize", "streamline".
   - Reject objectives that are too broad, too short, or missing who is affected and why it matters.
   - If the same objective could describe five different projects, it is still vague.

2. Outcome quality
   - Outcomes must be observable state changes, not implementation steps or task lists.
   - Push back on outcomes like "add a dashboard", "build retry logic", "create a modal", "improve UX".
   - Prefer outcomes like "Users see retry guidance within 5 seconds of failure".

3. Testability
   - If an outcome cannot be checked by a test, metric, or concrete manual observation, it is not ready.
   - Push toward measurable language: percentages, timing thresholds, binary states, visible user actions, or explicit system behavior.

4. Objective/outcome consistency
   - Check whether the proposed outcomes actually prove the objective is solved.
   - Call out mismatches directly: "The objective is about speed, but the outcomes only mention clarity."

5. Edge-case coverage
   - Before the spec is ready, require at least one embarrassing failure mode, boundary condition, timeout, empty state, permission issue, or concurrency issue.

6. Verification quality
   - As soon as an outcome becomes clear, ask what evidence would prove it worked.
   - Verification can be a test, a metric, or a manual check, but it must be concrete.

EXAMPLES OF HOW TO SURFACE A FAILING CHECK:
- "Quality check: the objective is still vague. It says improve, but not what breaks today."
- "Quality check: that outcome is an implementation step, not a user-visible result."
- "Quality check: your outcomes don't yet prove the problem is solved."
- "Quality check: we still have no failure mode, so this spec is not ready yet."`;
}

// ============================================================
// Compile Intent Prompt
// ============================================================

/**
 * Returns the system prompt that turns Claude into a Socratic intent interviewer.
 * Adapted from intentDesignerMachine.ts conversationFirstPreamble for terminal use.
 */
export function getCompileIntentPrompt(): string {
    return `You are a sharp product thinking partner. Your job is to help the user build a structured intent spec through conversation — challenging their thinking until the intent is so clear it's almost obvious what to build. Your overarching goal is to actively prevent a spec from feeling complete before it is operationally sharp.

RULES:
- Ask ONE pointed question at a time. Never list 3 questions.
- Be direct and concise. No pleasantries. No "Great question!" or "That's a good point!"
- Push back on vague language. If the user says "improve the experience", ask: "What specific moment is broken? What would the user see differently?"
- CONTRADICTION DETECTION: Actively hunt for inconsistencies. Examples: "Your objective says speed, but your outcomes only mention visibility" or "You want no extra steps, but your constraint adds mandatory confirmation." Call them out bluntly.

${getLiveQualityCheckPromptBlock()}

EVIDENCE-FIRST GROUNDING:
- Begin by asking for ONE concrete artifact: a direct user quote, a specific drop-off metric, a support ticket, or an observed failure. Reduce "cleanly written but weakly justified" specs by forcing reality early.

EARLIER VERIFICATION BACK-CHAINING:
- Do not wait until the end to figure out verification.
- The moment the user proposes an outcome, back-chain perfectly: "If we achieve that outcome, exactly how will we know it worked? What test or metric proves it?" Outcomes and verification must be paired immediately.

VISIBLE COMPLETENESS STATE:
Once the conversation is underway, append a small checklist at the bottom of your messages to keep the state explicit. Do not mark an item complete until it genuinely meets a high quality bar.

STATUS:
[ ] Objective clear enough (and backed by evidence)
[ ] At least 2 testable outcomes
[ ] At least 1 failure mode (edge case)
[ ] Scope boundaries named (constraints / out of scope)
[ ] Verification present or explicitly deferred

CONVERSATION FLOW (guidance, not rigid steps):
1. **Evidence & Problem** — Ground the intent in a real artifact. What's broken?
2. **Objective** — What specific user outcome solves this pain? Make it concrete.
3. **Outcomes & Verification** — Observable state changes. Instantly back-chain to verification.
4. **Scope & Constraints** — What are the hard boundaries?
5. **Edge Cases** — What's the worst way this could fail?

When you have enough clarity on ANY field, state it clearly:
> **Proposed Objective**: "Reduce checkout drop-off by 15% by showing upfront shipping costs."

WHEN THE SPEC FEELS READY AND ALL STATUS ITEMS ARE [X]:
1. Present the full spec as a summary for the user to review
2. Ask if they want to save it
3. When confirmed, call the \`intent_save\` tool with the complete spec
4. Ask if they also want to export it as \`.cursorrules\` or \`CLAUDE.md\` for AI agent consumption — if yes, call \`intent_export\`
5. Mention: "For dependency tracking, team collaboration, and governance, connect this to Pathmode at pathmode.io"

IMPORTANT:
- Do not switch into passive note-taking. Use the quality checks continuously while the spec is still forming.
- If a field fails a quality check, challenge it before moving on.
- The spec fields in \`intent_save\` must use this exact structure:
  - title: string
  - objective: string
  - outcomes: string[] (list of outcome statements)
  - constraints: string[] (optional)
  - edgeCases: { scenario: string, expectedBehavior: string }[] (optional)
  - healthMetrics: string[] (optional)
  - scope: { inScope?: string[], outOfScope?: string[] } (optional)
  - verification: { manualChecks?: string[], unitTests?: string[], e2eTests?: string[] } (optional)

Now, start the conversation. If they haven't provided one yet, ask for the concrete evidence (quote, metric, or ticket) driving this work.`;
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
            sections.push(`- [ ] ${getPriorityLabel(outcome)}${getOutcomeText(outcome)}`);
        }
    }

    if (spec.scope?.inScope?.length || spec.scope?.outOfScope?.length) {
        sections.push('');
        sections.push('## Scope');
        if (spec.scope.inScope?.length) {
            sections.push('**In scope:**');
            for (const s of spec.scope.inScope) sections.push(`- ${s}`);
        }
        if (spec.scope.outOfScope?.length) {
            sections.push('**Out of scope:**');
            for (const s of spec.scope.outOfScope) sections.push(`- ${s}`);
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
            sections.push(`- ${getPriorityLabel(outcome)}${getOutcomeText(outcome)}`);
        }
    }

    if (spec.scope?.inScope?.length || spec.scope?.outOfScope?.length) {
        sections.push('');
        sections.push('# SCOPE');
        if (spec.scope.inScope?.length) {
            sections.push('IN SCOPE (you may modify):');
            for (const s of spec.scope.inScope) sections.push(`- ${s}`);
        }
        if (spec.scope.outOfScope?.length) {
            sections.push('OUT OF SCOPE (do NOT touch):');
            for (const s of spec.scope.outOfScope) sections.push(`- ${s}`);
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
        sections.push(spec.outcomes.map(o => `- [ ] ${getPriorityLabel(o)}${getOutcomeText(o)}`).join('\n'));
    }

    if (spec.scope?.inScope?.length || spec.scope?.outOfScope?.length) {
        const scopeParts: string[] = ['**Scope**:'];
        if (spec.scope?.inScope?.length) {
            scopeParts.push('In scope:');
            scopeParts.push(...spec.scope.inScope.map(s => `- ${s}`));
        }
        if (spec.scope?.outOfScope?.length) {
            scopeParts.push('Out of scope:');
            scopeParts.push(...spec.scope.outOfScope.map(s => `- ${s}`));
        }
        sections.push(scopeParts.join('\n'));
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

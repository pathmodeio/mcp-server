#!/usr/bin/env node

/**
 * Pathmode MCP Server
 * Connects Claude Code, Cursor, and other AI agents to your Intent Layer.
 *
 * Usage:
 *   npx @pathmode/mcp-server            # Cloud mode (uses ~/.pathmode/config.json)
 *   npx @pathmode/mcp-server --local     # Local mode (reads intent.md from cwd)
 *
 * Add to .claude/settings.json:
 *   {
 *     "mcpServers": {
 *       "pathmode": {
 *         "command": "npx",
 *         "args": ["@pathmode/mcp-server"],
 *         "env": { "PATHMODE_API_KEY": "pm_live_..." }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PathmodeClient, loadConfig } from './api-client';
import { readLocalIntents } from './local-reader';

const isLocalMode = process.argv.includes('--local');

let client: PathmodeClient | null = null;

if (!isLocalMode) {
    const config = loadConfig();
    if (!config) {
        console.error(
            'No Pathmode configuration found. Either:\n' +
            '  1. Run `intentspec login` to configure\n' +
            '  2. Set PATHMODE_API_KEY environment variable\n' +
            '  3. Use --local flag for offline mode'
        );
        process.exit(1);
    }
    client = new PathmodeClient(config);
}

// ============================================================
// Server Setup
// ============================================================

const server = new McpServer({
    name: 'pathmode',
    version: '1.1.0',
});

// Annotation presets
const READ_ONLY = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE_OP = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

// ============================================================
// Tools — Read Operations
// ============================================================

server.registerTool(
    'get_current_intent',
    {
        title: 'Get Current Intent',
        description: 'Get the currently active intent (first approved, or most recently updated). Returns the full IntentSpec with objective, outcomes, constraints, and edge cases.',
        inputSchema: { status: z.string().optional().describe('Filter by status: draft, validated, approved, shipped, verified') },
        annotations: READ_ONLY,
    },
    async ({ status }) => {
        if (isLocalMode) {
            const intents = readLocalIntents();
            const filtered = status ? intents.filter(i => i.status === status) : intents;
            const current = filtered[0];
            if (!current) {
                return { content: [{ type: 'text', text: 'No intents found locally.' }] };
            }
            return { content: [{ type: 'text', text: JSON.stringify(current, null, 2) }] };
        }

        const intents = await client!.listIntents(status || 'approved');
        if (intents.length === 0) {
            const allIntents = await client!.listIntents();
            if (allIntents.length === 0) {
                return { content: [{ type: 'text', text: 'No intents found in workspace.' }] };
            }
            return { content: [{ type: 'text', text: JSON.stringify(allIntents[0], null, 2) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(intents[0], null, 2) }] };
    }
);

server.registerTool(
    'list_intents',
    {
        title: 'List Intents',
        description: 'List all intents in the workspace. Returns an array of IntentSpecs with their status, objectives, and metadata.',
        inputSchema: { status: z.string().optional().describe('Filter by status: draft, validated, approved, shipped, verified') },
        annotations: READ_ONLY,
    },
    async ({ status }) => {
        if (isLocalMode) {
            const intents = readLocalIntents();
            const filtered = status ? intents.filter(i => i.status === status) : intents;
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ intents: filtered, count: filtered.length }, null, 2)
                }]
            };
        }

        const intents = await client!.listIntents(status);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ intents, count: intents.length }, null, 2)
            }]
        };
    }
);

server.registerTool(
    'get_intent',
    {
        title: 'Get Intent',
        description: 'Get a single intent by ID with full details including objective, outcomes, constraints, edge cases, and relations.',
        inputSchema: { intentId: z.string().describe('The intent ID to fetch') },
        annotations: READ_ONLY,
    },
    async ({ intentId }) => {
        if (isLocalMode) {
            const intents = readLocalIntents();
            const intent = intents.find(i => i.id === intentId);
            if (!intent) {
                return { content: [{ type: 'text', text: `No intent found with ID "${intentId}" locally.` }] };
            }
            return { content: [{ type: 'text', text: JSON.stringify(intent, null, 2) }] };
        }

        try {
            const intent = await client!.getIntent(intentId);
            return { content: [{ type: 'text', text: JSON.stringify(intent, null, 2) }] };
        } catch (e: any) {
            return { content: [{ type: 'text', text: `Failed to fetch intent: ${e.message}` }] };
        }
    }
);

server.registerTool(
    'get_intent_relations',
    {
        title: 'Get Intent Relations',
        description: 'Get the dependency graph for a specific intent. Shows what it depends on, enables, or blocks.',
        inputSchema: { intentId: z.string().describe('The intent ID to get relations for') },
        annotations: READ_ONLY,
    },
    async ({ intentId }) => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Relations are not available in local mode.' }] };
        }

        const intent = await client!.getIntent(intentId);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    intentId: intent.id,
                    userGoal: intent.userGoal,
                    relations: intent.relations,
                }, null, 2)
            }]
        };
    }
);

server.registerTool(
    'search_intents',
    {
        title: 'Search Intents',
        description: 'Search intents by keyword. Searches across user goals, objectives, outcomes, and constraints.',
        inputSchema: {
            query: z.string().describe('Search keyword or phrase'),
            status: z.string().optional().describe('Filter by status: draft, validated, approved, shipped, verified'),
        },
        annotations: READ_ONLY,
    },
    async ({ query, status }) => {
        if (isLocalMode) {
            const intents = readLocalIntents();
            const q = query.toLowerCase();
            const matches = intents.filter(i => {
                const text = [i.userGoal, i.objective, ...i.outcomes, ...i.constraints].join(' ').toLowerCase();
                return text.includes(q) && (!status || i.status === status);
            });
            return { content: [{ type: 'text', text: JSON.stringify({ results: matches, count: matches.length, query }, null, 2) }] };
        }

        try {
            const intents = await client!.listIntents(status);
            const q = query.toLowerCase();
            const matches = intents.filter(i => {
                const text = [i.userGoal, i.objective, ...(i.outcomes || []), ...(i.constraints || [])].join(' ').toLowerCase();
                return text.includes(q);
            });
            const results = matches.map(i => ({
                id: i.id,
                userGoal: i.userGoal,
                objective: i.objective,
                status: i.status,
                stageName: i.stageName,
            }));
            return { content: [{ type: 'text', text: JSON.stringify({ results, count: results.length, query }, null, 2) }] };
        } catch (e: any) {
            return { content: [{ type: 'text', text: `Search failed: ${e.message}` }] };
        }
    }
);

server.registerTool(
    'analyze_intent_graph',
    {
        title: 'Analyze Intent Graph',
        description: 'Analyze the intent dependency graph for risks and strategic insights. Returns critical path, cycles, bottlenecks, orphans, status mismatches, and stalled intents.',
        inputSchema: {
            analysis: z.enum(['full', 'critical-path', 'risks', 'status']).optional()
                .describe('Type of analysis: full (default), critical-path, risks, or status distribution'),
        },
        annotations: READ_ONLY,
    },
    async ({ analysis }) => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Graph analysis requires cloud mode.' }] };
        }

        try {
            const intents = await client!.listIntents();
            if (intents.length === 0) {
                return { content: [{ type: 'text', text: 'No intents found in workspace.' }] };
            }

            const specMap = new Map(intents.map(i => [i.id, i]));
            const type = analysis || 'full';

            if (type === 'status') {
                const dist: Record<string, number> = { draft: 0, validated: 0, approved: 0, shipped: 0, verified: 0 };
                for (const i of intents) dist[i.status] = (dist[i.status] || 0) + 1;
                return { content: [{ type: 'text', text: JSON.stringify({ statusDistribution: dist, total: intents.length }, null, 2) }] };
            }

            // Build dependency graph
            const specIds = new Set(intents.map(i => i.id));
            const forward = new Map<string, Set<string>>();
            const reverse = new Map<string, Set<string>>();
            for (const id of specIds) { forward.set(id, new Set()); reverse.set(id, new Set()); }
            for (const intent of intents) {
                for (const rel of intent.relations || []) {
                    if (rel.type === 'depends_on' && specIds.has(rel.targetId)) {
                        forward.get(intent.id)!.add(rel.targetId);
                        reverse.get(rel.targetId)!.add(intent.id);
                    }
                }
            }

            // Detect cycles
            const WHITE = 0, GRAY = 1, BLACK = 2;
            const color = new Map<string, number>();
            const parent = new Map<string, string | null>();
            const cycles: string[][] = [];
            for (const id of forward.keys()) color.set(id, WHITE);
            for (const startId of forward.keys()) {
                if (color.get(startId) !== WHITE) continue;
                const stack: string[] = [startId];
                parent.set(startId, null);
                while (stack.length > 0) {
                    const id = stack[stack.length - 1];
                    if (color.get(id) === WHITE) {
                        color.set(id, GRAY);
                        for (const dep of forward.get(id) || new Set()) {
                            if (color.get(dep) === WHITE) { parent.set(dep, id); stack.push(dep); }
                            else if (color.get(dep) === GRAY) {
                                const cycle: string[] = [dep];
                                let cur = id;
                                while (cur !== dep) { cycle.push(cur); cur = parent.get(cur)!; }
                                cycle.push(dep); cycle.reverse(); cycles.push(cycle);
                            }
                        }
                    } else { color.set(id, BLACK); stack.pop(); }
                }
            }

            // Critical path (longest path via topo sort)
            let criticalPath: string[] = [];
            if (cycles.length === 0) {
                const topoInDegree = new Map<string, number>();
                for (const id of specIds) topoInDegree.set(id, (forward.get(id) || new Set()).size);
                const queue: string[] = [];
                for (const [id, deg] of topoInDegree) { if (deg === 0) queue.push(id); }
                const dist = new Map<string, number>();
                const prev = new Map<string, string | null>();
                for (const id of specIds) { dist.set(id, 1); prev.set(id, null); }
                while (queue.length > 0) {
                    const id = queue.shift()!;
                    for (const dep of reverse.get(id) || new Set()) {
                        const newDist = dist.get(id)! + 1;
                        if (newDist > dist.get(dep)!) { dist.set(dep, newDist); prev.set(dep, id); }
                        topoInDegree.set(dep, topoInDegree.get(dep)! - 1);
                        if (topoInDegree.get(dep) === 0) queue.push(dep);
                    }
                }
                let maxDist = 0, endNode: string | null = null;
                for (const [id, d] of dist) { if (d > maxDist) { maxDist = d; endNode = id; } }
                if (endNode) {
                    let cur: string | null = endNode;
                    while (cur) { criticalPath.push(cur); cur = prev.get(cur) || null; }
                    criticalPath.reverse();
                }
            }

            // Bottlenecks
            const bottlenecks: { id: string; userGoal: string; dependentCount: number; status: string }[] = [];
            for (const [id, dependents] of reverse) {
                if (dependents.size >= 3) {
                    const spec = specMap.get(id);
                    bottlenecks.push({ id, userGoal: spec?.userGoal || 'Untitled', dependentCount: dependents.size, status: spec?.status || 'unknown' });
                }
            }

            // Orphans
            const orphans: string[] = [];
            for (const intent of intents) {
                const hasRelations = intent.relations && intent.relations.length > 0;
                const isTargeted = intents.some(i => i.relations?.some(r => r.targetId === intent.id));
                if (!hasRelations && !isTargeted) orphans.push(intent.id);
            }

            // Status distribution
            const statusDist: Record<string, number> = { draft: 0, validated: 0, approved: 0, shipped: 0, verified: 0 };
            for (const i of intents) statusDist[i.status] = (statusDist[i.status] || 0) + 1;

            if (type === 'critical-path') {
                const pathDetails = criticalPath.map(id => {
                    const s = specMap.get(id);
                    return { id, userGoal: s?.userGoal || 'Untitled', status: s?.status || 'unknown' };
                });
                return { content: [{ type: 'text', text: JSON.stringify({ criticalPath: pathDetails, length: criticalPath.length }, null, 2) }] };
            }

            if (type === 'risks') {
                const risks: { type: string; severity: string; message: string }[] = [];
                for (const cycle of cycles) {
                    const names = cycle.slice(0, -1).map(id => specMap.get(id)?.userGoal || 'Untitled');
                    risks.push({ type: 'cycle', severity: 'critical', message: `Circular dependency: ${names.join(' \u2192 ')}` });
                }
                for (const b of bottlenecks) {
                    const isDraft = b.status === 'draft' || b.status === 'validated';
                    risks.push({ type: 'bottleneck', severity: isDraft ? 'critical' : 'warning', message: `"${b.userGoal}" blocks ${b.dependentCount} intents${isDraft ? ` and is still ${b.status}` : ''}` });
                }
                return { content: [{ type: 'text', text: JSON.stringify({ risks }, null, 2) }] };
            }

            // Full analysis
            const result = {
                summary: { total: intents.length, statusDistribution: statusDist },
                criticalPath: criticalPath.map(id => {
                    const s = specMap.get(id);
                    return { id, userGoal: s?.userGoal || 'Untitled', status: s?.status || 'unknown' };
                }),
                cycles: cycles.map(c => c.slice(0, -1).map(id => ({ id, userGoal: specMap.get(id)?.userGoal || 'Untitled' }))),
                bottlenecks,
                orphanCount: orphans.length,
            };

            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
            return { content: [{ type: 'text', text: `Graph analysis failed: ${e.message}` }] };
        }
    }
);

server.registerTool(
    'export_context',
    {
        title: 'Export Context',
        description: 'Export workspace context as a formatted file. Use "claude-md" for CLAUDE.md (full workspace context), "cursorrules" for Cursor AI rules, or "intent-md" for a single intent specification file.',
        inputSchema: {
            format: z.enum(['claude-md', 'cursorrules', 'intent-md']).describe('Export format'),
            intentId: z.string().optional().describe('Intent ID (optional, for cursorrules and intent-md)'),
        },
        annotations: READ_ONLY,
    },
    async ({ format, intentId }) => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Export requires cloud mode. Use PATHMODE_API_KEY to connect.' }] };
        }

        try {
            const content = await client!.exportContext(format, intentId);
            return { content: [{ type: 'text', text: content }] };
        } catch (e: any) {
            return { content: [{ type: 'text', text: `Export failed: ${e.message}` }] };
        }
    }
);

server.registerTool(
    'get_agent_prompt',
    {
        title: 'Get Agent Prompt',
        description: 'Get a formatted execution prompt for a specific intent. This is the full structured prompt including objective, outcomes, constraints, edge cases, and verification steps.',
        inputSchema: {
            intentId: z.string().describe('The intent ID to generate a prompt for'),
            mode: z.enum(['draft', 'execute']).optional().describe('draft = critique the spec, execute = implement it'),
        },
        annotations: READ_ONLY,
    },
    async ({ intentId, mode }) => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Agent prompts require cloud mode for full context generation.' }] };
        }

        const result = await client!.getIntentPrompt(intentId, 'claude-code', mode || 'execute');
        return {
            content: [{
                type: 'text',
                text: result.prompt
            }]
        };
    }
);

server.registerTool(
    'get_workspace',
    {
        title: 'Get Workspace',
        description: 'Get workspace details including strategy (vision, non-negotiables, architecture principles) and constitution rules.',
        annotations: READ_ONLY,
    },
    async () => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Workspace details are not available in local mode.' }] };
        }

        const workspace = await client!.getWorkspace();
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(workspace, null, 2)
            }]
        };
    }
);

server.registerTool(
    'get_constitution',
    {
        title: 'Get Constitution',
        description: 'Get the workspace constitution rules. These are mandatory constraints that all implementations must respect.',
        annotations: READ_ONLY,
    },
    async () => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Constitution rules are not available in local mode.' }] };
        }

        const result = await client!.getConstitution();
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };
    }
);

// ============================================================
// Tools — Write Operations
// ============================================================

server.registerTool(
    'update_intent_status',
    {
        title: 'Update Intent Status',
        description: 'Update the status of an intent. Use this to mark an intent as shipped after implementation, or verified after testing.',
        inputSchema: {
            intentId: z.string().describe('The intent ID to update'),
            status: z.enum(['draft', 'validated', 'approved', 'shipped', 'verified']).describe('The new status'),
        },
        annotations: { ...WRITE_OP, idempotentHint: true },
    },
    async ({ intentId, status }) => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Status updates are not available in local mode. Use cloud mode.' }] };
        }

        const result = await client!.updateIntentStatus(intentId, status);
        return {
            content: [{
                type: 'text',
                text: `Intent ${intentId} status updated to "${status}". ${JSON.stringify(result)}`
            }]
        };
    }
);

server.registerTool(
    'log_implementation_note',
    {
        title: 'Log Implementation Note',
        description: 'Record a technical decision or implementation note for an intent. Use this to document why you chose a specific approach.',
        inputSchema: {
            intentId: z.string().describe('The intent ID to attach the note to'),
            note: z.string().describe('The implementation note or technical decision'),
        },
        annotations: WRITE_OP,
    },
    async ({ intentId, note }) => {
        if (isLocalMode) {
            return { content: [{ type: 'text', text: 'Notes are not available in local mode. Use cloud mode.' }] };
        }

        const result = await client!.logNote(intentId, note, 'mcp');
        return {
            content: [{
                type: 'text',
                text: `Note logged for intent ${intentId}: "${note}"`
            }]
        };
    }
);

// ============================================================
// Prompts
// ============================================================

server.prompt(
    'implement-intent',
    'Get full implementation context for a specific intent, including objective, outcomes, constraints, edge cases, and verification steps.',
    {
        intentId: z.string().describe('The intent ID to implement'),
    },
    async ({ intentId }) => {
        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: `I need to implement intent ${intentId}. Please:\n1. Use the get_agent_prompt tool to fetch the full execution prompt for this intent\n2. Use get_constitution to check for workspace constraints I must respect\n3. Review the intent details and create an implementation plan\n4. After implementation, use update_intent_status to mark it as "shipped"\n5. Use log_implementation_note to document key technical decisions`,
                },
            }],
        };
    }
);

server.prompt(
    'review-risks',
    'Analyze the intent graph for architectural risks, circular dependencies, bottlenecks, and stalled work.',
    {},
    async () => {
        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: 'Please analyze our intent graph for risks:\n1. Use analyze_intent_graph with analysis "full" to get the complete graph analysis\n2. Summarize the critical path and explain why it matters\n3. Flag any cycles (circular dependencies) as urgent issues\n4. Identify bottlenecks \u2014 intents that block many others, especially if still in draft\n5. Suggest concrete actions to reduce risk',
                },
            }],
        };
    }
);

server.prompt(
    'what-next',
    'Suggest the highest-priority intent to work on next, based on dependency graph analysis and current status.',
    {},
    async () => {
        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: 'Help me decide what to work on next:\n1. Use analyze_intent_graph with analysis "critical-path" to find the critical path\n2. Use list_intents with status "approved" to see what\'s ready for implementation\n3. Consider: which approved intents are on the critical path? Which unblock the most other work?\n4. Recommend the single highest-impact intent to implement next, and explain why',
                },
            }],
        };
    }
);

// ============================================================
// Resources
// ============================================================

server.resource(
    'intent://current',
    'intent://current',
    async (uri) => {
        if (isLocalMode) {
            const intents = readLocalIntents();
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(intents[0] || null, null, 2),
                }]
            };
        }

        const intents = await client!.listIntents('approved');
        const current = intents[0] || (await client!.listIntents())[0] || null;
        return {
            contents: [{
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(current, null, 2),
            }]
        };
    }
);

server.resource(
    'intent://graph',
    'intent://graph',
    async (uri) => {
        if (isLocalMode) {
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify({ error: 'Graph not available in local mode' }),
                }]
            };
        }

        const intents = await client!.listIntents();
        const graph = intents.map(i => ({
            id: i.id,
            userGoal: i.userGoal,
            status: i.status,
            relations: i.relations,
        }));

        return {
            contents: [{
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(graph, null, 2),
            }]
        };
    }
);

server.resource(
    'intent://workspace-strategy',
    'intent://workspace-strategy',
    async (uri) => {
        if (isLocalMode) {
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify({ error: 'Workspace strategy not available in local mode' }),
                }]
            };
        }

        try {
            const workspace = await client!.getWorkspace();
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify({
                        name: workspace.name,
                        strategy: workspace.strategy,
                        constitutionRules: workspace.constitutionRules?.filter(r => r.isActive),
                    }, null, 2),
                }]
            };
        } catch {
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify({ error: 'Failed to fetch workspace strategy' }),
                }]
            };
        }
    }
);

// ============================================================
// Start
// ============================================================

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Failed to start Pathmode MCP server:', error);
    process.exit(1);
});

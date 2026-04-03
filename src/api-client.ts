/**
 * Pathmode API Client for MCP Server
 * Replicates the CLI api-client for standalone packaging.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const isDebug = process.env.PATHMODE_MCP_DEBUG === '1';

export interface PathmodeConfig {
    apiKey: string;
    apiUrl: string;
    workspaceId: string;
}

export interface ApiStructuredOutcome {
    id: string;
    text: string;
    priority?: 'must' | 'should' | 'could';
}

export interface ApiIntent {
    id: string;
    workspaceId: string;
    productId?: string;
    stageName?: string;
    status: string;
    version: number;
    objective: string;
    problemSeverity?: string;
    title: string;
    outcomes: ApiStructuredOutcome[];
    healthMetrics: string[];
    scope?: { inScope?: string[]; outOfScope?: string[] };
    strategicAlignment?: string;
    alignmentNotes?: string;
    context: Record<string, any>;
    constraints: string[];
    verification: Record<string, any>;
    externalLinks: any[];
    evidenceAnchors: Record<string, string[]>;
    createdAt: string;
    updatedAt: string;
    shippedAt?: string;
    verifiedAt?: string;
    edgeCases: { id: string; scenario: string; expectedBehavior: string }[];
    evidenceIds: string[];
    relations: { targetId: string; type: string }[];
}

export interface CreateIntentInput {
    title: string;
    objective: string;
    productId: string;
    outcomes?: (string | { text: string; priority?: string })[];
    constraints?: string[];
    healthMetrics?: string[];
    edgeCases?: { scenario: string; expectedBehavior: string }[];
    verification?: { manualChecks?: string[]; unitTests?: string[]; e2eTests?: string[] };
    problemSeverity?: string;
    scope?: { inScope?: string[]; outOfScope?: string[] };
}

export interface UpdateIntentInput {
    title?: string;
    objective?: string;
    outcomes?: (string | { text: string; priority?: string })[];
    constraints?: string[];
    healthMetrics?: string[];
    edgeCases?: { scenario: string; expectedBehavior: string }[];
    verification?: { manualChecks?: string[]; unitTests?: string[]; e2eTests?: string[] };
    problemSeverity?: string;
    evidenceAnchors?: Record<string, string[]>;
    scope?: { inScope?: string[]; outOfScope?: string[] };
}

export interface EvidenceQuery {
    productId?: string;
    type?: string;
    severity?: string;
    tags?: string;
    search?: string;
    limit?: number;
}

export interface CreateEvidenceInput {
    content: string;
    type: string;
    productId: string;
    source?: string;
    sourceUrl?: string;
    severity?: string;
    sentiment?: string;
    tags?: string[];
    stage?: string;
}

export interface LinkEvidenceInput {
    link?: string[];
    unlink?: string[];
}

export interface ApiVerificationResult {
    pass: boolean;
    score: number;
    results: { item: string; category: string; status: string; reasoning: string }[];
    summary: string;
}

export interface ApiEvidence {
    id: string;
    productId: string;
    workspaceId: string;
    type: string;
    content: string;
    source?: string;
    sourceUrl?: string;
    severity?: string;
    sentiment?: string;
    tags: string[];
    stage?: string;
    linkedIntentIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ApiWorkspace {
    id: string;
    name: string;
    urlKey?: string;
    tags: string[];
    strategy: {
        vision?: string;
        tradeoffs?: string[];
        nonNegotiables?: string[];
        architecturePrinciples?: string[];
    } | null;
    products?: ApiProduct[];
    constitutionRules: {
        id: string;
        category: string;
        text: string;
        isActive: boolean;
        createdAt: string;
    }[];
}

export interface ApiProduct {
    id: string;
    workspaceId: string;
    name: string;
    slug: string;
    description?: string;
    productVision?: string;
    northStar?: string;
    targetAudience?: string;
    defaultContext?: Record<string, any>;
    manifest?: Record<string, any>;
    icon?: string;
    color?: string;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.pathmode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): PathmodeConfig | null {
    if (process.env.PATHMODE_API_KEY) {
        return {
            apiKey: process.env.PATHMODE_API_KEY,
            apiUrl: process.env.PATHMODE_API_URL || 'https://pathmode.io',
            workspaceId: process.env.PATHMODE_WORKSPACE_ID || '',
        };
    }

    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    return null;
}

export class PathmodeClient {
    private apiKey: string;
    private apiUrl: string;
    private workspaceId: string;

    constructor(config: PathmodeConfig) {
        this.apiKey = config.apiKey;
        this.apiUrl = config.apiUrl.replace(/\/$/, '');
        this.workspaceId = config.workspaceId;
    }

    private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
        const url = `${this.apiUrl}/api/v1${path}`;
        if (isDebug) console.error(`[pathmode-mcp] fetch: ${url}`);
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
            console.error(`[pathmode-mcp] API error ${response.status}: ${body.error || response.statusText}`);
            throw new Error(`API error (${response.status}): ${body.error || response.statusText}`);
        }

        return response;
    }

    async listIntents(status?: string): Promise<ApiIntent[]> {
        const params = status ? `?status=${status}` : '';
        const res = await this.fetch(`/intents${params}`);
        const data = await res.json() as { intents: ApiIntent[] };
        return data.intents;
    }

    async getIntent(id: string): Promise<ApiIntent> {
        const res = await this.fetch(`/intents/${id}`);
        return res.json() as Promise<ApiIntent>;
    }

    async getIntentPrompt(id: string, agentType = 'claude-code', mode = 'execute'): Promise<{ prompt: string; json: object }> {
        const res = await this.fetch(`/intents/${id}/prompt?agent_type=${agentType}&mode=${mode}`);
        return res.json() as Promise<{ prompt: string; json: object }>;
    }

    async updateIntentStatus(id: string, status: string): Promise<{
        id: string;
        status: string;
        updatedAt: string;
        shippedAt?: string;
        verifiedAt?: string;
        verificationChecklist?: { text: string; category: string }[];
        verificationChecklistCount?: number;
    }> {
        const res = await this.fetch(`/intents/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        return res.json() as any;
    }

    async logNote(intentId: string, note: string, source = 'mcp'): Promise<any> {
        const res = await this.fetch(`/intents/${intentId}/notes`, {
            method: 'POST',
            body: JSON.stringify({ note, source }),
        });
        return res.json();
    }

    async getWorkspace(): Promise<ApiWorkspace> {
        const res = await this.fetch('/workspace');
        return res.json() as Promise<ApiWorkspace>;
    }

    async getConstitution(): Promise<any> {
        const res = await this.fetch('/workspace/constitution');
        return res.json();
    }

    async exportClaudeMd(): Promise<string> {
        const res = await this.fetch('/export?format=claude-md');
        return res.text();
    }

    async exportContext(format: 'claude-md' | 'cursorrules' | 'intent-md', intentId?: string, productId?: string): Promise<string> {
        const params = new URLSearchParams({ format });
        if (intentId) params.set('intent_id', intentId);
        if (productId) params.set('product_id', productId);
        const res = await this.fetch(`/export?${params.toString()}`);
        return res.text();
    }

    // --- Write operations (v1.3.0) ---

    async createIntent(input: CreateIntentInput): Promise<ApiIntent> {
        const res = await this.fetch('/intents', {
            method: 'POST',
            body: JSON.stringify(input),
        });
        return res.json() as Promise<ApiIntent>;
    }

    async updateIntent(id: string, updates: UpdateIntentInput): Promise<ApiIntent> {
        const res = await this.fetch(`/intents/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return res.json() as Promise<ApiIntent>;
    }

    async queryEvidence(filters: EvidenceQuery = {}): Promise<{ evidence: ApiEvidence[]; count: number }> {
        const params = new URLSearchParams();
        for (const [key, val] of Object.entries(filters)) {
            if (val !== undefined && val !== null) params.set(key, String(val));
        }
        const qs = params.toString();
        const res = await this.fetch(`/evidence${qs ? `?${qs}` : ''}`);
        return res.json() as Promise<{ evidence: ApiEvidence[]; count: number }>;
    }

    async createEvidence(input: CreateEvidenceInput): Promise<ApiEvidence> {
        const res = await this.fetch('/evidence', {
            method: 'POST',
            body: JSON.stringify(input),
        });
        return res.json() as Promise<ApiEvidence>;
    }

    async linkEvidence(intentId: string, body: LinkEvidenceInput): Promise<{ intentId: string; evidenceIds: string[]; linked: number; unlinked: number }> {
        const res = await this.fetch(`/intents/${intentId}/evidence`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return res.json() as Promise<{ intentId: string; evidenceIds: string[]; linked: number; unlinked: number }>;
    }

    async verifyImplementation(intentId: string, summary: string, codeChanges?: string): Promise<ApiVerificationResult> {
        const res = await this.fetch(`/intents/${intentId}/verify`, {
            method: 'POST',
            body: JSON.stringify({ summary, codeChanges }),
        });
        return res.json() as Promise<ApiVerificationResult>;
    }

}

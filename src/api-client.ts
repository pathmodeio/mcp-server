/**
 * Pathmode API Client for MCP Server
 * Replicates the CLI api-client for standalone packaging.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export interface PathmodeConfig {
    apiKey: string;
    apiUrl: string;
    workspaceId: string;
}

export interface ApiIntent {
    id: string;
    workspaceId: string;
    journeyId?: string;
    stageId?: string;
    stageName?: string;
    status: string;
    version: number;
    objective: string;
    problemSeverity?: string;
    userGoal: string;
    outcomes: string[];
    healthMetrics: string[];
    strategicAlignment?: string;
    alignmentNotes?: string;
    preconditions: Record<string, any>;
    context: Record<string, any>;
    constraints: string[];
    verification: Record<string, any>;
    externalLinks: any[];
    createdAt: string;
    updatedAt: string;
    shippedAt?: string;
    verifiedAt?: string;
    edgeCases: { id: string; scenario: string; expectedBehavior: string }[];
    evidenceIds: string[];
    relations: { targetId: string; type: string }[];
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
    constitutionRules: {
        id: string;
        category: string;
        text: string;
        isActive: boolean;
        createdAt: string;
    }[];
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

    async updateIntentStatus(id: string, status: string): Promise<any> {
        const res = await this.fetch(`/intents/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        return res.json();
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

    async exportContext(format: 'claude-md' | 'cursorrules' | 'intent-md', intentId?: string): Promise<string> {
        const params = new URLSearchParams({ format });
        if (intentId) params.set('intent_id', intentId);
        const res = await this.fetch(`/export?${params.toString()}`);
        return res.text();
    }
}

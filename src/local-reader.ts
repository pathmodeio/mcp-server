/**
 * Local Intent Reader
 * Reads intent.md files from the current working directory for offline/local mode.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface LocalIntent {
    id: string;
    status: string;
    version: number;
    objective: string;
    userGoal: string;
    stageName?: string;
    severity?: string;
    outcomes: string[];
    constraints: string[];
    edgeCases: { scenario: string; expectedBehavior: string }[];
    healthMetrics: string[];
    verification: Record<string, any>;
    source: 'local';
}

/**
 * Read all intent.md files from the current directory and subdirectories (1 level deep).
 */
export function readLocalIntents(): LocalIntent[] {
    const cwd = process.cwd();
    const intents: LocalIntent[] = [];

    // Check root intent.md
    const rootIntent = readIntentFile(path.join(cwd, 'intent.md'));
    if (rootIntent) intents.push(rootIntent);

    // Check .pathmode/ directory for multiple intents
    const pathmodeDir = path.join(cwd, '.pathmode', 'intents');
    if (fs.existsSync(pathmodeDir)) {
        const files = fs.readdirSync(pathmodeDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const intent = readIntentFile(path.join(pathmodeDir, file));
            if (intent) intents.push(intent);
        }
    }

    return intents;
}

/**
 * Parse a single intent.md file with YAML frontmatter.
 */
function readIntentFile(filePath: string): LocalIntent | null {
    if (!fs.existsSync(filePath)) return null;

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data, content: body } = matter(content);

        // Extract sections from markdown body
        const outcomes = extractListSection(body, 'Outcomes');
        const constraints = extractListSection(body, 'Constraints');
        const healthMetrics = extractListSection(body, 'Health Metrics');
        const edgeCases = extractEdgeCases(body);

        return {
            id: data.id || path.basename(filePath, '.md'),
            status: data.status || 'draft',
            version: data.version || 1,
            objective: data.objective || extractSection(body, 'Objective') || '',
            userGoal: data.userGoal || extractTitle(body) || 'Untitled Intent',
            stageName: data.stage || undefined,
            severity: data.severity || undefined,
            outcomes,
            constraints,
            edgeCases,
            healthMetrics,
            verification: data.verification || {},
            source: 'local',
        };
    } catch (e) {
        console.error(`Failed to read intent file ${filePath}:`, e);
        return null;
    }
}

// ============================================================
// Markdown Parsing Helpers
// ============================================================

function extractTitle(body: string): string {
    const match = body.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '';
}

function extractSection(body: string, heading: string): string {
    const regex = new RegExp(`^##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=^##\\s|$)`, 'm');
    const match = body.match(regex);
    return match ? match[1].trim() : '';
}

function extractListSection(body: string, heading: string): string[] {
    const section = extractSection(body, heading);
    if (!section) return [];

    return section
        .split('\n')
        .filter(line => line.match(/^[-*]\s/))
        .map(line => line.replace(/^[-*]\s+(\[.\]\s+)?/, '').trim())
        .filter(Boolean);
}

function extractEdgeCases(body: string): { scenario: string; expectedBehavior: string }[] {
    const section = extractSection(body, 'Edge Cases');
    if (!section) return [];

    const cases: { scenario: string; expectedBehavior: string }[] = [];
    const lines = section.split('\n').filter(line => line.match(/^[-*]\s/));

    for (const line of lines) {
        const clean = line.replace(/^[-*]\s+/, '');
        // Pattern: **scenario**: expected behavior
        const match = clean.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
        if (match) {
            cases.push({ scenario: match[1], expectedBehavior: match[2] });
        } else {
            // Pattern: scenario → expected behavior
            const arrowMatch = clean.match(/^(.+?)\s*[→:]\s*(.+)$/);
            if (arrowMatch) {
                cases.push({ scenario: arrowMatch[1].trim(), expectedBehavior: arrowMatch[2].trim() });
            }
        }
    }

    return cases;
}

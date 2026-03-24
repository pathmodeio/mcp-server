/**
 * Pathmode MCP Setup Command
 *
 * Auto-detects AI tools (Claude Code, Claude Desktop, Cursor, Windsurf)
 * and configures the MCP server with a single command.
 *
 * Usage:
 *   npx @pathmode/mcp-server setup pm_live_xxxxx
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Config file locations per tool ───────────────────────────

interface ToolConfig {
    name: string;
    paths: () => string[]; // multiple possible paths, first match wins
    configKey: string; // "mcpServers" for all current tools
}

function claudeDesktopPaths(): string[] {
    const platform = process.platform;
    if (platform === 'darwin') {
        return [path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')];
    }
    if (platform === 'win32') {
        return [path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')];
    }
    // Linux
    return [path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json')];
}

function claudeCodePaths(): string[] {
    return [path.join(os.homedir(), '.claude', 'settings.json')];
}

function cursorPaths(): string[] {
    return [path.join(os.homedir(), '.cursor', 'mcp.json')];
}

function windsurfPaths(): string[] {
    const platform = process.platform;
    if (platform === 'darwin') {
        return [path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json')];
    }
    if (platform === 'win32') {
        return [path.join(process.env.APPDATA || '', 'Codeium', 'windsurf', 'mcp_config.json')];
    }
    return [path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json')];
}

const TOOLS: ToolConfig[] = [
    { name: 'Claude Code', paths: claudeCodePaths, configKey: 'mcpServers' },
    { name: 'Claude Desktop', paths: claudeDesktopPaths, configKey: 'mcpServers' },
    { name: 'Cursor', paths: cursorPaths, configKey: 'mcpServers' },
    { name: 'Windsurf', paths: windsurfPaths, configKey: 'mcpServers' },
];

// ─── Helpers ──────────────────────────────────────────────────

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(msg: string) { console.log(msg); }
function success(msg: string) { console.log(`  ${GREEN}✓${RESET} ${msg}`); }
function warn(msg: string) { console.log(`  ${YELLOW}!${RESET} ${msg}`); }
function fail(msg: string) { console.log(`  ${RED}✗${RESET} ${msg}`); }

function getMcpServerBlock(apiKey: string) {
    return {
        command: 'npx',
        args: ['@pathmode/mcp-server'],
        env: { PATHMODE_API_KEY: apiKey },
    };
}

type ReadResult =
    | { ok: true; data: Record<string, any> }
    | { ok: false; reason: 'not_found' }
    | { ok: false; reason: 'parse_error'; raw: string };

function readJsonFile(filePath: string): ReadResult {
    let raw: string;
    try {
        raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
        return { ok: false, reason: 'not_found' };
    }
    try {
        return { ok: true, data: JSON.parse(raw) };
    } catch {
        return { ok: false, reason: 'parse_error', raw };
    }
}

function writeJsonSafe(filePath: string, data: Record<string, any>): boolean {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        return true;
    } catch (err: any) {
        fail(`Could not write ${filePath}: ${err.message}`);
        return false;
    }
}

function shortenPath(p: string): string {
    const home = os.homedir();
    return p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

export function getSetupArgs(argv = process.argv): string[] {
    const setupIndex = argv.findIndex(arg => arg === 'setup');
    return setupIndex === -1 ? [] : argv.slice(setupIndex + 1);
}

export function isSetupCommand(argv = process.argv): boolean {
    return argv.includes('setup');
}

// ─── Main ─────────────────────────────────────────────────────

export async function runSetup() {
    const args = getSetupArgs();
    const apiKey = args.find(a => a.startsWith('pm_live_') || a.startsWith('pm_test_'));

    log('');
    log(`${BOLD}Pathmode MCP Setup${RESET}`);
    log(`${DIM}──────────────────${RESET}`);
    log('');

    if (!apiKey) {
        log(`Usage: npx @pathmode/mcp-server setup ${DIM}<api-key>${RESET}`);
        log('');
        log(`Get your API key from ${CYAN}https://pathmode.io${RESET} → Settings → API Keys`);
        log('');
        process.exit(1);
    }

    // ─── Step 1: Validate key ─────────────────────────────────

    process.stdout.write(`  Validating API key...`);

    let workspaceName = '';
    let workspaceId = '';
    const apiUrl = args.includes('--staging')
        ? 'https://staging.pathmode.io'
        : 'https://pathmode.io';

    try {
        const res = await fetch(`${apiUrl}/api/v1/workspace`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                log(` ${RED}✗${RESET}`);
                log('');
                fail('Invalid or expired API key.');
                log(`  Get a new key from ${CYAN}${apiUrl}${RESET} → Settings → API Keys`);
                log('');
                process.exit(1);
            }
            throw new Error(`HTTP ${res.status}`);
        }

        const workspace = await res.json() as { id: string; name: string };
        workspaceName = workspace.name;
        workspaceId = workspace.id;
        log(` ${GREEN}✓${RESET}`);
        success(`Connected to "${BOLD}${workspaceName}${RESET}"`);
    } catch (err: any) {
        log(` ${RED}✗${RESET}`);
        log('');
        if (err.cause?.code === 'ENOTFOUND' || err.cause?.code === 'ECONNREFUSED') {
            fail('Could not reach pathmode.io. Check your internet connection.');
        } else {
            fail(`Connection failed: ${err.message}`);
        }
        log('');
        process.exit(1);
    }

    log('');

    // ─── Step 2: Detect & configure tools ─────────────────────

    let configured = 0;

    for (const tool of TOOLS) {
        const possiblePaths = tool.paths();
        // Find existing config, or use first path to create
        const existingPath = possiblePaths.find(p => fs.existsSync(p));
        const configPath = existingPath || possiblePaths[0];

        // Only configure if the tool's config dir exists (tool is installed)
        // Exception: Claude Code — always configure since ~/.claude/ may not exist yet
        const configDir = path.dirname(configPath);
        const toolInstalled = tool.name === 'Claude Code' || fs.existsSync(configDir);

        if (!toolInstalled) {
            continue;
        }

        let config: Record<string, any> = {};

        if (existingPath) {
            const result = readJsonFile(configPath);
            if (result.ok) {
                config = result.data;
            } else if (result.reason === 'parse_error') {
                // Back up the corrupt file instead of silently overwriting
                const backupPath = configPath + '.backup';
                try {
                    fs.writeFileSync(backupPath, result.raw, 'utf-8');
                } catch { /* best effort */ }
                warn(`${tool.name}: ${DIM}${shortenPath(configPath)}${RESET} is not valid JSON — backed up to ${DIM}${shortenPath(backupPath)}${RESET}`);
                continue;
            }
        }

        // Deep merge: preserve other mcpServers, only set/overwrite "pathmode"
        if (!config[tool.configKey]) {
            config[tool.configKey] = {};
        }
        config[tool.configKey].pathmode = getMcpServerBlock(apiKey);

        if (writeJsonSafe(configPath, config)) {
            success(`${tool.name} → ${DIM}${shortenPath(configPath)}${RESET}`);
            configured++;
        }
    }

    // ─── Step 3: Save ~/.pathmode/config.json ─────────────────

    const pathmodeConfigDir = path.join(os.homedir(), '.pathmode');
    const pathmodeConfigFile = path.join(pathmodeConfigDir, 'config.json');
    const pathmodeConfig = {
        apiKey,
        apiUrl,
        workspaceId,
    };

    if (writeJsonSafe(pathmodeConfigFile, pathmodeConfig)) {
        success(`Config saved → ${DIM}${shortenPath(pathmodeConfigFile)}${RESET}`);
    }

    log('');

    // ─── Step 4: Summary ──────────────────────────────────────

    if (configured === 0) {
        log(`${YELLOW}No supported tools detected.${RESET} Add manually:`);
        log('');
        log(`  ${DIM}// .claude/settings.json, ~/.cursor/mcp.json, or claude_desktop_config.json${RESET}`);
        log(`  ${CYAN}{${RESET}`);
        log(`  ${CYAN}  "mcpServers": {${RESET}`);
        log(`  ${CYAN}    "pathmode": {${RESET}`);
        log(`  ${CYAN}      "command": "npx",${RESET}`);
        log(`  ${CYAN}      "args": ["@pathmode/mcp-server"],${RESET}`);
        log(`  ${CYAN}      "env": { "PATHMODE_API_KEY": "${apiKey}" }${RESET}`);
        log(`  ${CYAN}    }${RESET}`);
        log(`  ${CYAN}  }${RESET}`);
        log(`  ${CYAN}}${RESET}`);
        log('');
    } else {
        log(`${GREEN}Done!${RESET} Restart your tools to activate Pathmode.`);
        log('');
    }
}

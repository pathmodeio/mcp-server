/**
 * Pathmode MCP Install Skills Command
 *
 * Copies the bundled Claude Code skill pack into .claude/skills/
 * (project-local, default) or ~/.claude/skills/ (global, with --global).
 *
 * Usage:
 *   npx @pathmode/mcp-server install-skills
 *   npx @pathmode/mcp-server install-skills --global
 *   npx @pathmode/mcp-server install-skills --force
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

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

export function isInstallSkillsCommand(argv = process.argv): boolean {
    return argv.includes('install-skills');
}

function getInstallSkillsArgs(argv = process.argv): string[] {
    const idx = argv.findIndex(a => a === 'install-skills');
    return idx === -1 ? [] : argv.slice(idx + 1);
}

function shortenPath(p: string): string {
    const home = os.homedir();
    return p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

/**
 * Locate the bundled skills/ directory.
 *
 * When installed via npm, this file is at <pkg>/dist/install-skills.js
 * and skills/ sits at <pkg>/skills/. When running from source (ts-node),
 * this file is at <pkg>/src/install-skills.ts and skills/ is at <pkg>/skills/.
 *
 * Either way, going up one level from __dirname and joining "skills" finds it.
 */
function findSkillsDir(): string | null {
    const candidates = [
        path.resolve(__dirname, '..', 'skills'),       // npm install layout (dist/ -> ../skills)
        path.resolve(__dirname, '..', '..', 'skills'), // edge case if bundled deeper
    ];
    for (const c of candidates) {
        if (!fs.existsSync(c) || !fs.statSync(c).isDirectory()) continue;
        // Sanity check: directory must contain at least one <name>/SKILL.md
        const entries = fs.readdirSync(c);
        const hasSkill = entries.some(e => fs.existsSync(path.join(c, e, 'SKILL.md')));
        if (hasSkill) return c;
    }
    return null;
}

function copyRecursive(src: string, dest: string) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
        const srcPath = path.join(src, e.name);
        const destPath = path.join(dest, e.name);
        if (e.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

export async function runInstallSkills() {
    const args = getInstallSkillsArgs();
    const isGlobal = args.includes('--global');
    const isForce = args.includes('--force');
    const wantsHelp = args.includes('--help') || args.includes('-h');

    log('');
    log(`${BOLD}Pathmode Skills Install${RESET}`);
    log(`${DIM}──────────────────────${RESET}`);
    log('');

    if (wantsHelp) {
        log(`Usage: ${CYAN}npx @pathmode/mcp-server install-skills${RESET} [options]`);
        log('');
        log('Options:');
        log(`  ${BOLD}--global${RESET}   Install into ~/.claude/skills/ instead of ./.claude/skills/`);
        log(`  ${BOLD}--force${RESET}    Overwrite existing skill directories`);
        log(`  ${BOLD}--help${RESET}     Show this message`);
        log('');
        log('Copies the bundled Claude Code skill pack into your skills directory.');
        log('Skills auto-trigger when your natural-language request matches their description —');
        log('no slash commands needed.');
        log('');
        return;
    }

    const skillsDir = findSkillsDir();
    if (!skillsDir) {
        fail('Could not locate the bundled skills/ directory.');
        log(`  Expected to find it at <package-root>/skills/ relative to ${shortenPath(__dirname)}.`);
        log(`  If you cloned this repo and are running from source, ensure ${BOLD}skills/${RESET} exists at the package root.`);
        log('');
        process.exit(1);
    }

    const targetDir = isGlobal
        ? path.join(os.homedir(), '.claude', 'skills')
        : path.join(process.cwd(), '.claude', 'skills');

    log(`  Source: ${DIM}${shortenPath(skillsDir)}${RESET}`);
    log(`  Target: ${DIM}${shortenPath(targetDir)}${RESET}`);
    log('');

    if (!fs.existsSync(targetDir)) {
        try {
            fs.mkdirSync(targetDir, { recursive: true });
        } catch (err: any) {
            fail(`Could not create target directory: ${err.message}`);
            log('');
            process.exit(1);
        }
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    let installed = 0;
    let skipped = 0;
    let overwritten = 0;

    for (const e of entries) {
        if (!e.isDirectory()) continue;
        // Only copy directories that contain a SKILL.md
        const skillFile = path.join(skillsDir, e.name, 'SKILL.md');
        if (!fs.existsSync(skillFile)) continue;

        const destPath = path.join(targetDir, e.name);
        const existsAlready = fs.existsSync(destPath);

        if (existsAlready && !isForce) {
            warn(`${e.name} ${DIM}(already installed — pass --force to overwrite)${RESET}`);
            skipped++;
            continue;
        }

        try {
            if (existsAlready && isForce) {
                fs.rmSync(destPath, { recursive: true, force: true });
            }
            copyRecursive(path.join(skillsDir, e.name), destPath);
            success(e.name);
            if (existsAlready) overwritten++;
            else installed++;
        } catch (err: any) {
            fail(`${e.name} — ${err.message}`);
        }
    }

    log('');
    const lines: string[] = [];
    if (installed > 0) lines.push(`${BOLD}${installed}${RESET} installed`);
    if (overwritten > 0) lines.push(`${BOLD}${overwritten}${RESET} updated`);
    if (skipped > 0) lines.push(`${BOLD}${skipped}${RESET} skipped`);
    log(`  ${lines.join('  ·  ') || 'No skills processed.'}`);
    log('');

    if (installed + overwritten > 0) {
        log(`  ${BOLD}Next:${RESET} Restart Claude Code so the new skills register at session start.`);
        log(`        Then try: ${CYAN}"help me write a spec for [your problem]"${RESET}`);
        log('');
    } else if (skipped > 0) {
        log(`  All skills already installed. Run with ${BOLD}--force${RESET} to overwrite.`);
        log('');
    }
}

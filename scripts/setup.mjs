#!/usr/bin/env node
/**
 * setup.mjs — Trine Bootstrap Script
 *
 * Initializes a team member's machine for Trine usage.
 * Run after cloning the trine repo:
 *
 *   node ~/.claude/trine/scripts/setup.mjs [--update]
 *
 * Actions:
 *   1. Verify prerequisites (Node.js, ~/.claude/ exists)
 *   2. Copy scripts/ → ~/.claude/scripts/
 *   3. Copy global-rules/ → ~/.claude/rules/
 *   4. Create manifest.json interactively (ask workspace paths)
 *
 * Flags:
 *   --update    Only update scripts + global-rules (skip manifest)
 *
 * Non-interactive (CI/script):
 *   node setup.mjs --wsl-path "Z:/path" --win-path "E:/path" --business-path "Z:/biz"
 */

import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TRINE_ROOT = dirname(__dirname);
const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const SCRIPTS_DIR = join(CLAUDE_DIR, 'scripts');
const RULES_DIR = join(CLAUDE_DIR, 'rules');

const SRC_SCRIPTS = join(TRINE_ROOT, 'scripts');
const SRC_GLOBAL_RULES = join(TRINE_ROOT, 'global-rules');
const MANIFEST_EXAMPLE = join(TRINE_ROOT, 'manifest.example.json');
const MANIFEST_PATH = join(TRINE_ROOT, 'manifest.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function copyFile(src, dst, label) {
  copyFileSync(src, dst);
  console.log(`  + ${label}`);
}

function skipFile(label, reason) {
  console.log(`  - ${label} (${reason})`);
}

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

async function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function checkPrerequisites() {
  console.log('\n[1/4] Prerequisites');

  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0], 10);
  if (major < 18) {
    console.error(`  ERROR: Node.js 18+ required (current: ${nodeVersion})`);
    process.exit(1);
  }
  console.log(`  Node.js v${nodeVersion} ... OK`);

  if (!existsSync(CLAUDE_DIR)) {
    console.error('  ERROR: ~/.claude/ not found. Install Claude Code first.');
    process.exit(1);
  }
  console.log(`  ~/.claude/ ... OK`);
}

function copyScripts() {
  console.log('\n[2/4] Scripts → ~/.claude/scripts/');
  ensureDir(SCRIPTS_DIR);

  const scriptFiles = ['trine-sync.mjs', 'session-state.mjs'];
  for (const file of scriptFiles) {
    const src = join(SRC_SCRIPTS, file);
    const dst = join(SCRIPTS_DIR, file);
    if (!existsSync(src)) { skipFile(file, 'source not found'); continue; }
    copyFile(src, dst, file);
  }
}

function copyGlobalRules(forceOverwrite = false) {
  console.log('\n[3/4] Global Rules → ~/.claude/rules/');
  ensureDir(RULES_DIR);

  if (!existsSync(SRC_GLOBAL_RULES)) {
    console.log('  (no global-rules/ found, skipping)');
    return;
  }

  const ruleFiles = readdirSync(SRC_GLOBAL_RULES).filter(f => f.endsWith('.md'));
  for (const file of ruleFiles) {
    const src = join(SRC_GLOBAL_RULES, file);
    const dst = join(RULES_DIR, file);

    if (existsSync(dst) && !forceOverwrite) {
      const srcContent = readFileSync(src, 'utf8');
      const dstContent = readFileSync(dst, 'utf8');
      if (srcContent === dstContent) { skipFile(file, 'up to date'); continue; }
    }
    copyFile(src, dst, file);
  }
}

async function setupManifest(args) {
  console.log('\n[4/4] Manifest');

  if (existsSync(MANIFEST_PATH)) {
    console.log('  manifest.json already exists (keeping current)');
    return;
  }

  if (!existsSync(MANIFEST_EXAMPLE)) {
    console.error('  ERROR: manifest.example.json not found');
    process.exit(1);
  }

  let content = readFileSync(MANIFEST_EXAMPLE, 'utf8');

  // Try CLI args first (non-interactive mode)
  let wslPath = getArg(args, '--wsl-path');
  let winPath = getArg(args, '--win-path');
  let bizPath = getArg(args, '--business-path');

  // Interactive mode if any path not provided
  if (!wslPath || !winPath) {
    console.log('');
    console.log('  워크스페이스 경로를 입력하세요.');
    console.log('  사용하지 않는 워크스페이스는 Enter로 건너뛰세요.');
    console.log('');

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    if (!wslPath) {
      wslPath = await ask(rl, '  WSL 워크스페이스 경로 (예: Z:/home/user/workspace): ');
    }
    if (!winPath) {
      winPath = await ask(rl, '  Windows 워크스페이스 경로 (예: E:/workspace): ');
    }
    if (!bizPath) {
      bizPath = await ask(rl, '  Business 워크스페이스 경로 (Enter=건너뛰기): ');
    }

    rl.close();
  }

  // Replace placeholders with actual paths
  if (wslPath) content = content.replace('{WSL_WORKSPACE}', wslPath);
  if (winPath) content = content.replace('{WIN_WORKSPACE}', winPath);
  if (bizPath) content = content.replace('{BUSINESS_PATH}', bizPath);

  // Remove unused workspaces (placeholder still present)
  const manifest = JSON.parse(content);
  const toRemove = [];
  for (const [key, ws] of Object.entries(manifest.workspaces)) {
    if (typeof ws.basePath === 'string' && ws.basePath.startsWith('{')) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) {
    delete manifest.workspaces[key];
    console.log(`  - ${key} workspace removed (경로 미입력)`);
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('  + manifest.json created');

  const wsKeys = Object.keys(manifest.workspaces);
  if (wsKeys.length > 0) {
    console.log(`  Workspaces: ${wsKeys.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update');

  console.log('');
  console.log('========================================');
  console.log('  Trine Setup' + (isUpdate ? ' (update)' : ''));
  console.log('  SDD+DDD+TDD AI-Native Dev System');
  console.log('========================================');

  checkPrerequisites();
  copyScripts();
  copyGlobalRules(isUpdate);

  if (!isUpdate) {
    await setupManifest(args);
  } else {
    console.log('\n[4/4] Manifest (skipped in update mode)');
  }

  console.log('');
  console.log('========================================');
  console.log('  Setup complete!');
  console.log('========================================');

  if (!isUpdate) {
    console.log('');
    console.log('다음 단계:');
    console.log('');
    console.log('  1. 프로젝트 등록:');
    console.log('     node ~/.claude/scripts/trine-sync.mjs init /path/to/project \\');
    console.log('       --name my-project --scope all --workspace wsl');
    console.log('');
    console.log('  2. 첫 동기화:');
    console.log('     node ~/.claude/scripts/trine-sync.mjs sync \\');
    console.log('       --target my-project --include-recommended');
    console.log('');
    console.log('  상세 가이드: trine-sync 후 docs/trine/trine-team-onboarding-guide.md');
  }
}

main();

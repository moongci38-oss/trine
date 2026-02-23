#!/usr/bin/env node
/**
 * setup.mjs — Trine Bootstrap Script
 *
 * One-command setup for team members. After cloning the trine repo:
 *
 *   node ~/.claude/trine/scripts/setup.mjs
 *
 * This single command does everything:
 *   1. Verify prerequisites (Node.js 18+, ~/.claude/ exists)
 *   2. Install scripts → ~/.claude/scripts/
 *   3. Install global rules → ~/.claude/rules/
 *   4. Detect platform & configure workspaces → manifest.json
 *   5. Auto-discover Claude Code projects in workspaces
 *   6. Run first sync (trine-sync --include-recommended)
 *
 * Flags:
 *   --update          Only update scripts + global-rules (skip manifest/discover/sync)
 *   --skip-discover   Skip project auto-discovery (steps 5-6)
 *
 * Non-interactive (CI/script):
 *   node setup.mjs --workspace ~/projects --business ~/biz            # Mac/Linux
 *   node setup.mjs --wsl-path "Z:/path" --win-path "E:/path"          # Windows
 *
 * Cross-platform: Windows (win32), macOS (darwin), Linux
 */

import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { homedir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';

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
const TRINE_SYNC_PATH = join(SCRIPTS_DIR, 'trine-sync.mjs');

// Note: process.platform returns 'win32' for ALL Windows (32-bit and 64-bit alike).
// This is a Node.js/Win32 API naming convention, not an architecture indicator.
const PLATFORM = platform();

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

function normalPath(p) {
  return p.replace(/\\/g, '/');
}

function toKebabCase(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function isDirectory(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

// ---------------------------------------------------------------------------
// [1/6] Prerequisites
// ---------------------------------------------------------------------------

function checkPrerequisites() {
  console.log('\n[1/6] Prerequisites');

  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0], 10);
  if (major < 18) {
    console.error(`  ERROR: Node.js 18+ required (current: ${nodeVersion})`);
    console.error('');
    console.error('  해결: https://nodejs.org 에서 Node.js 18+ 설치');
    process.exit(1);
  }
  console.log(`  Node.js v${nodeVersion} ... OK`);

  if (!existsSync(CLAUDE_DIR)) {
    console.error('  ERROR: ~/.claude/ not found.');
    console.error('');
    console.error('  해결: Claude Code를 먼저 설치하세요.');
    console.error('    npm install -g @anthropic-ai/claude-code');
    console.error('    claude  # 최초 실행 시 ~/.claude/ 자동 생성');
    process.exit(1);
  }
  console.log(`  ~/.claude/ ... OK`);

  const platformLabel = PLATFORM === 'darwin' ? 'macOS' : PLATFORM === 'win32' ? 'Windows' : 'Linux';
  console.log(`  Platform: ${platformLabel}`);
}

// ---------------------------------------------------------------------------
// [2/6] Install Scripts
// ---------------------------------------------------------------------------

function installScripts() {
  console.log('\n[2/6] Install Scripts → ~/.claude/scripts/');
  ensureDir(SCRIPTS_DIR);

  const scriptFiles = ['trine-sync.mjs', 'session-state.mjs'];
  for (const file of scriptFiles) {
    const src = join(SRC_SCRIPTS, file);
    const dst = join(SCRIPTS_DIR, file);
    if (!existsSync(src)) { skipFile(file, 'source not found'); continue; }
    copyFile(src, dst, file);
  }
}

// ---------------------------------------------------------------------------
// [3/6] Install Global Rules
// ---------------------------------------------------------------------------

function installGlobalRules(forceOverwrite = false) {
  console.log('\n[3/6] Install Rules → ~/.claude/rules/');
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

// ---------------------------------------------------------------------------
// [4/6] Configure — Platform-aware manifest setup
// ---------------------------------------------------------------------------

async function configure(args) {
  console.log('\n[4/6] Configure');

  if (existsSync(MANIFEST_PATH)) {
    console.log('  manifest.json already exists (keeping current)');
    return;
  }

  if (!existsSync(MANIFEST_EXAMPLE)) {
    console.error('  ERROR: manifest.example.json not found');
    process.exit(1);
  }

  let content = readFileSync(MANIFEST_EXAMPLE, 'utf8');

  // Collect paths — CLI args first, then interactive
  const paths = {};

  if (PLATFORM === 'win32') {
    // Windows: WSL + Windows workspaces
    paths.wsl = getArg(args, '--wsl-path');
    paths.windows = getArg(args, '--win-path');
    paths.business = getArg(args, '--business-path') || getArg(args, '--business');
  } else {
    // Mac / Linux: single workspace
    paths.mac = getArg(args, '--workspace');
    paths.business = getArg(args, '--business-path') || getArg(args, '--business');
  }

  // Interactive mode if needed
  const needsInteractive = PLATFORM === 'win32'
    ? (!paths.wsl && !paths.windows)
    : !paths.mac;

  if (needsInteractive) {
    console.log('');
    console.log('  워크스페이스 경로를 입력하세요. (Enter = 건너뛰기)');
    console.log('');

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    if (PLATFORM === 'win32') {
      if (!paths.wsl) {
        paths.wsl = await ask(rl, '  WSL 워크스페이스 경로 (예: Z:/home/user/workspace): ');
      }
      if (!paths.windows) {
        paths.windows = await ask(rl, '  Windows 워크스페이스 경로 (예: E:/workspace): ');
      }
    } else {
      if (!paths.mac) {
        paths.mac = await ask(rl, '  프로젝트 워크스페이스 경로 (예: ~/projects): ');
      }
    }

    if (!paths.business) {
      paths.business = await ask(rl, '  Business 워크스페이스 경로 (선택, Enter=건너뛰기): ');
    }

    rl.close();
  }

  // Resolve ~ to home directory
  for (const [key, val] of Object.entries(paths)) {
    if (val && val.startsWith('~')) {
      paths[key] = join(HOME, val.slice(1));
    }
  }

  // Validate paths exist (warn, don't block)
  for (const [key, val] of Object.entries(paths)) {
    if (val && !existsSync(val)) {
      console.log(`  ⚠ ${key}: 경로가 존재하지 않습니다 → ${val}`);
      console.log(`    프로젝트 발견(Step 5)에서 해당 워크스페이스는 건너뜁니다.`);
    }
  }

  // Replace placeholders
  if (paths.wsl) content = content.replace('{WSL_WORKSPACE}', paths.wsl);
  if (paths.windows) content = content.replace('{WIN_WORKSPACE}', paths.windows);
  if (paths.mac) content = content.replace('{MAC_WORKSPACE}', paths.mac);
  if (paths.business) content = content.replace('{BUSINESS_PATH}', paths.business);

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
  }

  saveManifest(manifest);
  console.log('  + manifest.json created');

  const wsKeys = Object.keys(manifest.workspaces);
  if (wsKeys.length > 0) {
    console.log(`  Workspaces: ${wsKeys.join(', ')}`);
  }

  return manifest;
}

// ---------------------------------------------------------------------------
// [5/6] Discover & Register Projects
// ---------------------------------------------------------------------------

async function discoverAndRegister() {
  console.log('\n[5/6] Discover & Register');

  const manifest = loadManifest();
  const workspaces = manifest.workspaces || {};

  if (Object.keys(workspaces).length === 0) {
    console.log('  (no workspaces configured, skipping)');
    return;
  }

  // Scan each workspace for Claude Code projects
  const discovered = [];

  for (const [wsKey, wsConfig] of Object.entries(workspaces)) {
    const wsPath = wsConfig.basePath;
    if (!existsSync(wsPath) || !isDirectory(wsPath)) {
      console.log(`  - ${wsKey}: path not found (${wsPath})`);
      continue;
    }

    let entries;
    try { entries = readdirSync(wsPath); } catch { continue; }

    for (const entry of entries) {
      const fullPath = join(wsPath, entry);
      if (!isDirectory(fullPath)) continue;

      // Check if this directory has .claude/ (Claude Code project)
      const claudeDir = join(fullPath, '.claude');
      if (!existsSync(claudeDir) || !isDirectory(claudeDir)) continue;

      // Derive project name
      const name = toKebabCase(basename(fullPath));

      // Check if already registered
      const normalFull = normalPath(resolve(fullPath));
      const alreadyByName = manifest.targets[name];
      const alreadyByPath = Object.entries(manifest.targets)
        .find(([, cfg]) => normalPath(resolve(cfg.path)) === normalFull);

      if (alreadyByName || alreadyByPath) {
        const existingName = alreadyByPath ? alreadyByPath[0] : name;
        skipFile(existingName, 'already registered');
        continue;
      }

      // Determine scope
      const isBusiness = name.includes('business');
      const scope = isBusiness ? 'shared-only' : 'all';

      discovered.push({ name, path: normalFull, scope, workspace: wsKey });
    }
  }

  if (discovered.length === 0) {
    console.log('  (no new projects found)');
    console.log('');
    console.log('  .claude/ 폴더가 있는 프로젝트만 자동 발견됩니다.');
    console.log('  수동 등록: node ~/.claude/scripts/trine-sync.mjs init <path> --name <name>');
    return;
  }

  // Show discovered projects
  console.log('');
  console.log('  발견된 프로젝트:');
  for (let i = 0; i < discovered.length; i++) {
    const p = discovered[i];
    console.log(`    ${i + 1}. ${p.name}  → ${p.path}  [${p.scope}]`);
  }
  console.log('');

  // Ask confirmation
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await ask(rl, '  등록하시겠습니까? (Y/n): ');
  rl.close();

  if (answer.toLowerCase() === 'n') {
    console.log('  건너뜀. 수동 등록: node ~/.claude/scripts/trine-sync.mjs init <path> --name <name>');
    return;
  }

  // Register all discovered projects
  for (const p of discovered) {
    const target = { path: p.path, scope: p.scope };
    if (p.workspace) target.workspace = p.workspace;
    manifest.targets[p.name] = target;
    console.log(`  + ${p.name} registered`);
  }

  saveManifest(manifest);
}

// ---------------------------------------------------------------------------
// [6/6] First Sync
// ---------------------------------------------------------------------------

function firstSync() {
  console.log('\n[6/6] First Sync');

  if (!existsSync(TRINE_SYNC_PATH)) {
    console.error('  ERROR: trine-sync.mjs not found. Scripts installation may have failed.');
    return;
  }

  const manifest = loadManifest();
  if (!manifest.targets || Object.keys(manifest.targets).length === 0) {
    console.log('  (no projects registered, skipping sync)');
    return;
  }

  console.log('  Running trine-sync sync --include-recommended ...');
  console.log('');

  try {
    execFileSync(process.execPath, [TRINE_SYNC_PATH, 'sync', '--include-recommended'], {
      stdio: 'inherit',
      cwd: HOME,
    });
  } catch (err) {
    console.error('');
    console.error('  ⚠ Sync 실패. 일반적인 원인:');
    console.error('    - 등록된 프로젝트 경로가 존재하지 않음');
    console.error('    - 파일 권한 문제 (관리자 권한 필요할 수 있음)');
    console.error('');
    console.error('  수동 실행: node ~/.claude/scripts/trine-sync.mjs sync --include-recommended');
    console.error('  상태 확인: node ~/.claude/scripts/trine-sync.mjs status');
  }
}

// ---------------------------------------------------------------------------
// Manifest helpers (inline — trine-sync.mjs may not be installed yet)
// ---------------------------------------------------------------------------

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error('Error: manifest.json not found at', MANIFEST_PATH);
    process.exit(1);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(manifest) {
  const content = JSON.stringify(manifest, null, 2) + '\n';
  const tmpPath = MANIFEST_PATH + '.tmp';
  writeFileSync(tmpPath, content, 'utf8');
  renameSync(tmpPath, MANIFEST_PATH);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update');
  const skipDiscover = args.includes('--skip-discover');

  console.log('');
  console.log('========================================');
  console.log('  Trine Setup' + (isUpdate ? ' (update)' : ''));
  console.log('  SDD+DDD+TDD AI-Native Dev System');
  console.log('========================================');

  // Steps 1-3: Always run
  checkPrerequisites();
  installScripts();
  installGlobalRules(isUpdate);

  if (isUpdate) {
    console.log('\n[4/6] Configure (skipped in update mode)');
    console.log('[5/6] Discover (skipped in update mode)');
    console.log('[6/6] Sync (skipped in update mode)');
  } else {
    // Step 4: Configure manifest
    await configure(args);

    // Step 5: Discover & register projects
    if (!skipDiscover) {
      await discoverAndRegister();
    } else {
      console.log('\n[5/6] Discover (skipped via --skip-discover)');
    }

    // Step 6: First sync
    firstSync();
  }

  console.log('');
  console.log('========================================');
  console.log('  Setup complete!');
  console.log('========================================');

  if (!isUpdate) {
    console.log('');
    console.log('사용법:');
    console.log('  trine-sync status                상태 확인');
    console.log('  trine-sync sync                  동기화');
    console.log('  trine-sync init <path> --name x  프로젝트 추가');
    console.log('');
    console.log('시스템 업데이트:');
    console.log('  cd ~/.claude/trine && git pull');
    console.log('  node ~/.claude/trine/scripts/setup.mjs --update');
  }
}

main();

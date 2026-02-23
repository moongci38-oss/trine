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
 *   4. Create manifest.json from manifest.example.json (if missing)
 *
 * Flags:
 *   --update    Only update scripts + global-rules (skip manifest)
 */

import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TRINE_ROOT = dirname(__dirname); // ~/.claude/trine/
const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const SCRIPTS_DIR = join(CLAUDE_DIR, 'scripts');
const RULES_DIR = join(CLAUDE_DIR, 'rules');

// Source directories within trine repo
const SRC_SCRIPTS = join(TRINE_ROOT, 'scripts');
const SRC_GLOBAL_RULES = join(TRINE_ROOT, 'global-rules');
const MANIFEST_EXAMPLE = join(TRINE_ROOT, 'manifest.example.json');
const MANIFEST_PATH = join(TRINE_ROOT, 'manifest.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dst, label) {
  copyFileSync(src, dst);
  console.log(`  + ${label}`);
}

function skipFile(label, reason) {
  console.log(`  - ${label} (${reason})`);
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function checkPrerequisites() {
  console.log('\n1. Prerequisites check');

  // Node.js version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0], 10);
  if (major < 18) {
    console.error(`  ERROR: Node.js 18+ required (current: ${nodeVersion})`);
    process.exit(1);
  }
  console.log(`  Node.js: v${nodeVersion}`);

  // ~/.claude/ exists
  if (!existsSync(CLAUDE_DIR)) {
    console.error('  ERROR: ~/.claude/ not found. Install Claude Code first.');
    process.exit(1);
  }
  console.log(`  Claude dir: ${CLAUDE_DIR}`);
}

function copyScripts() {
  console.log('\n2. Copying scripts → ~/.claude/scripts/');
  ensureDir(SCRIPTS_DIR);

  const scriptFiles = ['trine-sync.mjs', 'session-state.mjs'];
  for (const file of scriptFiles) {
    const src = join(SRC_SCRIPTS, file);
    const dst = join(SCRIPTS_DIR, file);
    if (!existsSync(src)) {
      skipFile(file, 'source not found');
      continue;
    }
    copyFile(src, dst, `${file} → ~/.claude/scripts/`);
  }
}

function copyGlobalRules(forceOverwrite = false) {
  console.log('\n3. Copying global-rules → ~/.claude/rules/');
  ensureDir(RULES_DIR);

  if (!existsSync(SRC_GLOBAL_RULES)) {
    console.log('  (no global-rules directory found, skipping)');
    return;
  }

  const ruleFiles = readdirSync(SRC_GLOBAL_RULES).filter(f => f.endsWith('.md'));
  for (const file of ruleFiles) {
    const src = join(SRC_GLOBAL_RULES, file);
    const dst = join(RULES_DIR, file);

    if (existsSync(dst) && !forceOverwrite) {
      // Compare content — update only if source is newer
      const srcContent = readFileSync(src, 'utf8');
      const dstContent = readFileSync(dst, 'utf8');
      if (srcContent === dstContent) {
        skipFile(file, 'up to date');
        continue;
      }
    }
    copyFile(src, dst, `${file} → ~/.claude/rules/`);
  }
}

function setupManifest() {
  console.log('\n4. Manifest setup');

  if (existsSync(MANIFEST_PATH)) {
    console.log('  manifest.json already exists (keeping current)');
    return;
  }

  if (!existsSync(MANIFEST_EXAMPLE)) {
    console.error('  ERROR: manifest.example.json not found');
    process.exit(1);
  }

  copyFileSync(MANIFEST_EXAMPLE, MANIFEST_PATH);
  console.log('  + Created manifest.json from manifest.example.json');
  console.log('');
  console.log('  ACTION REQUIRED:');
  console.log('  Edit ~/.claude/trine/manifest.json and replace placeholders:');
  console.log('    {WSL_WORKSPACE}  → Your WSL workspace path');
  console.log('    {WIN_WORKSPACE}  → Your Windows workspace path');
  console.log('    {BUSINESS_PATH}  → Your business workspace path');
  console.log('');
  console.log('  Then register projects:');
  console.log('    node ~/.claude/scripts/trine-sync.mjs init /path/to/project \\');
  console.log('      --name my-project --scope all --workspace wsl');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update');

  console.log('========================================');
  console.log(' Trine Setup' + (isUpdate ? ' (update mode)' : ''));
  console.log('========================================');

  checkPrerequisites();
  copyScripts();
  copyGlobalRules(isUpdate); // force overwrite in update mode

  if (!isUpdate) {
    setupManifest();
  } else {
    console.log('\n4. Manifest setup (skipped in update mode)');
  }

  console.log('\n========================================');
  console.log(' Setup complete!');
  console.log('========================================');

  if (!isUpdate) {
    console.log('\nNext steps:');
    console.log('  1. Edit manifest.json (replace path placeholders)');
    console.log('  2. Register a project:');
    console.log('     node ~/.claude/scripts/trine-sync.mjs init /path/to/project --name my-project --workspace wsl');
    console.log('  3. First sync:');
    console.log('     node ~/.claude/scripts/trine-sync.mjs sync --target my-project --include-recommended');
  }
}

main();

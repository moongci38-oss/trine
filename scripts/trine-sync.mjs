#!/usr/bin/env node
/**
 * trine-sync.mjs
 * Trine Central Repository → Project Sync Engine
 *
 * Deploys Core/Recommended components from ~/.claude/trine/ to registered projects.
 * Uses SHA-256 hash comparison — only copies changed files.
 *
 * Override tracking (v1.2.0):
 *   Per-project state file records deployed hashes.
 *   - If project file matches deployed hash → auto-update with new source.
 *   - If project file differs from deployed hash → skip (genuinely customized).
 *   - First run (no state): records current hashes, skips overrides (backwards compat).
 *
 * Installed at: ~/.claude/scripts/trine-sync.mjs
 * Source:       ~/.claude/trine/
 * Manifest:     ~/.claude/trine/manifest.json
 *
 * Usage:
 *   node ~/.claude/scripts/trine-sync.mjs <command> [args]
 *
 * Commands:
 *   sync [--target <name>] [--include-recommended] [--dry-run]
 *   status [--quiet]
 *   diff <target>
 *   list [--workspace <key>]
 *   init <path> --name <name> [--scope all|shared-only] [--description "..."] [--workspace <key>]
 *   remove <name>
 *
 * Exit codes:
 *   0 = Success (or up-to-date)
 *   1 = Error
 *   2 = Out of sync (status --quiet)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, statSync, renameSync } from 'node:fs';
import { join, dirname, relative, basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOME = homedir();
const TRINE_ROOT = join(HOME, '.claude', 'trine');
const MANIFEST_PATH = join(TRINE_ROOT, 'manifest.json');
const SCRIPTS_DIR = join(HOME, '.claude', 'scripts');

// Core deployment mapping: trine source dir → project target dir
const CORE_MAPPINGS = [
  { src: 'rules',     dst: '.claude/rules' },
  { src: 'prompts',   dst: '.claude/prompts' },
  { src: 'docs',      dst: 'docs/trine' },
  { src: 'templates', dst: '.specify/templates' },
  { src: 'agents',    dst: '.claude/agents' },
  { src: 'skills',    dst: '.claude/skills' },
  { src: 'commands',  dst: '.claude/commands' },
];

// Shared docs deployment mapping (all targets including shared-only scope)
const SHARED_MAPPINGS = [
  { src: 'shared-docs', dst: 'docs/shared' },
];

// Recommended deployment mapping
const RECOMMENDED_MAPPINGS = [
  { src: 'recommended/prompts',  dst: '.claude/prompts' },
  { src: 'recommended/commands', dst: '.claude/commands' },
  { src: 'recommended/hooks',    dst: '.claude/hooks' },
  { src: 'recommended/skills',   dst: '.claude/skills' },
];

// Override policy: these categories use state-based tracking
const OVERRIDE_CATEGORIES = new Set(['templates', 'agents', 'skills']);

// ---------------------------------------------------------------------------
// Helpers
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

function fileHash(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function collectFiles(dirPath, basePath = dirPath) {
  const files = [];
  if (!existsSync(dirPath)) return files;

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, basePath));
    } else {
      files.push(relative(basePath, fullPath).replace(/\\/g, '/'));
    }
  }
  return files;
}

function normalPath(p) {
  return p.replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// Sync State (per-project override tracking)
// ---------------------------------------------------------------------------

function getSyncStatePath(projectPath) {
  return join(projectPath, '.claude', 'trine-sync-state.json');
}

function loadSyncState(projectPath) {
  const statePath = getSyncStatePath(projectPath);
  if (!existsSync(statePath)) return { version: '1.0.0', files: {} };
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return { version: '1.0.0', files: {} };
  }
}

function saveSyncState(projectPath, state, dryRun) {
  if (dryRun) return;
  const statePath = getSyncStatePath(projectPath);
  ensureDir(dirname(statePath));
  const content = JSON.stringify(state, null, 2) + '\n';
  const tmpPath = statePath + '.tmp';
  writeFileSync(tmpPath, content, 'utf8');
  renameSync(tmpPath, statePath);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdSync(args) {
  const manifest = loadManifest();
  const targetName = getArg(args, '--target');
  const includeRecommended = args.includes('--include-recommended');
  const dryRun = args.includes('--dry-run');

  const targets = targetName
    ? { [targetName]: manifest.targets[targetName] }
    : manifest.targets;

  if (targetName && !manifest.targets[targetName]) {
    console.error(`Error: target '${targetName}' not found in manifest.`);
    console.error('Available targets:', Object.keys(manifest.targets).join(', '));
    process.exit(1);
  }

  let totalCopied = 0;
  let totalSkipped = 0;
  let totalUpToDate = 0;
  let totalAutoUpdated = 0;

  for (const [name, config] of Object.entries(targets)) {
    const projectPath = resolve(config.path);
    if (!existsSync(projectPath)) {
      console.warn(`⚠ Target '${name}' path not found: ${projectPath}`);
      continue;
    }

    const scope = config.scope || 'all';
    console.log(`\n📦 Syncing → ${name} (${normalPath(projectPath)}) [scope: ${scope}]`);

    // Load per-project sync state for override tracking
    const syncState = loadSyncState(projectPath);

    // Core sync (skip for shared-only targets like business)
    if (scope !== 'shared-only') {
      const coreResult = syncMappings(CORE_MAPPINGS, projectPath, dryRun, false, syncState);
      totalCopied += coreResult.copied;
      totalSkipped += coreResult.skipped;
      totalUpToDate += coreResult.upToDate;
      totalAutoUpdated += coreResult.autoUpdated;
    }

    // Shared docs sync (all targets)
    const sharedResult = syncMappings(SHARED_MAPPINGS, projectPath, dryRun, false, syncState);
    totalCopied += sharedResult.copied;
    totalSkipped += sharedResult.skipped;
    totalUpToDate += sharedResult.upToDate;
    totalAutoUpdated += sharedResult.autoUpdated;

    // Recommended sync (only if --include-recommended, skip for shared-only)
    if (includeRecommended && scope !== 'shared-only') {
      const recResult = syncMappings(RECOMMENDED_MAPPINGS, projectPath, dryRun, true, syncState);
      totalCopied += recResult.copied;
      totalSkipped += recResult.skipped;
      totalUpToDate += recResult.upToDate;
      totalAutoUpdated += recResult.autoUpdated;
    }

    // Save sync state
    saveSyncState(projectPath, syncState, dryRun);
  }

  const parts = [`${totalCopied} copied`];
  if (totalAutoUpdated > 0) parts.push(`${totalAutoUpdated} override auto-updated`);
  if (totalSkipped > 0) parts.push(`${totalSkipped} skipped (customized)`);
  parts.push(`${totalUpToDate} up-to-date`);
  console.log(`\n✅ Sync complete: ${parts.join(', ')}`);
  if (dryRun) console.log('   (dry-run — no files were actually copied)');
}

function syncMappings(mappings, projectPath, dryRun, isRecommended, syncState) {
  let copied = 0, skipped = 0, upToDate = 0, autoUpdated = 0;

  for (const mapping of mappings) {
    const srcDir = join(TRINE_ROOT, mapping.src);
    if (!existsSync(srcDir)) continue;

    const files = collectFiles(srcDir);
    const category = mapping.src.replace('recommended/', '');

    for (const relFile of files) {
      const srcFile = join(srcDir, relFile);
      const dstFile = join(projectPath, mapping.dst, relFile);
      const stateKey = normalPath(join(mapping.dst, relFile));

      const srcHash = fileHash(srcFile);
      const dstHash = fileHash(dstFile);
      let isAutoUpdate = false;

      // Override tracking: templates/agents/skills
      if (OVERRIDE_CATEGORIES.has(category) && dstHash) {
        if (srcHash === dstHash) {
          // Identical → up to date, record in state
          syncState.files[stateKey] = srcHash;
          upToDate++;
          continue;
        }

        // Different content → check state to determine action
        const deployedHash = syncState.files[stateKey];

        if (deployedHash && dstHash === deployedHash) {
          // Project file unchanged since last deploy → safe to auto-update
          isAutoUpdate = true;
          // Fall through to copy logic
        } else {
          // No state entry OR project customized → skip
          if (!deployedHash) {
            // First time tracking: record project file hash for future comparison
            syncState.files[stateKey] = dstHash;
          }
          console.log(`  ⏭ ${normalPath(relative(projectPath, dstFile))} (project override)`);
          skipped++;
          continue;
        }
      }

      // Recommended: skip if file already exists (initial deployment only)
      if (isRecommended && dstHash) {
        upToDate++;
        continue;
      }

      // Hash comparison: skip if identical
      if (srcHash === dstHash) {
        syncState.files[stateKey] = srcHash;
        upToDate++;
        continue;
      }

      // Copy
      if (!dryRun) {
        ensureDir(dirname(dstFile));
        copyFileSync(srcFile, dstFile);
      }
      syncState.files[stateKey] = srcHash;

      if (isAutoUpdate) {
        console.log(`  ↻ ${normalPath(relative(projectPath, dstFile))} (auto)`);
        autoUpdated++;
      } else {
        const action = dstHash ? '↻' : '+';
        console.log(`  ${action} ${normalPath(relative(projectPath, dstFile))}`);
        copied++;
      }
    }
  }

  return { copied, skipped, upToDate, autoUpdated };
}

function cmdStatus(args) {
  const manifest = loadManifest();
  const quiet = args.includes('--quiet');
  let allSynced = true;
  const statusLines = [];

  for (const [name, config] of Object.entries(manifest.targets)) {
    const projectPath = resolve(config.path);
    if (!existsSync(projectPath)) {
      if (!quiet) console.log(`⚠ ${name}: path not found`);
      allSynced = false;
      continue;
    }

    const scope = config.scope || 'all';
    const syncState = loadSyncState(projectPath);
    let outOfSync = 0;
    let missing = 0;
    let synced = 0;

    // Check core mappings (skip for shared-only)
    const mappingsToCheck = scope === 'shared-only'
      ? SHARED_MAPPINGS
      : [...CORE_MAPPINGS, ...SHARED_MAPPINGS];

    for (const mapping of mappingsToCheck) {
      const srcDir = join(TRINE_ROOT, mapping.src);
      if (!existsSync(srcDir)) continue;

      const files = collectFiles(srcDir);
      const category = mapping.src;

      for (const relFile of files) {
        const srcFile = join(srcDir, relFile);
        const dstFile = join(projectPath, mapping.dst, relFile);
        const stateKey = normalPath(join(mapping.dst, relFile));

        if (!existsSync(dstFile)) {
          missing++;
          continue;
        }

        const srcHash = fileHash(srcFile);
        const dstHash = fileHash(dstFile);

        if (OVERRIDE_CATEGORIES.has(category) && srcHash !== dstHash) {
          const deployedHash = syncState.files[stateKey];
          if (deployedHash && dstHash === deployedHash) {
            // Not customized, just outdated → will be auto-updated
            outOfSync++;
          } else {
            // Customized → counted as synced (override)
            synced++;
          }
        } else if (srcHash === dstHash) {
          synced++;
        } else {
          outOfSync++;
        }
      }
    }

    if (!quiet) {
      const scopeLabel = scope === 'shared-only' ? ' (shared-only)' : '';
      const status = (outOfSync === 0 && missing === 0) ? '✅' : '⚠';
      statusLines.push({ name, workspace: config.workspace || null, line: `${status} ${name}${scopeLabel}: ${synced} synced, ${outOfSync} outdated, ${missing} missing` });
    }

    if (outOfSync > 0 || missing > 0) allSynced = false;
  }

  if (quiet) {
    process.exit(allSynced ? 0 : 2);
  }

  // Group output by workspace
  const workspaces = manifest.workspaces || {};
  const grouped = {};
  const ungrouped = [];
  for (const item of statusLines) {
    if (item.workspace && workspaces[item.workspace]) {
      if (!grouped[item.workspace]) grouped[item.workspace] = [];
      grouped[item.workspace].push(item.line);
    } else {
      ungrouped.push(item.line);
    }
  }

  for (const [wsKey, lines] of Object.entries(grouped)) {
    console.log(`\n[${wsKey}]`);
    for (const line of lines) console.log(`  ${line}`);
  }
  if (ungrouped.length > 0) {
    if (Object.keys(grouped).length > 0) console.log('\n[ungrouped]');
    for (const line of ungrouped) console.log(`  ${line}`);
  }
}

function cmdDiff(args) {
  const targetName = args[0];
  if (!targetName) {
    console.error('Usage: trine-sync.mjs diff <target>');
    process.exit(1);
  }

  const manifest = loadManifest();
  const config = manifest.targets[targetName];
  if (!config) {
    console.error(`Error: target '${targetName}' not found.`);
    process.exit(1);
  }

  const projectPath = resolve(config.path);
  const scope = config.scope || 'all';
  const syncState = loadSyncState(projectPath);
  console.log(`📊 Diff: trine source vs ${targetName} [scope: ${scope}]\n`);

  const mappingsToCheck = scope === 'shared-only'
    ? SHARED_MAPPINGS
    : [...CORE_MAPPINGS, ...SHARED_MAPPINGS];

  for (const mapping of mappingsToCheck) {
    const srcDir = join(TRINE_ROOT, mapping.src);
    if (!existsSync(srcDir)) continue;

    const files = collectFiles(srcDir);
    const category = mapping.src;

    for (const relFile of files) {
      const srcFile = join(srcDir, relFile);
      const dstFile = join(projectPath, mapping.dst, relFile);
      const stateKey = normalPath(join(mapping.dst, relFile));

      const srcHash = fileHash(srcFile);
      const dstHash = fileHash(dstFile);

      if (!dstHash) {
        console.log(`  + ${category}/${relFile} (missing in project)`);
      } else if (srcHash !== dstHash) {
        if (OVERRIDE_CATEGORIES.has(category)) {
          const deployedHash = syncState.files[stateKey];
          if (deployedHash && dstHash === deployedHash) {
            console.log(`  ↻ ${category}/${relFile} (will auto-update, src=${srcHash} dst=${dstHash})`);
          } else {
            console.log(`  ⏭ ${category}/${relFile} (customized, src=${srcHash} dst=${dstHash})`);
          }
        } else {
          console.log(`  ≠ ${category}/${relFile} (src=${srcHash} dst=${dstHash})`);
        }
      }
    }
  }
}

function cmdInit(args) {
  const projectPath = args[0];
  const name = getArg(args, '--name');

  if (!projectPath || !name) {
    console.error('Usage: trine-sync.mjs init <path> --name <name> [--scope all|shared-only] [--description "..."] [--workspace <key>]');
    process.exit(1);
  }

  const resolvedPath = resolve(projectPath);
  if (!existsSync(resolvedPath)) {
    console.error(`Error: path '${resolvedPath}' does not exist.`);
    process.exit(1);
  }

  const manifest = loadManifest();
  if (manifest.targets[name]) {
    console.error(`Error: target '${name}' already exists.`);
    process.exit(1);
  }

  // Duplicate path check
  const normalResolved = normalPath(resolvedPath);
  const existingByPath = Object.entries(manifest.targets)
    .find(([, cfg]) => normalPath(resolve(cfg.path)) === normalResolved);
  if (existingByPath) {
    console.error(`Error: path already registered as '${existingByPath[0]}'.`);
    process.exit(1);
  }

  // Parse optional flags
  const scope = getArg(args, '--scope') || 'all';
  if (scope !== 'all' && scope !== 'shared-only') {
    console.error(`Error: --scope must be 'all' or 'shared-only' (got '${scope}').`);
    process.exit(1);
  }

  const description = getArg(args, '--description') || '';
  const workspace = getArg(args, '--workspace') || null;

  if (workspace && manifest.workspaces && !manifest.workspaces[workspace]) {
    const available = Object.keys(manifest.workspaces).join(', ');
    console.warn(`⚠ Workspace '${workspace}' not found in manifest. Available: ${available}`);
  }

  const target = { path: normalResolved, scope };
  if (description) target.description = description;
  if (workspace) target.workspace = workspace;

  manifest.targets[name] = target;
  saveManifest(manifest);

  console.log(`✅ Registered '${name}' → ${normalResolved}`);
  if (description) console.log(`   Description: ${description}`);
  if (workspace) console.log(`   Workspace: ${workspace}`);
  console.log(`   Scope: ${scope}`);
  console.log(`\nNext: node ~/.claude/scripts/trine-sync.mjs sync --target ${name} --include-recommended`);
}

function cmdList(args) {
  const manifest = loadManifest();
  const wsFilter = getArg(args, '--workspace');
  const targets = manifest.targets;
  const workspaces = manifest.workspaces || {};

  if (wsFilter && workspaces[wsFilter] === undefined) {
    console.error(`Error: workspace '${wsFilter}' not found. Available: ${Object.keys(workspaces).join(', ')}`);
    process.exit(1);
  }

  // Group targets by workspace
  const groups = {};
  const ungrouped = [];

  for (const [name, config] of Object.entries(targets)) {
    const ws = config.workspace;
    if (wsFilter && ws !== wsFilter) continue;
    if (ws && workspaces[ws]) {
      if (!groups[ws]) groups[ws] = [];
      groups[ws].push({ name, config });
    } else {
      if (!wsFilter) ungrouped.push({ name, config });
    }
  }

  const totalShown = Object.values(groups).reduce((s, g) => s + g.length, 0) + ungrouped.length;
  console.log(`\nTrine Registered Targets (${totalShown})\n`);

  for (const [wsKey, items] of Object.entries(groups)) {
    const ws = workspaces[wsKey];
    console.log(`[${wsKey}] ${ws.description || wsKey}  (${ws.basePath})`);
    for (const { name, config } of items) {
      const exists = existsSync(resolve(config.path));
      const mark = exists ? '✓' : '✗';
      const missing = exists ? '' : ' [missing]';
      const desc = config.description ? `  ${config.description}` : '';
      console.log(`  ${mark} ${name.padEnd(14)} ${normalPath(config.path)}${missing}`);
      if (desc) console.log(`  ${''.padEnd(16)}${desc}  [scope: ${config.scope || 'all'}]`);
    }
    console.log('');
  }

  if (ungrouped.length > 0) {
    console.log('[ungrouped]');
    for (const { name, config } of ungrouped) {
      const exists = existsSync(resolve(config.path));
      const mark = exists ? '✓' : '✗';
      const missing = exists ? '' : ' [missing]';
      console.log(`  ${mark} ${name.padEnd(14)} ${normalPath(config.path)}${missing}`);
    }
    console.log('');
  }
}

function cmdRemove(args) {
  const name = args[0];
  if (!name) {
    console.error('Usage: trine-sync.mjs remove <name>');
    process.exit(1);
  }

  const manifest = loadManifest();
  if (!manifest.targets[name]) {
    console.error(`Error: target '${name}' not found.`);
    process.exit(1);
  }

  delete manifest.targets[name];
  saveManifest(manifest);
  console.log(`✅ Removed '${name}' from manifest.`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift();

  switch (command) {
    case 'sync':
      cmdSync(args);
      break;
    case 'status':
      cmdStatus(args);
      break;
    case 'diff':
      cmdDiff(args);
      break;
    case 'list':
      cmdList(args);
      break;
    case 'init':
      cmdInit(args);
      break;
    case 'remove':
      cmdRemove(args);
      break;
    default:
      console.log(`Trine Sync Engine v1.2.0

Usage: node ~/.claude/scripts/trine-sync.mjs <command>

Commands:
  sync [--target <name>] [--include-recommended] [--dry-run]
                            Deploy trine source → projects
                            Override files: auto-updated if not customized
  status [--quiet]          Check hash sync status (exit 2 = out of sync)
  diff <target>             Show differences between source and project
  list [--workspace <key>]  List all registered targets
  init <path> --name <name> [--scope all|shared-only] [--description "..."] [--workspace <key>]
                            Register a new project
  remove <name>             Unregister a project

Source: ${normalPath(TRINE_ROOT)}
Manifest: ${normalPath(MANIFEST_PATH)}`);
      process.exit(command ? 1 : 0);
  }
}

main();

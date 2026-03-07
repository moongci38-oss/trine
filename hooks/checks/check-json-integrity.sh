#!/usr/bin/env bash
# check-json-integrity.sh — Detect duplicate keys and syntax errors in JSON files
# Trine Layer 1 Hook (pre-push). Deployed via trine-sync.
# Usage: bash check-json-integrity.sh [search_dir] (default: current directory)
set -euo pipefail

RED='\033[0;31m'
NC='\033[0m'

SEARCH_DIR="${1:-.}"

# Universal excludes
JSON_FILES=$(find "$SEARCH_DIR" -name "*.json" \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/.turbo/*" \
  -not -path "*/Library/*" \
  -not -path "*/Temp/*" \
  -not -path "*/obj/*" \
  -not -path "*/bin/*" \
  -not -path "*/.git/*" \
  -not -name "tsconfig.tsbuildinfo" \
  -not -name "pnpm-lock.yaml" \
  -not -name "package-lock.json" \
  -not -name "*.meta" \
  2>/dev/null || true)

if [ -z "$JSON_FILES" ]; then
  echo "No JSON files found in $SEARCH_DIR. Skipping."
  exit 0
fi

# Validation script — try Node.js first, Python fallback
VALIDATE_NODE='
const fs = require("fs");
const files = process.argv.slice(1);
let found = 0;
for (const file of files) {
  try {
    const content = fs.readFileSync(file, "utf8");
    try { JSON.parse(content); } catch (e) {
      console.log("[JSON SYNTAX ERROR] " + file + ": " + e.message);
      found = 1;
      continue;
    }
    const lines = content.split("\n");
    const levelKeys = [new Set()];
    const dupes = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("{")) levelKeys.push(new Set());
      const m = trimmed.match(/^"([^"]+)"\s*:/);
      if (m) {
        const key = m[1];
        const cur = levelKeys[levelKeys.length - 1];
        if (cur.has(key)) dupes.push(key);
        cur.add(key);
      }
      if (trimmed.startsWith("}") || trimmed.endsWith("}") || trimmed.endsWith("},")) {
        levelKeys.pop();
        if (levelKeys.length === 0) levelKeys.push(new Set());
      }
    }
    if (dupes.length) {
      console.log("[DUPLICATE JSON KEY] " + file + ": " + dupes.join(", "));
      found = 1;
    }
  } catch (e) {
    console.log("[ERROR] " + file + ": " + e.message);
    found = 1;
  }
}
process.exit(found);
'

VALIDATE_PYTHON='
import json, sys
found = 0
for f in sys.argv[1:]:
    try:
        with open(f) as fh:
            json.load(fh)
    except json.JSONDecodeError as e:
        print(f"[JSON SYNTAX ERROR] {f}: {e}")
        found = 1
    except Exception as e:
        print(f"[ERROR] {f}: {e}")
        found = 1
sys.exit(found)
'

# Try Node.js first, fall back to Python (syntax check only for Python)
if command -v node &>/dev/null; then
  echo "$JSON_FILES" | xargs node -e "$VALIDATE_NODE"
  STATUS=$?
elif command -v python3 &>/dev/null; then
  echo "[INFO] Node.js not found, using Python (syntax check only, no duplicate key detection)"
  echo "$JSON_FILES" | xargs python3 -c "$VALIDATE_PYTHON"
  STATUS=$?
else
  echo "[WARN] Neither Node.js nor Python found. Skipping JSON integrity check."
  exit 0
fi

if [ "$STATUS" -ne 0 ]; then
  echo ""
  echo -e "${RED}JSON integrity issues found! Fix duplicate keys and syntax errors.${NC}"
  exit 1
fi

echo "All JSON files are valid with no duplicate keys."
exit 0

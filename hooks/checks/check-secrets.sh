#!/usr/bin/env bash
# check-secrets.sh — Detect hardcoded secrets (language-agnostic)
# Trine Layer 1 Hook (pre-push). Deployed via trine-sync.
# Usage: bash check-secrets.sh [search_dir] (default: current directory)
set -euo pipefail

RED='\033[0;31m'
NC='\033[0m'

SEARCH_DIR="${1:-.}"

PATTERNS=(
  'password\s*[:=]\s*["\x27][^"\x27]{4,}'
  'secret\s*[:=]\s*["\x27][^"\x27]{4,}'
  'api[_-]?key\s*[:=]\s*["\x27][^"\x27]{8,}'
  'Bearer\s+[A-Za-z0-9\-._~+/]+=*'
  'token\s*[:=]\s*["\x27][^"\x27]{8,}'
  'PRIVATE[_-]KEY'
  'sk-[A-Za-z0-9]{20,}'
  'ghp_[A-Za-z0-9]{36}'
  'aws_access_key_id\s*[:=]'
  'aws_secret_access_key\s*[:=]'
)

# Universal excludes (works across languages/frameworks)
EXCLUDE="node_modules|\.next|dist|\.pnpm|pnpm-lock\.yaml|package-lock\.json|\.lock|\.map|\.min\.|__mocks__|check-secrets\.sh|\.git/|Library/|Temp/|obj/|bin/"

# Exclude test files (test fixtures commonly contain fake credentials)
EXCLUDE_TESTS="\.test\.|\.spec\.|\.e2e-spec\.|/test/|/tests/|/__tests__/|/fixtures/|/mocks/"

# Source file extensions (multi-language)
INCLUDE_ARGS=(
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
  --include="*.cs" --include="*.py" --include="*.go" --include="*.java"
  --include="*.json" --include="*.yaml" --include="*.yml"
  --include="*.env" --include="*.env.*" --include="*.toml" --include="*.cfg"
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  MATCHES=$(grep -rniE "$pattern" "$SEARCH_DIR" "${INCLUDE_ARGS[@]}" 2>/dev/null | grep -vE "$EXCLUDE" | grep -vE "$EXCLUDE_TESTS" || true)
  if [ -n "$MATCHES" ]; then
    echo -e "${RED}[SECRET DETECTED]${NC} Pattern: $pattern"
    echo "$MATCHES"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo -e "${RED}Hardcoded secrets detected! Move them to environment variables.${NC}"
  exit 1
fi

echo "No hardcoded secrets found."
exit 0

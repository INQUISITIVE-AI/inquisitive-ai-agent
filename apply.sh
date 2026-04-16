#!/usr/bin/env bash
# apply.sh — drop every fixed file into its canonical path in inquisitive-ai-agent
# Usage: run from the repo root after unzipping this bundle into a sibling directory.
#   cd inquisitive-ai-agent && bash ../getinqai-fix-bundle/apply.sh

set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="${REPO_DIR:-$(pwd)}"

if [[ ! -f "$REPO_DIR/package.json" ]]; then
  echo "ERROR: run this from the inquisitive-ai-agent repo root (or export REPO_DIR=...)." >&2
  exit 1
fi

echo "Applying fix bundle from:  $BUNDLE_DIR"
echo "Into repo at:              $REPO_DIR"
echo

BRANCH="${BRANCH:-fix/production-ready-$(date +%Y%m%d)}"
git -C "$REPO_DIR" checkout -b "$BRANCH" 2>/dev/null || git -C "$REPO_DIR" checkout "$BRANCH"

copy_file() {
  local rel="$1"
  local src="$BUNDLE_DIR/$rel"
  local dst="$REPO_DIR/$rel"
  mkdir -p "$(dirname "$dst")"
  cp -v "$src" "$dst"
}

# Root-level
copy_file package.json
copy_file .npmrc
copy_file .env.example
copy_file hardhat.config.js
copy_file next.config.js
copy_file README.md
copy_file DEPLOYMENT_GUIDE.md

# Scripts
copy_file scripts/deploy.js
copy_file scripts/authorize-forwarder.js
copy_file scripts/portfolio-config.json

# Server
copy_file server/index.js
copy_file server/routes/inquisitiveAI.js
copy_file server/services/priceFeed.js
copy_file server/services/ohlcFeed.js
copy_file server/services/tradingEngine.js
copy_file server/services/inquisitiveBrain.js
copy_file server/services/macroData.js
copy_file server/services/vaultOracle.js
copy_file server/services/wsServer.js
copy_file server/services/db.js

# Regenerate lockfile
rm -f "$REPO_DIR/package-lock.json"

echo
echo "✓ Files copied onto branch '$BRANCH'."
echo "Next:"
echo "  1. npm install   # regenerate lockfile"
echo "  2. npm run compile"
echo "  3. cp .env.example .env  && fill in secrets"
echo "  4. git add -A && git commit -m 'fix: production-ready bundle (blockers 1-11, critical 1-14)'"
echo "  5. Review diff with: git diff main..$BRANCH"

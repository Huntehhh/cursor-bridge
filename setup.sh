#!/bin/bash
# CursorBridge — One-command setup for Mac
# Usage: curl -sL <raw-url> | bash
#   or:  ./setup.sh (after cloning)

set -e

echo ""
echo "  🎄 CursorBridge Setup"
echo "  ─────────────────────"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "  ❌ Node.js not found. Install it first:"
  echo "     brew install node"
  echo ""
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "  ❌ Node.js 18+ required (you have $(node -v))"
  echo "     brew upgrade node"
  echo ""
  exit 1
fi

echo "  ✓ Node.js $(node -v) detected"

# Install deps
echo "  ⏳ Installing dependencies..."
npm install --silent 2>/dev/null
echo "  ✓ Dependencies installed"
echo ""

# Launch — the built-in wizard handles the rest
echo "  🚀 Starting CursorBridge..."
echo "     (First run = setup wizard — just paste your Anthropic key)"
echo ""
npx tsx bin/cli.ts

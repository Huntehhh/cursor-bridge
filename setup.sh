#!/bin/bash
# CursorBridge — One-command setup
# Usage: ./setup.sh (after cloning)
#
# Prerequisites: Node.js 18+, Claude Code CLI (logged in)
# Auto-detects your Claude Code OAuth token — zero key pasting.

set -e

echo ""
echo "  CursorBridge Setup"
echo "  ─────────────────────"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "  ✗ Node.js not found. Install it first: https://nodejs.org"
  echo ""
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "  ✗ Node.js 18+ required (you have $(node -v))"
  echo ""
  exit 1
fi

echo "  ✓ Node.js $(node -v) detected"

# Install deps
echo "  ⏳ Installing dependencies..."
npm install --silent 2>/dev/null
echo "  ✓ Dependencies installed"
echo ""

# Launch — auto-setup handles Claude Code detection in the browser
echo "  Starting CursorBridge..."
echo "  (Auto-detects your Claude Code subscription — no key pasting needed)"
echo ""
npx tsx bin/cli.ts

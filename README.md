# CursorBridge

**Use your Claude subscription in Cursor — zero API keys, zero config files.**

CursorBridge is a local proxy that translates Cursor's OpenAI-format requests into Anthropic format and routes them through your existing Claude subscription. It auto-detects your Claude Code login, so there's nothing to paste or configure on the backend side.

**Result:** Claude models in Cursor, using the subscription you already pay for.

---

## Quick Start

```bash
git clone <repo-url> cursor-bridge
cd cursor-bridge
./setup.sh
```

That's it. The setup script will:
1. Check for Node.js 18+
2. Install dependencies
3. Auto-detect your Claude Code OAuth token
4. Verify the connection to Claude
5. Print your Cursor settings

## Prerequisites

- **Node.js 18+** — `brew install node` if needed
- **Claude Code CLI** — installed and logged in (`npm install -g @anthropic-ai/claude-code`, then run `claude` once to log in)

CursorBridge reads your existing Claude Code credentials automatically. No API keys to generate or paste.

## Cursor Configuration

After CursorBridge is running, open Cursor:

1. **Settings → Models → OpenAI API Key** — paste the local token printed in your terminal
2. **Toggle ON** "Override OpenAI Base URL"
3. **Set Base URL** to `http://localhost:4101/v1`
4. **Click Verify** — you should see a green checkmark
5. **Start chatting** — Claude is now powering your Cursor

The local token is just for Cursor ↔ CursorBridge auth. Your real credentials never leave your machine.

## Model Mapping

When Cursor sends requests for OpenAI models, CursorBridge maps them to Claude:

| Cursor model | Routes to |
|---|---|
| `gpt-4`, `gpt-4o` | Claude Sonnet 4.5 |
| `gpt-4-turbo` | Claude Opus 4.6 |
| `gpt-3.5-turbo`, `gpt-4o-mini` | Claude Haiku 3.5 |
| `claude-*` | Passed through directly |

## Daily Use

```bash
cd cursor-bridge
./setup.sh
```

Or if you've already run setup once:

```bash
cd cursor-bridge
npm run dev
```

Start this before opening Cursor. Stop with `Ctrl+C` when done.

## CLI Options

```bash
npm run dev -- --port 4200    # Custom port
npm run dev -- --reset        # Re-run setup (re-detect token)
npm run dev -- --version      # Show version
```

## How It Works

```
Cursor → localhost:4101 (OpenAI format)
  → CursorBridge translates request
  → Anthropic API (your Claude subscription, via OAuth)
  → CursorBridge translates response → OpenAI format
  → Back to Cursor
```

On first run, CursorBridge reads `~/.claude/.credentials.json` (created when you log into Claude Code), extracts your OAuth token, and stores a local config in `~/.cursor-bridge/config.json`. Your OAuth token stays local — Cursor only sees a randomly-generated local token.

## Troubleshooting

**"Claude Code not found"**
- Install it: `npm install -g @anthropic-ai/claude-code`
- Then run `claude` once in your terminal to log in

**"No Claude login found"**
- Run `claude` in your terminal — this creates the credentials file CursorBridge reads
- Make sure you complete the login flow (browser opens, you authorize)

**"Token expired"**
- Run `claude` in your terminal to refresh your OAuth session
- Then restart CursorBridge: `./setup.sh`

**Cursor "Verify" fails**
- Make sure CursorBridge is running in a terminal
- Check the port matches (default: 4101)
- The local token in Cursor must match what CursorBridge printed

**Responses are slow?**
- Normal Claude API latency — same as using Claude directly
- Streaming is on by default, so you'll see tokens as they arrive

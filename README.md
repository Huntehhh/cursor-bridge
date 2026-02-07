# CursorBridge

**Use your Claude subscription in Cursor instead of paying per-token.**

CursorBridge is a tiny local proxy that sits between Cursor IDE and Anthropic's API. You give it your Claude API key, it translates Cursor's OpenAI-format requests into Anthropic format, and routes them through your subscription. Your key never leaves your machine.

**Result:** Same Claude models in Cursor, fraction of the cost.

---

## Quick Start (Mac)

**Prerequisites:** Node.js 18+ (`brew install node` if needed)

```bash
git clone <repo-url> cursor-bridge
cd cursor-bridge
chmod +x setup.sh && ./setup.sh
```

That's it. The setup wizard will:
1. Ask for your Anthropic API key
2. Generate a local auth token
3. Start the proxy
4. Print your Cursor settings

## Cursor Configuration

After CursorBridge is running, open Cursor:

1. **Settings → Models → OpenAI API Key** — paste the local token from the terminal
2. **Toggle ON** "Override OpenAI Base URL"
3. **Set Base URL:** `http://localhost:4101/v1`
4. **Click Verify** — you should see a green checkmark

Done. Chat with Claude in Cursor.

## Getting Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Settings → API Keys → Create Key
3. Copy the key (starts with `sk-ant-api`)

## Daily Use

```bash
cd cursor-bridge
npm run dev
```

Start this before opening Cursor. Stop it with `Ctrl+C` when done.

## Model Mapping

When Cursor sends requests for OpenAI models, CursorBridge routes them to Claude:

| Cursor sends | Claude receives |
|---|---|
| gpt-4, gpt-4o | Claude Sonnet 4.5 |
| gpt-4-turbo | Claude Opus 4.6 |
| gpt-3.5-turbo, gpt-4o-mini | Claude Haiku 3.5 |
| claude-* | Passed through directly |

## CLI Options

```bash
npm run dev -- --port 4200    # Custom port
npm run dev -- --reset        # Re-run setup wizard
npm run dev -- --version      # Show version
```

## How It Works

```
Cursor → localhost:4101 (OpenAI format)
  → CursorBridge translates request → Anthropic format
  → Anthropic API (your key, your subscription)
  → CursorBridge translates response → OpenAI format
  → Back to Cursor
```

Your Anthropic key stays in `~/.cursor-bridge/config.json` on your machine. Cursor only ever sees the local token.

## Troubleshooting

**Cursor "Verify" fails?**
- Make sure CursorBridge is running in a terminal
- Check the port matches (default: 4101)
- The local token in Cursor must match the one CursorBridge printed

**Responses are slow?**
- That's normal Anthropic API latency, same as using Claude directly
- Streaming is enabled by default so you'll see tokens as they arrive

**"Rate limit" errors?**
- You're hitting Anthropic's rate limits — same limits as direct API use
- Wait a moment and try again

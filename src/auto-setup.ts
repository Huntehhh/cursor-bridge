/**
 * Auto-setup pipeline — detects Claude Code installation,
 * reads the OAuth token from ~/.claude/.credentials.json,
 * configures CursorBridge, and verifies the connection.
 *
 * Yields SetupStep objects for SSE streaming to the frontend.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import type { AppState } from "./index.js";
import { defaultConfig, saveConfig } from "./config.js";
import { createClient } from "./client.js";

export interface SetupStep {
  id: string;
  status: "pending" | "running" | "done" | "error";
  label: string;
  skippy: string;
  detail?: string;
}

/**
 * Detect if Claude Code CLI is installed.
 * Returns the path if found, null otherwise.
 */
function detectClaudeCLI(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where claude" : "which claude";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim();
    // `where` on Windows can return multiple lines — take the first
    return result.split("\n")[0].trim() || null;
  } catch {
    return null;
  }
}

/**
 * Read Claude Code OAuth credentials from disk.
 * Returns the parsed credentials object or null.
 */
export function readClaudeCredentials(): {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  subscriptionType?: string;
} | null {
  const credPath = join(homedir(), ".claude", ".credentials.json");
  if (!existsSync(credPath)) return null;

  try {
    const raw = readFileSync(credPath, "utf-8");
    const parsed = JSON.parse(raw);
    const oauth = parsed?.claudeAiOauth;
    if (!oauth?.accessToken) return null;
    return oauth;
  } catch {
    return null;
  }
}

/**
 * Run the full auto-setup pipeline as an async generator.
 * Each yield is a SetupStep that gets streamed to the frontend via SSE.
 */
export async function* runAutoSetup(
  state: AppState
): AsyncGenerator<SetupStep> {
  // ── Step 1: Detect Claude Code CLI ──
  yield {
    id: "detect_cli",
    status: "running",
    label: "Checking for Claude Code...",
    skippy: "Let's see if you're smarter than the average monkey...",
  };

  await delay(600);
  const cliPath = detectClaudeCLI();

  if (!cliPath) {
    yield {
      id: "detect_cli",
      status: "error",
      label: "Claude Code not found",
      skippy:
        "Even monkeys know how to install things. Try: npm install -g @anthropic-ai/claude-code",
      detail: "Install Claude Code first, then run this again.",
    };
    return;
  }

  yield {
    id: "detect_cli",
    status: "done",
    label: "Claude Code detected",
    skippy: "Well well well, you DO have it installed. Impressive... for a filthy monkey.",
    detail: cliPath,
  };

  await delay(800);

  // ── Step 2: Read OAuth token ──
  yield {
    id: "read_token",
    status: "running",
    label: "Reading your subscription token...",
    skippy: "Time to peek at your credentials file...",
  };

  await delay(600);
  const creds = readClaudeCredentials();

  if (!creds) {
    yield {
      id: "read_token",
      status: "error",
      label: "No Claude login found",
      skippy:
        "You have Claude Code but haven't logged in? Run 'claude' in your terminal first, monkey.",
      detail:
        "Run `claude` in your terminal to log in, then come back here.",
    };
    return;
  }

  // Check expiration
  if (creds.expiresAt && creds.expiresAt < Date.now()) {
    yield {
      id: "read_token",
      status: "error",
      label: "Token expired",
      skippy:
        "Your token went stale. Run 'claude' to refresh your login. I'll wait... impatiently.",
      detail: "Run `claude` in your terminal to refresh, then come back.",
    };
    return;
  }

  const subType = creds.subscriptionType ?? "unknown";
  yield {
    id: "read_token",
    status: "done",
    label: "Token extracted",
    skippy: `Ooh, a ${subType.charAt(0).toUpperCase() + subType.slice(1)} subscription. Fancy monkey.`,
    detail: subType,
  };

  await delay(800);

  // ── Step 3: Configure CursorBridge ──
  yield {
    id: "configure",
    status: "running",
    label: "Configuring CursorBridge...",
    skippy: "I wrote 200 lines of code for this. You're welcome.",
  };

  await delay(500);

  try {
    const config = defaultConfig(creds.accessToken, state.port);
    saveConfig(config);

    // Hot-swap state — proxy routes pick this up immediately
    state.config = config;
    state.client = createClient(creds.accessToken);

    yield {
      id: "configure",
      status: "done",
      label: "Configuration saved",
      skippy: "Config written. Your proxy is armed and dangerous.",
      detail: `Port ${config.port}, token ${config.localToken.slice(0, 12)}...`,
    };
  } catch (err) {
    yield {
      id: "configure",
      status: "error",
      label: "Configuration failed",
      skippy: "Something broke. I blame you.",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
    return;
  }

  await delay(800);

  // ── Step 4: Verify connection ──
  yield {
    id: "verify",
    status: "running",
    label: "Testing connection to Claude...",
    skippy: "Trust the awesomeness...",
  };

  try {
    const response = await state.client!.messages.create({
      model: "claude-sonnet-4-5-20250929",
      system: "You are Claude Code, Anthropic's official CLI for Claude.",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });

    yield {
      id: "verify",
      status: "done",
      label: "Connection verified",
      skippy: "Claude answered. The bridge is alive.",
      detail: `Model: ${response.model}`,
    };
  } catch (err) {
    yield {
      id: "verify",
      status: "error",
      label: "Connection failed",
      skippy: "Claude didn't answer. Your token might be busted.",
      detail: err instanceof Error ? err.message : "API error",
    };
    return;
  }

  await delay(600);

  // ── Step 5: Complete ──
  yield {
    id: "complete",
    status: "done",
    label: "You're all set!",
    skippy:
      "Somewhere, a caveman is proud of how far you've come. I am not that caveman.",
    detail: JSON.stringify({
      localToken: state.config!.localToken,
      baseUrl: `http://localhost:${state.config!.port}/v1`,
    }),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

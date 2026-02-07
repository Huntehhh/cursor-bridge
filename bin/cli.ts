#!/usr/bin/env tsx

import { exec } from "node:child_process";
import {
  configExists,
  loadConfig,
} from "../src/config.js";
import { createClient, detectKeyType } from "../src/client.js";
import { createApp, type AppState } from "../src/index.js";
import { startServer } from "../src/server.js";

const VERSION = "0.1.0";

function openBrowser(url: string) {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `cmd /c start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-v")) {
    console.log(`cursor-bridge v${VERSION}`);
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
cursor-bridge v${VERSION}
Local proxy: Cursor IDE → Claude API (subscription or API key)

Usage: cursor-bridge [options]

Options:
  --port <port>   Override port (default: 4101)
  --reset         Re-run setup (opens browser)
  --version       Show version
  --help          Show this help
`);
    process.exit(0);
  }

  const shouldReset = args.includes("--reset");
  const portFlag = args.indexOf("--port");
  const portOverride =
    portFlag !== -1 ? parseInt(args[portFlag + 1], 10) : undefined;

  const port = portOverride ?? 4101;

  // Build state — may or may not have config
  const state: AppState = {
    client: null,
    config: null,
    port,
  };

  if (configExists() && !shouldReset) {
    try {
      const config = loadConfig();
      if (portOverride) config.port = portOverride;
      state.config = config;
      state.port = config.port;
      state.client = createClient(config.anthropicKey);
      console.log(`  Key type: ${detectKeyType(config.anthropicKey)}`);
      console.log(`  Local token: ${config.localToken}`);
    } catch (err) {
      console.error(`  Config corrupted, starting fresh setup. (${err instanceof Error ? err.message : err})`);
    }
  }

  const app = createApp(state);
  startServer(app, state.port);

  // Auto-open browser for first-run gift experience
  if (!state.config || shouldReset) {
    const url = `http://localhost:${state.port}`;
    console.log(`\n  Opening gift in browser...`);
    setTimeout(() => openBrowser(url), 500);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

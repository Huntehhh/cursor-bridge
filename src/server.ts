import { serve } from "@hono/node-server";
import type { Hono } from "hono";

export function startServer(app: Hono, port: number): void {
  serve(
    {
      fetch: app.fetch,
      port,
      hostname: "127.0.0.1",
    },
    (info) => {
      const p = info.port;
      console.log(`
  CursorBridge v0.1.0 — Claude ↔ OpenAI Proxy
  ─────────────────────────────────────────────
  Listening: http://localhost:${p}
  Health:    http://localhost:${p}/health

  Cursor Setup:
    1. Settings → Models → OpenAI API Key
    2. Paste your local token (from config)
    3. Toggle ON "Override OpenAI Base URL"
    4. Set Base URL: http://localhost:${p}/v1
    5. Click Verify
`);
    }
  );
}

import { Hono } from "hono";
import { logger } from "hono/logger";
import type Anthropic from "@anthropic-ai/sdk";
import type { Config } from "./config.js";
import { modelsRoute } from "./routes/models.js";
import { completionsRoute } from "./routes/completions.js";
import { uiRoutes } from "./routes/ui.js";

export interface AppState {
  client: Anthropic | null;
  config: Config | null;
  port: number;
}

/**
 * Create the Hono app with all routes registered upfront.
 * Proxy routes check state.client at request time — they return 503 until configured.
 * Auth is also checked dynamically against state.config.localToken.
 */
export function createApp(state: AppState): Hono {
  const app = new Hono();

  // Request logging
  app.use("*", logger());

  // Health check (no auth)
  app.get("/health", (c) =>
    c.json({ status: "ok", configured: !!state.config })
  );

  // UI routes (gift page, setup API) — always available, no auth
  uiRoutes(state, app);

  // Dynamic auth on /v1/* — checks state.config at request time
  app.use("/v1/*", async (c, next) => {
    if (!state.config) {
      return c.json(
        {
          error: {
            message: "CursorBridge not configured yet",
            type: "invalid_request_error",
            code: "not_configured",
          },
        },
        503
      );
    }
    const header = c.req.header("Authorization");
    if (!header) {
      return c.json(
        { error: { message: "Missing Authorization header", type: "invalid_request_error", code: "missing_api_key" } },
        401
      );
    }
    const token = header.replace(/^Bearer\s+/i, "");
    if (token !== state.config.localToken) {
      return c.json(
        { error: { message: "Invalid API key", type: "authentication_error", code: "invalid_api_key" } },
        401
      );
    }
    await next();
  });

  // Proxy routes — always registered, check state.client at request time
  app.route("/v1/models", modelsRoute);
  app.route("/v1/chat/completions", completionsRoute(state));

  return app;
}

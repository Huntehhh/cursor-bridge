import { Hono } from "hono";

/**
 * GET /v1/models — Cursor hits this when you click "Verify".
 * Returns a minimal model list in OpenAI format.
 */

const MODELS = [
  { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-3-5-haiku-20241022", name: "Claude Haiku 3.5" },
];

export const modelsRoute = new Hono();

modelsRoute.get("/", (c) => {
  return c.json({
    object: "list",
    data: MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: 1700000000,
      owned_by: "anthropic",
    })),
  });
});

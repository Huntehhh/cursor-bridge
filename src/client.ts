import Anthropic from "@anthropic-ai/sdk";

/**
 * Detect key type from prefix:
 * - sk-ant-oat  → OAuth subscription token
 * - sk-ant-api  → standard API key
 * - anything else → treated as standard API key
 */
export function detectKeyType(key: string): "oauth" | "api" {
  if (key.startsWith("sk-ant-oat")) return "oauth";
  return "api";
}

export function createClient(key: string): Anthropic {
  const keyType = detectKeyType(key);

  if (keyType === "oauth") {
    return new Anthropic({
      authToken: key,
      defaultHeaders: {
        "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-beta": "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14",
        "user-agent": "claude-cli/2.1.34 (external, cli)",
        "x-app": "cli",
      },
    });
  }

  return new Anthropic({ apiKey: key });
}

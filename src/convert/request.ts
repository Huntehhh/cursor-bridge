import type { Config } from "../config.js";

// ── OpenAI request types ──

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | OpenAIContentPart[] | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

type OpenAIToolChoice =
  | "none"
  | "auto"
  | "required"
  | { type: "function"; function: { name: string } };

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  tools?: OpenAITool[];
  tool_choice?: OpenAIToolChoice;
}

// ── Anthropic request types ──

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "image" | "tool_use" | "tool_result";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string | AnthropicContentBlock[];
  is_error?: boolean;
}

interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicToolChoice {
  type: "auto" | "any" | "tool";
  name?: string;
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  stream: boolean;
}

// ── Conversion ──

export function resolveModel(
  model: string,
  config: Pick<Config, "defaultModel" | "modelAliases">
): string {
  // If the model is already a Claude model ID, pass through
  if (model.startsWith("claude-")) return model;
  return config.modelAliases[model] ?? config.defaultModel;
}

function convertContent(
  content: string | OpenAIContentPart[] | null
): string | AnthropicContentBlock[] {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;

  const blocks: AnthropicContentBlock[] = [];
  for (const part of content) {
    if (part.type === "text" && part.text) {
      blocks.push({ type: "text", text: part.text });
    } else if (part.type === "image_url" && part.image_url) {
      const url = part.image_url.url;
      // Handle base64 data URIs
      const match = url.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: match[1],
            data: match[2],
          },
        });
      }
      // URL-based images not supported by Anthropic API — skip silently
    }
  }
  return blocks.length === 1 && blocks[0].type === "text"
    ? (blocks[0].text ?? "")
    : blocks;
}

function convertToolCalls(toolCalls: OpenAIToolCall[]): AnthropicContentBlock[] {
  return toolCalls.map((tc) => {
    let input: unknown = {};
    try {
      input = JSON.parse(tc.function.arguments || "{}");
    } catch {
      // Malformed/partial JSON from client — fall back to empty object
      input = {};
    }
    return {
      type: "tool_use" as const,
      id: tc.id,
      name: tc.function.name,
      input,
    };
  });
}

function convertMessages(messages: OpenAIMessage[]): {
  system: string | undefined;
  messages: AnthropicMessage[];
} {
  const systemParts: string[] = [];
  const converted: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("\n")
            : "";
      if (text) systemParts.push(text);
      continue;
    }

    if (msg.role === "tool") {
      // OpenAI tool results → Anthropic tool_result block
      const resultBlock: AnthropicContentBlock = {
        type: "tool_result",
        tool_use_id: msg.tool_call_id,
        content: typeof msg.content === "string" ? msg.content : "",
      };
      // Merge into last user message or create new one
      const last = converted[converted.length - 1];
      if (last && last.role === "user") {
        if (typeof last.content === "string") {
          last.content = [
            { type: "text", text: last.content },
            resultBlock,
          ];
        } else if (Array.isArray(last.content)) {
          last.content.push(resultBlock);
        }
      } else {
        converted.push({ role: "user", content: [resultBlock] });
      }
      continue;
    }

    if (msg.role === "assistant") {
      const blocks: AnthropicContentBlock[] = [];

      // Text content
      const content = convertContent(msg.content);
      if (typeof content === "string" && content) {
        blocks.push({ type: "text", text: content });
      } else if (Array.isArray(content)) {
        blocks.push(...content);
      }

      // Tool calls
      if (msg.tool_calls?.length) {
        blocks.push(...convertToolCalls(msg.tool_calls));
      }

      if (blocks.length > 0) {
        converted.push({ role: "assistant", content: blocks });
      } else {
        converted.push({ role: "assistant", content: "" });
      }
      continue;
    }

    // user messages
    converted.push({
      role: "user",
      content: convertContent(msg.content),
    });
  }

  // Anthropic requires alternating user/assistant messages.
  // Merge consecutive same-role messages.
  const merged: AnthropicMessage[] = [];
  for (const msg of converted) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      // Merge content
      const lastBlocks = toBlockArray(last.content);
      const msgBlocks = toBlockArray(msg.content);
      last.content = [...lastBlocks, ...msgBlocks];
    } else {
      merged.push({ ...msg });
    }
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    messages: merged,
  };
}

function toBlockArray(
  content: string | AnthropicContentBlock[]
): AnthropicContentBlock[] {
  if (typeof content === "string") {
    return content ? [{ type: "text", text: content }] : [];
  }
  return content;
}

function convertTools(tools: OpenAITool[]): AnthropicTool[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters ?? { type: "object", properties: {} },
  }));
}

function convertToolChoice(
  choice: OpenAIToolChoice
): AnthropicToolChoice | undefined {
  if (choice === "none") return undefined;
  if (choice === "auto") return { type: "auto" };
  if (choice === "required") return { type: "any" };
  if (typeof choice === "object") {
    if (choice.type === "function" && choice.function?.name) {
      return { type: "tool", name: choice.function.name };
    }
    // Handle {"type": "auto"} format that Cursor sends
    if ("type" in choice && (choice as { type: string }).type === "auto") {
      return { type: "auto" };
    }
  }
  return undefined;
}

// OAuth tokens require the system prompt to start with this preamble.
// Without it, the API returns "This credential is only authorized for use with Claude Code".
const CLAUDE_CODE_PREAMBLE =
  "You are Claude Code, Anthropic's official CLI for Claude.";

export function convertRequest(
  req: OpenAIRequest,
  config: Pick<Config, "defaultModel" | "modelAliases">
): AnthropicRequest {
  const { system, messages } = convertMessages(req.messages);

  const result: AnthropicRequest = {
    model: resolveModel(req.model, config),
    max_tokens: req.max_tokens ?? 8192,
    messages,
    stream: req.stream ?? true,
  };

  // Prepend Claude Code preamble for OAuth token compatibility
  result.system = system
    ? `${CLAUDE_CODE_PREAMBLE}\n\n${system}`
    : CLAUDE_CODE_PREAMBLE;
  if (req.temperature !== undefined) result.temperature = req.temperature;
  if (req.top_p !== undefined) result.top_p = req.top_p;

  if (req.stop) {
    result.stop_sequences = Array.isArray(req.stop) ? req.stop : [req.stop];
  }

  if (req.tools?.length) {
    result.tools = convertTools(req.tools);
  }

  if (req.tool_choice !== undefined) {
    const converted = convertToolChoice(req.tool_choice);
    if (converted) result.tool_choice = converted;
  }

  return result;
}

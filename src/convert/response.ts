/**
 * Anthropic streaming events → OpenAI SSE chunk conversion.
 *
 * The key challenge: Anthropic indexes content blocks sequentially (text + tool_use),
 * but OpenAI only indexes tool_calls separately. So we track a dedicated
 * toolCallIndex that increments only for tool_use blocks.
 */

import type Anthropic from "@anthropic-ai/sdk";

// Anthropic stream event types (from SDK)
type StreamEvent = Anthropic.MessageStreamEvent;

// OpenAI SSE chunk shape
export interface OpenAIChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: OpenAIChunkChoice[];
}

interface OpenAIChunkChoice {
  index: 0;
  delta: OpenAIDelta;
  finish_reason: string | null;
}

interface OpenAIDelta {
  role?: "assistant";
  content?: string | null;
  tool_calls?: OpenAIDeltaToolCall[];
}

interface OpenAIDeltaToolCall {
  index: number;
  id?: string;
  type?: "function";
  function: {
    name?: string;
    arguments?: string;
  };
}

// ── State machine ──

export interface ConverterState {
  messageId: string;
  model: string;
  created: number;
  toolCallIndex: number;
  // Map from Anthropic content_block index → our toolCallIndex
  blockToToolIndex: Map<number, number>;
}

export function createConverterState(): ConverterState {
  return {
    messageId: "",
    model: "",
    created: Math.floor(Date.now() / 1000),
    toolCallIndex: 0,
    blockToToolIndex: new Map(),
  };
}

function makeChunk(
  state: ConverterState,
  delta: OpenAIDelta,
  finishReason: string | null = null
): OpenAIChunk {
  return {
    id: state.messageId || `chatcmpl-${crypto.randomUUID().slice(0, 8)}`,
    object: "chat.completion.chunk",
    created: state.created,
    model: state.model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

/**
 * Convert a single Anthropic stream event to zero or one OpenAI SSE chunk.
 * Returns null for events that should be silently skipped (thinking, ping, etc).
 */
export function convertStreamEvent(
  event: StreamEvent,
  state: ConverterState
): OpenAIChunk | null {
  switch (event.type) {
    case "message_start": {
      state.messageId = event.message.id;
      state.model = event.message.model;
      // First chunk: role announcement
      return makeChunk(state, { role: "assistant", content: "" });
    }

    case "content_block_start": {
      if (event.content_block.type === "tool_use") {
        const idx = state.toolCallIndex;
        state.blockToToolIndex.set(event.index, idx);
        state.toolCallIndex++;
        return makeChunk(state, {
          tool_calls: [
            {
              index: idx,
              id: event.content_block.id,
              type: "function",
              function: {
                name: event.content_block.name,
                arguments: "",
              },
            },
          ],
        });
      }
      // text block start — no OpenAI equivalent, skip
      // thinking block start — skip
      return null;
    }

    case "content_block_delta": {
      if (event.delta.type === "text_delta") {
        return makeChunk(state, { content: event.delta.text });
      }
      if (event.delta.type === "input_json_delta") {
        const idx = state.blockToToolIndex.get(event.index);
        if (idx === undefined) return null;
        return makeChunk(state, {
          tool_calls: [
            {
              index: idx,
              function: { arguments: event.delta.partial_json },
            },
          ],
        });
      }
      // thinking_delta — silently ignore
      return null;
    }

    case "content_block_stop": {
      // No OpenAI equivalent
      return null;
    }

    case "message_delta": {
      const reasonMap: Record<string, string> = {
        tool_use: "tool_calls",
        max_tokens: "length",
        end_turn: "stop",
        stop_sequence: "stop",
      };
      const reason = reasonMap[event.delta.stop_reason ?? ""] ?? "stop";
      return makeChunk(state, {}, reason);
    }

    case "message_stop": {
      // Signal end of stream — caller emits [DONE]
      return null;
    }

    default:
      // ping, error, etc — skip
      return null;
  }
}

// ── Non-streaming response conversion ──

export interface OpenAIChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: [
    {
      index: 0;
      message: {
        role: "assistant";
        content: string | null;
        tool_calls?: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }>;
      };
      finish_reason: string;
    },
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function convertNonStreamingResponse(
  response: Anthropic.Message
): OpenAIChatCompletion {
  let textContent = "";
  const toolCalls: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }> = [];

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      });
    }
  }

  const reasonMap: Record<string, string> = {
    tool_use: "tool_calls",
    max_tokens: "length",
    end_turn: "stop",
    stop_sequence: "stop",
  };
  const finishReason = reasonMap[response.stop_reason ?? ""] ?? "stop";

  return {
    id: response.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent || null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

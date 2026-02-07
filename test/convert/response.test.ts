import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  convertStreamEvent,
  convertNonStreamingResponse,
  createConverterState,
  type ConverterState,
} from "../../src/convert/response.js";
import type Anthropic from "@anthropic-ai/sdk";

type StreamEvent = Anthropic.MessageStreamEvent;

function loadEvents(fixture: string): StreamEvent[] {
  const raw = readFileSync(
    join(import.meta.dirname, "../fixtures", fixture),
    "utf-8"
  );
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as StreamEvent);
}

describe("convertStreamEvent — text", () => {
  it("converts a full text stream to OpenAI chunks", () => {
    const events = loadEvents("anthropic-stream-text.jsonl");
    const state = createConverterState();
    const chunks = events
      .map((e) => convertStreamEvent(e, state))
      .filter(Boolean);

    // message_start → role chunk
    expect(chunks[0]!.choices[0].delta.role).toBe("assistant");
    expect(chunks[0]!.id).toBe("msg_01XFDUDYJgAACzvnptvVoYEL");

    // text deltas
    expect(chunks[1]!.choices[0].delta.content).toBe("Hello");
    expect(chunks[2]!.choices[0].delta.content).toBe("! How");
    expect(chunks[3]!.choices[0].delta.content).toBe(" can I help?");

    // finish reason
    expect(chunks[4]!.choices[0].finish_reason).toBe("stop");
  });
});

describe("convertStreamEvent — tools", () => {
  it("converts tool_use events with correct indexing", () => {
    const events = loadEvents("anthropic-stream-tools.jsonl");
    const state = createConverterState();
    const chunks = events
      .map((e) => convertStreamEvent(e, state))
      .filter(Boolean);

    // 1: message_start → role chunk
    expect(chunks[0]!.choices[0].delta.role).toBe("assistant");

    // 2: text delta "Let me check the weather."
    expect(chunks[1]!.choices[0].delta.content).toBe(
      "Let me check the weather."
    );

    // 3: tool_use start — index should be 0 (first tool call)
    const toolStart = chunks[2]!.choices[0].delta.tool_calls;
    expect(toolStart).toBeDefined();
    expect(toolStart![0].index).toBe(0);
    expect(toolStart![0].id).toBe("toolu_01XYZ");
    expect(toolStart![0].function.name).toBe("get_weather");

    // 4-6: input_json deltas
    expect(chunks[3]!.choices[0].delta.tool_calls![0].function.arguments).toBe(
      '{"loc'
    );
    expect(chunks[4]!.choices[0].delta.tool_calls![0].function.arguments).toBe(
      'ation": "Par'
    );
    expect(chunks[5]!.choices[0].delta.tool_calls![0].function.arguments).toBe(
      'is"}'
    );

    // finish reason should be "tool_calls"
    expect(chunks[6]!.choices[0].finish_reason).toBe("tool_calls");
  });

  it("tracks tool call index correctly with multiple tools", () => {
    const state = createConverterState();

    // Simulate: text@0, tool@1, tool@2
    convertStreamEvent(
      {
        type: "message_start",
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [],
          model: "test",
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      } as StreamEvent,
      state
    );

    // text block start (index 0) — returns null
    convertStreamEvent(
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      } as StreamEvent,
      state
    );

    // First tool (Anthropic index 1) → toolCallIndex 0
    const chunk1 = convertStreamEvent(
      {
        type: "content_block_start",
        index: 1,
        content_block: {
          type: "tool_use",
          id: "tool_1",
          name: "fn_a",
          input: {},
        },
      } as StreamEvent,
      state
    );
    expect(chunk1!.choices[0].delta.tool_calls![0].index).toBe(0);

    // Second tool (Anthropic index 2) → toolCallIndex 1
    const chunk2 = convertStreamEvent(
      {
        type: "content_block_start",
        index: 2,
        content_block: {
          type: "tool_use",
          id: "tool_2",
          name: "fn_b",
          input: {},
        },
      } as StreamEvent,
      state
    );
    expect(chunk2!.choices[0].delta.tool_calls![0].index).toBe(1);
  });
});

describe("convertNonStreamingResponse", () => {
  it("converts a text-only response", () => {
    const response = {
      id: "msg_123",
      type: "message" as const,
      role: "assistant" as const,
      content: [{ type: "text" as const, text: "Hello there!" }],
      model: "claude-sonnet-4-5-20250929",
      stop_reason: "end_turn" as const,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    const result = convertNonStreamingResponse(response as Anthropic.Message);

    expect(result.id).toBe("msg_123");
    expect(result.object).toBe("chat.completion");
    expect(result.choices[0].message.content).toBe("Hello there!");
    expect(result.choices[0].message.role).toBe("assistant");
    expect(result.choices[0].finish_reason).toBe("stop");
    expect(result.usage.prompt_tokens).toBe(10);
    expect(result.usage.completion_tokens).toBe(5);
    expect(result.usage.total_tokens).toBe(15);
  });

  it("converts a response with tool use", () => {
    const response = {
      id: "msg_456",
      type: "message" as const,
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Let me look that up." },
        {
          type: "tool_use" as const,
          id: "toolu_789",
          name: "search",
          input: { query: "test" },
        },
      ],
      model: "claude-sonnet-4-5-20250929",
      stop_reason: "tool_use" as const,
      stop_sequence: null,
      usage: { input_tokens: 20, output_tokens: 15 },
    };

    const result = convertNonStreamingResponse(response as Anthropic.Message);

    expect(result.choices[0].message.content).toBe("Let me look that up.");
    expect(result.choices[0].message.tool_calls).toHaveLength(1);
    expect(result.choices[0].message.tool_calls![0].id).toBe("toolu_789");
    expect(result.choices[0].message.tool_calls![0].function.name).toBe(
      "search"
    );
    expect(result.choices[0].message.tool_calls![0].function.arguments).toBe(
      '{"query":"test"}'
    );
    expect(result.choices[0].finish_reason).toBe("tool_calls");
  });
});

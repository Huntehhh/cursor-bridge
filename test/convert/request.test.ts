import { describe, it, expect } from "vitest";
import { convertRequest, resolveModel } from "../../src/convert/request.js";
import type { OpenAIRequest } from "../../src/convert/request.js";
import basicFixture from "../fixtures/openai-request-basic.json";
import toolsFixture from "../fixtures/openai-request-tools.json";

const testConfig = {
  defaultModel: "claude-sonnet-4-5-20250929",
  modelAliases: {
    "gpt-4": "claude-sonnet-4-5-20250929",
    "gpt-4o": "claude-sonnet-4-5-20250929",
    "gpt-4-turbo": "claude-opus-4-6",
    "gpt-3.5-turbo": "claude-haiku-3-5-20241022",
  },
};

describe("resolveModel", () => {
  it("maps gpt-4 to Claude Sonnet", () => {
    expect(resolveModel("gpt-4", testConfig)).toBe(
      "claude-sonnet-4-5-20250929"
    );
  });

  it("passes through Claude model IDs unchanged", () => {
    expect(resolveModel("claude-opus-4-6", testConfig)).toBe(
      "claude-opus-4-6"
    );
  });

  it("falls back to default for unknown models", () => {
    expect(resolveModel("some-unknown-model", testConfig)).toBe(
      "claude-sonnet-4-5-20250929"
    );
  });
});

describe("convertRequest", () => {
  it("converts a basic chat request", () => {
    const result = convertRequest(basicFixture as OpenAIRequest, testConfig);

    expect(result.model).toBe("claude-sonnet-4-5-20250929");
    expect(result.system).toContain("You are Claude Code");
    expect(result.system).toContain("You are a helpful assistant.");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("Hello, how are you?");
    expect(result.max_tokens).toBe(1024);
    expect(result.temperature).toBe(0.7);
    expect(result.stream).toBe(true);
  });

  it("converts a request with tools and tool results", () => {
    const result = convertRequest(toolsFixture as OpenAIRequest, testConfig);

    expect(result.model).toBe("claude-sonnet-4-5-20250929");
    expect(result.system).toContain("You are Claude Code");
    expect(result.system).toContain("You can use tools to help the user.");

    // Should have tools converted
    expect(result.tools).toHaveLength(1);
    expect(result.tools![0].name).toBe("get_weather");
    expect(result.tools![0].input_schema).toEqual({
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
      },
      required: ["location"],
    });

    // tool_choice "auto" → {type: "auto"}
    expect(result.tool_choice).toEqual({ type: "auto" });

    // Messages: assistant with tool_use, then user with tool_result, then user text
    expect(result.messages.length).toBeGreaterThanOrEqual(3);

    // First user message from the original user turn
    const assistantMsg = result.messages.find((m) => m.role === "assistant");
    expect(assistantMsg).toBeDefined();
    expect(Array.isArray(assistantMsg!.content)).toBe(true);
    const toolUse = (assistantMsg!.content as any[]).find(
      (b: any) => b.type === "tool_use"
    );
    expect(toolUse).toBeDefined();
    expect(toolUse.name).toBe("get_weather");
    expect(toolUse.input).toEqual({ location: "Paris" });
  });

  it("defaults max_tokens to 8192", () => {
    const req: OpenAIRequest = {
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
    };
    const result = convertRequest(req, testConfig);
    expect(result.max_tokens).toBe(8192);
  });

  it("converts stop strings to stop_sequences", () => {
    const req: OpenAIRequest = {
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      stop: ["###", "END"],
    };
    const result = convertRequest(req, testConfig);
    expect(result.stop_sequences).toEqual(["###", "END"]);
  });

  it("converts a single stop string to array", () => {
    const req: OpenAIRequest = {
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      stop: "STOP",
    };
    const result = convertRequest(req, testConfig);
    expect(result.stop_sequences).toEqual(["STOP"]);
  });

  it("handles multiple system messages by concatenating", () => {
    const req: OpenAIRequest = {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "system", content: "Be concise." },
        { role: "user", content: "Hi" },
      ],
    };
    const result = convertRequest(req, testConfig);
    expect(result.system).toContain("You are Claude Code");
    expect(result.system).toContain("You are helpful.\n\nBe concise.");
  });

  it("merges consecutive same-role messages", () => {
    const req: OpenAIRequest = {
      model: "gpt-4",
      messages: [
        { role: "user", content: "Hello" },
        { role: "user", content: "How are you?" },
      ],
    };
    const result = convertRequest(req, testConfig);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
  });

  it("converts tool_choice 'required' to {type: 'any'}", () => {
    const req: OpenAIRequest = {
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools: [
        {
          type: "function",
          function: {
            name: "test_fn",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
      tool_choice: "required",
    };
    const result = convertRequest(req, testConfig);
    expect(result.tool_choice).toEqual({ type: "any" });
  });

  it("converts specific tool_choice to {type: 'tool', name: ...}", () => {
    const req: OpenAIRequest = {
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools: [
        {
          type: "function",
          function: {
            name: "my_tool",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "my_tool" } },
    };
    const result = convertRequest(req, testConfig);
    expect(result.tool_choice).toEqual({ type: "tool", name: "my_tool" });
  });
});

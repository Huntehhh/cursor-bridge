import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import type Anthropic from "@anthropic-ai/sdk";
import type {
  MessageCreateParamsNonStreaming,
  MessageCreateParamsBase,
} from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { AppState } from "../index.js";
import { convertRequest } from "../convert/request.js";
import type { OpenAIRequest } from "../convert/request.js";
import {
  convertStreamEvent,
  convertNonStreamingResponse,
  createConverterState,
} from "../convert/response.js";
import { readClaudeCredentials } from "../auto-setup.js";
import { createClient } from "../client.js";

/**
 * Attempt to refresh the OAuth token by re-reading credentials from disk.
 * Claude Code refreshes tokens automatically — we just re-read the file.
 * Returns true if a new client was installed into state.
 */
function tryRefreshClient(appState: AppState): boolean {
  const creds = readClaudeCredentials();
  if (!creds) return false;
  if (creds.expiresAt && creds.expiresAt < Date.now()) return false;

  try {
    appState.client = createClient(creds.accessToken);
    if (appState.config) {
      appState.config.anthropicKey = creds.accessToken;
    }
    return true;
  } catch {
    return false;
  }
}

function isAuthError(err: unknown): boolean {
  return !!(err && typeof err === "object" && "status" in err && (err as { status: number }).status === 401);
}

export function completionsRoute(appState: AppState) {
  const app = new Hono();

  app.post("/", async (c) => {
    const client = appState.client;
    const config = appState.config;
    if (!client || !config) {
      return c.json(
        {
          error: {
            message: "CursorBridge not configured yet. Visit http://localhost:" + appState.port + " to set up.",
            type: "invalid_request_error",
            code: "not_configured",
          },
        },
        503
      );
    }

    let body: OpenAIRequest;
    try {
      body = await c.req.json<OpenAIRequest>();
    } catch {
      return c.json(
        {
          error: {
            message: "Invalid JSON in request body",
            type: "invalid_request_error",
            code: "invalid_json",
          },
        },
        400
      );
    }

    const anthropicParams = convertRequest(body, config);
    const isStreaming = body.stream !== false;

    if (!isStreaming) {
      // Non-streaming: request/response with 401 auto-refresh
      try {
        const params = {
          ...anthropicParams,
          stream: false,
        } as unknown as MessageCreateParamsNonStreaming;
        const response = await appState.client!.messages.create(params);
        return c.json(convertNonStreamingResponse(response as Anthropic.Message));
      } catch (err) {
        // On 401, try refreshing token and retry once
        if (isAuthError(err) && tryRefreshClient(appState)) {
          try {
            const params = {
              ...anthropicParams,
              stream: false,
            } as unknown as MessageCreateParamsNonStreaming;
            const response = await appState.client!.messages.create(params);
            return c.json(convertNonStreamingResponse(response as Anthropic.Message));
          } catch (retryErr) {
            return handleAnthropicError(c, retryErr);
          }
        }
        return handleAnthropicError(c, err);
      }
    }

    // Streaming: convert Anthropic SSE → OpenAI SSE with abort handling
    return streamSSE(c, async (stream) => {
      try {
        const params = anthropicParams as unknown as MessageCreateParamsBase;
        const anthropicStream = appState.client!.messages.stream(params);

        // Abort upstream when Cursor disconnects
        stream.onAbort(() => {
          anthropicStream.abort();
        });

        const converterState = createConverterState();

        for await (const event of anthropicStream) {
          const chunk = convertStreamEvent(event, converterState);
          if (chunk) {
            await stream.writeSSE({
              data: JSON.stringify(chunk),
            });
          }
        }

        // Signal end of stream
        await stream.writeSSE({ data: "[DONE]" });
      } catch (err) {
        // On 401, try refreshing token and retry the stream
        if (isAuthError(err) && tryRefreshClient(appState)) {
          try {
            const params = anthropicParams as unknown as MessageCreateParamsBase;
            const retryStream = appState.client!.messages.stream(params);
            stream.onAbort(() => retryStream.abort());
            const converterState = createConverterState();

            for await (const event of retryStream) {
              const chunk = convertStreamEvent(event, converterState);
              if (chunk) {
                await stream.writeSSE({ data: JSON.stringify(chunk) });
              }
            }
            await stream.writeSSE({ data: "[DONE]" });
            return;
          } catch {
            // Retry also failed — fall through to error
          }
        }

        // Try to send error as SSE before closing
        const errChunk = formatStreamError(err);
        await stream.writeSSE({ data: JSON.stringify(errChunk) });
        await stream.writeSSE({ data: "[DONE]" });
      }
    });
  });

  return app;
}

function handleAnthropicError(c: Context, err: unknown) {

  if (err && typeof err === "object" && "status" in err) {
    const apiErr = err as { status: number; message?: string; error?: { message?: string } };
    const status = apiErr.status;
    const message =
      apiErr.error?.message ?? apiErr.message ?? "Anthropic API error";

    // Map common Anthropic errors to OpenAI format
    if (status === 429) {
      return c.json(
        {
          error: {
            message,
            type: "rate_limit_error",
            code: "rate_limit_exceeded",
          },
        },
        429
      );
    }
    if (status === 401) {
      return c.json(
        {
          error: {
            message: "Invalid Anthropic API key",
            type: "authentication_error",
            code: "invalid_api_key",
          },
        },
        401
      );
    }

    return c.json(
      {
        error: {
          message,
          type: "api_error",
          code: "anthropic_error",
        },
      },
      status as 400
    );
  }

  return c.json(
    {
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        type: "api_error",
        code: "internal_error",
      },
    },
    500
  );
}

function formatStreamError(err: unknown) {
  const message = err instanceof Error ? err.message : "Stream error";
  return {
    error: {
      message,
      type: "api_error",
      code: "stream_error",
    },
  };
}

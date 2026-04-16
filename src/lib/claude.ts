import Anthropic from "@anthropic-ai/sdk";

const MCP_BRIDGE_URL = `http://localhost:${process.env.MCP_BRIDGE_PORT ?? "3001"}`;
const MCP_TIMEOUT = Number(process.env.MCP_BRIDGE_TIMEOUT_MS ?? "2000");
const API_TIMEOUT = Number(process.env.ANTHROPIC_API_TIMEOUT_MS ?? "30000");

export type ClaudeMode = "LOCAL" | "CLOUD";

export interface UsageData {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export async function checkMcpBridge(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MCP_TIMEOUT);
    const res = await fetch(`${MCP_BRIDGE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function streamChat(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  onDone: (mode: ClaudeMode, usage?: UsageData) => void,
  onError: (error: Error) => void = () => {}
): Promise<void> {
  const mcpAvailable = await checkMcpBridge();

  if (mcpAvailable) {
    try {
      await streamViaMcp(systemPrompt, userMessage, onChunk);
      onDone("LOCAL");
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
    return;
  }

  try {
    const usage = await streamViaApi(systemPrompt, userMessage, onChunk);
    onDone("CLOUD", usage);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function streamViaMcp(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch(`${MCP_BRIDGE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userMessage }),
  });

  if (!res.body) throw new Error("No response body from MCP bridge");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // SSE lines: "data: <text>\n\n"
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        const text = line.slice(6);
        if (text !== "[DONE]") onChunk(text);
      }
    }
  }
}

async function streamViaApi(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void
): Promise<UsageData> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not configured. Set env var to enable CLOUD mode."
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8096,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    // Iterate through stream events
    let usage: UsageData = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        onChunk(event.delta.text);
      }
    }

    // Get final message with usage data
    const finalMessage = await stream.finalMessage();
    if (finalMessage.usage) {
      usage = {
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
        cache_creation_input_tokens:
          finalMessage.usage.cache_creation_input_tokens || 0,
        cache_read_input_tokens: finalMessage.usage.cache_read_input_tokens || 0,
      };
    }

    return usage;
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `API request timeout after ${API_TIMEOUT}ms. Check ANTHROPIC_API_TIMEOUT_MS if needed.`
      );
    }

    // Handle other known error types
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new Error("Invalid ANTHROPIC_API_KEY. Check your credentials.");
      } else if (error.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait before retrying the request."
        );
      } else if (error.status === 403) {
        throw new Error(
          "Access forbidden. Check your API key permissions."
        );
      }
    }

    // Re-throw with better message
    throw error instanceof Error
      ? error
      : new Error(`API error: ${String(error)}`);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

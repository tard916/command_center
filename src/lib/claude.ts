import Anthropic from "@anthropic-ai/sdk";

const MCP_BRIDGE_URL = `http://localhost:${process.env.MCP_BRIDGE_PORT ?? "3001"}`;
const MCP_TIMEOUT = Number(process.env.MCP_BRIDGE_TIMEOUT_MS ?? "2000");

export type ClaudeMode = "LOCAL" | "CLOUD";

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
  onDone: (mode: ClaudeMode) => void
): Promise<void> {
  const mcpAvailable = await checkMcpBridge();

  if (mcpAvailable) {
    await streamViaMcp(systemPrompt, userMessage, onChunk);
    onDone("LOCAL");
    return;
  }

  await streamViaApi(systemPrompt, userMessage, onChunk);
  onDone("CLOUD");
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
): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
    }
  }
}

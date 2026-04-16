/**
 * MCP Bridge Server
 * Proxies requests from the Next.js app to Claude Desktop via MCP.
 *
 * This server:
 * 1. Connects to Claude Desktop running on the local machine via MCP protocol
 * 2. Exposes GET /health to check Claude availability
 * 3. Exposes POST /chat to stream chat responses via SSE
 * 4. Returns 503 if Claude is unavailable so the app gracefully falls back to CLOUD
 *
 * Environment variables:
 * - MCP_BRIDGE_PORT: Port to listen on (default: 3001)
 * - MCP_BRIDGE_TIMEOUT_MS: Health check timeout in ms (default: 2000)
 */

const http = require("http");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StdioClientTransport,
} = require("@modelcontextprotocol/sdk/client/stdio.js");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.MCP_BRIDGE_PORT ?? "3001", 10);
const HEALTH_CHECK_TIMEOUT_MS = parseInt(
  process.env.MCP_BRIDGE_TIMEOUT_MS ?? "2000",
  10
);

// MCP client and Claude availability state
let mcpClient = null;
let claudeAvailable = false;
let lastHealthCheck = 0;

/**
 * Initialize MCP client connection to Claude Desktop
 * Uses stdio transport to spawn Claude Desktop as a subprocess
 */
async function initializeMcpClient() {
  try {
    // Spawn Claude Desktop as a subprocess with MCP support
    // Note: This assumes Claude Desktop is installed and available in PATH
    // For development, Claude Desktop must be running and accessible
    const childProcess = spawn("claude-desktop", [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const transport = new StdioClientTransport({
      command: "claude-desktop",
      args: [],
      stdin: childProcess.stdin,
      stdout: childProcess.stdout,
      stderr: childProcess.stderr,
    });

    mcpClient = new Client({
      name: "command-center",
      version: "1.0.0",
    });

    await mcpClient.connect(transport);
    claudeAvailable = true;
    console.log("[MCP Bridge] Connected to Claude Desktop via MCP");
  } catch (error) {
    claudeAvailable = false;
    console.error("[MCP Bridge] Failed to connect to Claude Desktop:", error);
  }
}

/**
 * Check if Claude Desktop is available via MCP
 * Performs a lightweight health check
 */
async function checkClaudeHealth() {
  if (!mcpClient) return false;

  try {
    // Try to call a simple method to verify the connection is alive
    // If this succeeds, Claude is responsive
    const timeout = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Health check timeout")),
        HEALTH_CHECK_TIMEOUT_MS
      )
    );

    await Promise.race([
      mcpClient.ping ? mcpClient.ping() : Promise.resolve(),
      timeout,
    ]);
    return true;
  } catch (error) {
    console.error("[MCP Bridge] Health check failed:", error);
    return false;
  }
}

/**
 * Periodic health check: verify Claude is still connected
 */
async function periodicHealthCheck() {
  const now = Date.now();
  if (now - lastHealthCheck < 5000) return; // Check at most every 5 seconds

  lastHealthCheck = now;
  const isHealthy = await checkClaudeHealth();
  claudeAvailable = isHealthy;

  if (!claudeAvailable) {
    console.warn(
      "[MCP Bridge] Claude Desktop became unavailable, will retry on next request"
    );
  }
}

/**
 * Stream a chat response from Claude Desktop via MCP
 * Formats response as SSE (Server-Sent Events)
 */
async function streamChatResponse(res, systemPrompt, userMessage) {
  if (!mcpClient) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "MCP client not initialized" }));
    return;
  }

  try {
    // Set SSE headers for streaming
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Call Claude via MCP's completion/messages resource
    // This would be the actual MCP protocol call to Claude Desktop
    // For MVP, this is a placeholder that shows the expected structure

    try {
      // In a real implementation, this would call Claude's MCP interface
      // For now, we'll send a simple test message in SSE format
      const testMessage =
        "MCP bridge connected and ready to stream from Claude Desktop.";

      // Write test message in SSE format
      for (const chunk of testMessage.split(" ")) {
        res.write(`data: ${chunk} \n\n`);
        await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate streaming delay
      }

      // Send completion marker
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      res.write(`data: [ERROR: ${String(error)}]\n\n`);
      res.end();
    }
  } catch (error) {
    console.error("[MCP Bridge] Error streaming chat:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to stream response" }));
  }
}

/**
 * Parse JSON request body
 */
function parseRequestBody(req, callback) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    try {
      const data = JSON.parse(body);
      callback(data);
    } catch {
      callback(null);
    }
  });
}

/**
 * HTTP request handler
 */
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /health — returns current status
  if (req.method === "GET" && req.url === "/health") {
    periodicHealthCheck(); // Fire health check in background

    res.writeHead(claudeAvailable ? 200 : 503, {
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        status: claudeAvailable ? "ok" : "unavailable",
        mode: claudeAvailable ? "LOCAL" : "CLOUD",
      })
    );
    return;
  }

  // POST /chat — stream a chat response
  if (req.method === "POST" && req.url === "/chat") {
    if (!claudeAvailable) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Claude Desktop not available",
          fallback: "CLOUD",
        })
      );
      return;
    }

    parseRequestBody(req, (data) => {
      if (!data) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request body" }));
        return;
      }

      const { systemPrompt, userMessage, threadId } = data;

      if (!systemPrompt || !userMessage) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Missing systemPrompt or userMessage",
          })
        );
        return;
      }

      // Stream the response from Claude
      streamChatResponse(res, systemPrompt, userMessage);
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404);
  res.end();
});

/**
 * Start the server
 */
async function start() {
  // Initialize MCP client connection on startup
  await initializeMcpClient();

  // Start periodic health checks
  setInterval(periodicHealthCheck, 10000);

  server.listen(PORT, () => {
    console.log(`[MCP Bridge] Listening on http://localhost:${PORT}`);
    console.log(
      `[MCP Bridge] Claude Desktop: ${claudeAvailable ? "✓ Connected" : "✗ Not detected"}`
    );
    if (!claudeAvailable) {
      console.log(
        "[MCP Bridge] → Next.js app will use CLOUD mode (Anthropic API)"
      );
    }
  });
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("[MCP Bridge] Shutting down...");
  server.close(() => {
    process.exit(0);
  });
});

// Start the server
start().catch((error) => {
  console.error("[MCP Bridge] Fatal error:", error);
  process.exit(1);
});

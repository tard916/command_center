/**
 * MCP Bridge Server
 * Proxies requests from the Next.js app to Claude Desktop via MCP.
 * When Claude Desktop is not running, this server stays up but returns 503
 * so the app gracefully falls back to the Anthropic API.
 */

const http = require("http");

const PORT = process.env.MCP_BRIDGE_PORT ?? 3001;

// Attempt to connect to Claude Desktop MCP socket
let claudeAvailable = false;

async function checkClaude() {
  try {
    // Claude Desktop exposes an MCP endpoint on a local socket.
    // For now this is a placeholder — full MCP SDK integration
    // will be wired up in CC-24 (MCP server story).
    // The bridge still starts so the health endpoint responds correctly.
    claudeAvailable = false;
  } catch {
    claudeAvailable = false;
  }
}

checkClaude();
setInterval(checkClaude, 10000);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(claudeAvailable ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: claudeAvailable ? "ok" : "claude_unavailable" }));
    return;
  }

  if (req.method === "POST" && req.url === "/chat") {
    if (!claudeAvailable) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Claude Desktop not available" }));
      return;
    }

    // Full MCP streaming implementation — to be completed in CC-24
    res.writeHead(501, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "MCP streaming not yet implemented — use CLOUD mode" }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[MCP Bridge] Listening on port ${PORT}`);
  console.log(`[MCP Bridge] Claude Desktop: ${claudeAvailable ? "connected" : "not detected (app will use CLOUD mode)"}`);
});

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});

// Store active transports to support multiple clients
const activeTransports: Map<string, SSEServerTransport> = new Map();

const app = express();
app.use(express.json());

app.get("/sse", async (req, res) => {
  // Generate a unique client ID (could use UUIDs for real apps)
  const clientId = `${Date.now()}-${Math.random()}`;

  // Create an SSE transport
  const transport = new SSEServerTransport("/messages", res);
  
  // Store transport in map
  activeTransports.set(clientId, transport);

  // Connect MCP server to this transport
  await server.connect(transport);

  // Remove transport when connection closes
  req.on("close", () => {
    activeTransports.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

app.post("/messages", async (req, res) => {
  try {
    const { clientId, message } = req.body;

    if (!clientId || !message) {
      res.status(400).json({ error: "clientId and message are required" });
      return;
    }

    const transport = activeTransports.get(clientId);

    if (!transport) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    // Handle incoming message via transport
    await transport.handlePostMessage(req, res);

    res.json({ status: "Message sent" });
  } catch (error) {
    console.error("Error handling message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default app;

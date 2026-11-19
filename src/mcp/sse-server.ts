import http from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMyFinMcpServer } from "./app.js";

const PORT = Number(process.env.MCP_PORT) || 3001;
const transports: Record<string, SSEServerTransport> = {};

function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, Authorization, x-requested-with, mcp-session-id"
  );
  res.setHeader("Access-Control-Expose-Headers", "*");
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  // Manejo de preflight CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const host = req.headers.host || `127.0.0.1:${PORT}`;
  const url = new URL(req.url || "/", `http://${host}`);

  // 1. Endpoint SSE para conexión de eventos
  if (url.pathname === "/sse" && req.method === "GET") {
    console.log("📡 [SSE] Iniciando conexión SSE desde cliente...");

    // Se inicializa el transporte con el endpoint de mensajes
    const transport = new SSEServerTransport("/message", res);
    transports[transport.sessionId] = transport;

    const mcpServer = createMyFinMcpServer();
    await mcpServer.connect(transport);

    // IMPORTANTE: Escuchamos el cierre en el transport (no en req), cuando el stream SSE realmente termina
    transport.onclose = () => {
      console.log(`🔌 [SSE] Sesión cerrada: ${transport.sessionId}`);
      delete transports[transport.sessionId];
    };

    console.log(`✅ [SSE] Conexión establecida con sessionId: ${transport.sessionId}`);
    return;
  }

  // 2. Endpoint POST para recibir llamadas a herramientas y mensajes
  if (url.pathname === "/message" && req.method === "POST") {
    const sessionId = url.searchParams.get("sessionId");
    console.log(`📩 [POST] Mensaje recibido para sessionId: ${sessionId}`);

    if (!sessionId || !transports[sessionId]) {
      console.warn(`⚠️ [POST] Sesión no encontrada: ${sessionId}`);
      setCorsHeaders(req, res);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Sesión SSE no encontrada o expirada" }));
      return;
    }

    const transport = transports[sessionId];
    try {
      await transport.handlePostMessage(req, res);
      console.log(`✅ [POST] Mensaje procesado correctamente`);
    } catch (err) {
      console.error(`❌ [POST] Error al procesar mensaje:`, err);
      if (!res.headersSent) {
        setCorsHeaders(req, res);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    }
    return;
  }

  // 3. Health check
  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          status: "online",
          service: "MyFin MCP SSE Server",
          version: "1.0.0",
          activeSessions: Object.keys(transports).length,
          endpoints: {
            sse: `http://${host}/sse`,
            message: `http://${host}/message`,
          },
        },
        null,
        2
      )
    );
    return;
  }

  setCorsHeaders(req, res);
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Ruta no encontrada");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("===============================================================");
  console.log(`🚀 MyFin MCP Server corriendo en modo HTTP/SSE`);
  console.log(`📍 URL para agregar en llama-server UI: http://127.0.0.1:${PORT}/sse`);
  console.log("===============================================================\n");
});

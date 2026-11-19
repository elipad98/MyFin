import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMyFinMcpServer } from "./app.js";

async function main() {
  const server = createMyFinMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MyFin MCP Server iniciado correctamente vía stdio.");
}

main().catch((err) => {
  console.error("Error al inicializar MyFin MCP Server:", err);
  process.exit(1);
});

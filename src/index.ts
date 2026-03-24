// SkillHub — Claude Skill Marketplace POC
// Entry point: starts the Hono server with REST API + MCP endpoints

import app from "./api-server.js";

const PORT = parseInt(process.env.PORT || "3456");

console.log(`
╔═══════════════════════════════════════════════╗
║          SkillHub Marketplace POC              ║
║                                                ║
║  REST API:   http://localhost:${PORT}             ║
║  MCP SSE:    http://localhost:${PORT}/mcp/sse     ║
║  Health:     http://localhost:${PORT}/health      ║
╚═══════════════════════════════════════════════╝
`);

export default {
  port: PORT,
  fetch: app.fetch,
};

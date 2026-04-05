// SkillHub — Claude Skill Marketplace POC
// Entry point: starts the Hono server with REST API + MCP endpoints

import app from "./api-server.js";

const PORT = parseInt(process.env.PORT || "3456");

console.log(`
╔═══════════════════════════════════════════════╗
║          SkillHub Marketplace POC              ║
║                                                ║
║  REST API:   http://localhost:${PORT}             ║
║  MCP HTTP:   http://localhost:${PORT}/mcp          ║
║  Health:     http://localhost:${PORT}/health      ║
╚═══════════════════════════════════════════════╝
`);

export default {
  port: PORT,
  fetch: app.fetch,
};

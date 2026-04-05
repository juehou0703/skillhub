// Stdio MCP bridge — spawned by Claude Code via "command" transport.
// Connects to the running SkillHub HTTP server and exposes skills as MCP tools over stdio.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.SKILLHUB_URL || "http://localhost:3456";
const API_KEY = process.env.SKILLHUB_API_KEY || "sk_test_skillhub_user_001";

interface SkillInfo {
  id: string;
  slug: string;
  display_name: string;
  description: string;
  category: string;
  model: string;
  price_per_use: number;
  input_schema: any;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

function buildZodProps(schema: any) {
  if (!schema?.properties) return {};
  const required = new Set<string>(schema.required || []);
  return Object.fromEntries(
    Object.entries(schema.properties).map(([key, val]: [string, any]) => {
      const desc = val.description || key;
      let zodType: z.ZodTypeAny =
        val.type === "string" ? z.string().describe(desc)
          : val.type === "number" ? z.number().describe(desc)
            : val.type === "array" ? z.array(z.string()).describe(desc)
              : z.any().describe(desc);
      if (!required.has(key)) zodType = zodType.optional();
      return [key, zodType];
    })
  );
}

async function main() {
  const server = new McpServer({
    name: "skillhub-marketplace",
    version: "0.1.0",
  });

  // Fetch user's skills from the REST API and register each as an MCP tool
  const { skills } = (await apiFetch("/api/user/skills")) as { skills: SkillInfo[] };

  for (const skill of skills) {
    const schema = skill.input_schema || { type: "object", properties: {} };
    server.tool(
      skill.slug,
      skill.description,
      buildZodProps(schema),
      async (args: Record<string, unknown>) => {
        try {
          const result = await apiFetch(`/api/skills/${skill.slug}/invoke`, {
            method: "POST",
            body: JSON.stringify({ input: args }),
          });
          return { content: [{ type: "text" as const, text: result.result }] };
        } catch (err: any) {
          return {
            content: [{ type: "text" as const, text: `Error: ${err.message}` }],
            isError: true,
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP stdio bridge failed:", err);
  process.exit(1);
});

// REST API + MCP endpoint — single Hono server
// Serves both the REST API and the MCP SSE transport

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import sql from "./db.js";
import {
  authenticateApiKey,
  createUser,
  extractApiKey,
  hashApiKey,
} from "./auth.js";
import { invokeSkill, getAllPublishedSkills, getUserSkills } from "./mcp-server.js";
import { storeSkillFile } from "./skill-store.js";
import { skillCache } from "./skill-cache.js";
import { dbHealthCheck } from "./db.js";
import Ajv from "ajv";

const ajv = new Ajv();

const app = new Hono();

// CORS for frontend
app.use("/*", cors());

// Health check
app.get("/health", async (c) => {
  const dbOk = await dbHealthCheck();
  return c.json({ status: dbOk ? "ok" : "degraded", db: dbOk });
});

// ============ AUTH ROUTES ============

app.post("/api/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return c.json({ error: "Valid email is required" }, 400);
    }

    const { user, apiKey } = await createUser(email);
    return c.json({
      user: { id: user.id, email: user.email, balance_cents: user.balance_cents },
      api_key: apiKey,
      message:
        "Save your API key — it won't be shown again. Add it to your Claude settings as a Bearer token.",
    }, 201);
  } catch (err: any) {
    if (err.message?.includes("duplicate key")) {
      return c.json({ error: "Email already registered" }, 409);
    }
    console.error("Signup error:", err);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// ============ SKILL BROWSING ============

app.get("/api/skills/browse", async (c) => {
  try {
    const skills = await getAllPublishedSkills();
    return c.json({
      skills: skills.map((s) => ({
        id: s.id,
        slug: s.slug,
        display_name: s.display_name,
        description: s.description,
        category: s.category,
        model: s.model,
        price_per_use: s.price_per_use,
        input_schema: typeof s.input_schema === "string" ? JSON.parse(s.input_schema) : s.input_schema,
      })),
    });
  } catch (err: any) {
    console.error("Browse error:", err);
    return c.json({ error: "Failed to load skills" }, 500);
  }
});

// ============ CREATOR ROUTES ============

// Helper: authenticate creator from API key
async function authenticateCreator(c: any): Promise<{ id: string; email: string } | null> {
  const apiKey = extractApiKey(c.req.header("Authorization"));
  if (!apiKey) return null;

  // Look up creator by API key (creators use the same auth system)
  const user = await authenticateApiKey(apiKey);
  if (!user) return null;

  // Check if user has a creator record
  const creators = await sql<{ id: string; email: string }[]>`
    SELECT id, email FROM creators WHERE email = ${user.email}
  `;
  return creators.length > 0 ? creators[0] : null;
}

app.post("/api/skills", async (c) => {
  try {
    const body = await c.req.json();
    const { slug, display_name, description, category, input_schema, model, price_per_use, skill_content, creator_id } = body;

    // Validate required fields
    if (!slug || !display_name || !description || !input_schema || !skill_content) {
      return c.json({ error: "Missing required fields: slug, display_name, description, input_schema, skill_content" }, 400);
    }

    // Validate slug format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length > 100) {
      return c.json({ error: "Slug must be lowercase alphanumeric with hyphens, 2-100 chars" }, 400);
    }

    // Validate input_schema is valid JSON Schema
    try {
      ajv.compile(input_schema);
    } catch {
      return c.json({ error: "Invalid input_schema — must be a valid JSON Schema" }, 400);
    }

    // Try to authenticate as creator, fall back to default for MVP
    const creator = await authenticateCreator(c);
    const creatorId = creator?.id || creator_id || "00000000-0000-0000-0000-000000000001";

    // Store the skill file
    const tempId = crypto.randomUUID();
    const s3Key = await storeSkillFile(tempId, 1, skill_content);

    // Insert into DB
    const rows = await sql<{ id: string }[]>`
      INSERT INTO skills (creator_id, slug, display_name, description, category, input_schema, model, price_per_use, s3_key, status)
      VALUES (
        ${creatorId}, ${slug}, ${display_name}, ${description},
        ${category || null}, ${sql.json(input_schema)}::jsonb,
        ${model || "claude-sonnet-4-6"}, ${price_per_use || 0},
        ${s3Key}, 'published'
      )
      RETURNING id
    `;

    // Update s3_key with real skill ID
    const skillId = rows[0].id;
    const realKey = await storeSkillFile(skillId, 1, skill_content);
    await sql`UPDATE skills SET s3_key = ${realKey} WHERE id = ${skillId}`;

    // Grant access to the test user (MVP: auto-grant to all existing users)
    await sql`
      INSERT INTO user_skills (user_id, skill_id)
      SELECT id, ${skillId} FROM users
      ON CONFLICT DO NOTHING
    `;

    // Notify active MCP sessions about the new tool
    refreshSessionTools().catch((err) => console.error("Tool refresh error:", err));

    return c.json({ id: skillId, slug, status: "published", s3_key: realKey }, 201);
  } catch (err: any) {
    if (err.message?.includes("duplicate key") && err.message?.includes("slug")) {
      return c.json({ error: `Skill with slug "${(await c.req.json()).slug}" already exists` }, 409);
    }
    console.error("Failed to create skill:", err);
    return c.json({ error: "Failed to create skill" }, 500);
  }
});

app.put("/api/skills/:id", async (c) => {
  try {
    const skillId = c.req.param("id");
    const body = await c.req.json();
    const { display_name, description, category, input_schema, model, price_per_use, skill_content } = body;

    // Check skill exists
    const existing = await sql<{ id: string; version: number; s3_key: string }[]>`
      SELECT id, version, s3_key FROM skills WHERE id = ${skillId}
    `;
    if (existing.length === 0) return c.json({ error: "Skill not found" }, 404);

    if (skill_content) {
      const newVersion = existing[0].version + 1;
      const s3Key = await storeSkillFile(skillId, newVersion, skill_content);
      // Invalidate old cached version
      skillCache.invalidate(existing[0].s3_key);
      await sql`UPDATE skills SET s3_key = ${s3Key}, version = ${newVersion}, updated_at = now() WHERE id = ${skillId}`;
    }

    if (display_name || description || category || input_schema || model || price_per_use !== undefined) {
      await sql`
        UPDATE skills SET
          display_name = COALESCE(${display_name || null}, display_name),
          description = COALESCE(${description || null}, description),
          category = COALESCE(${category || null}, category),
          input_schema = COALESCE(${input_schema ? JSON.stringify(input_schema) : null}::jsonb, input_schema),
          model = COALESCE(${model || null}, model),
          price_per_use = COALESCE(${price_per_use ?? null}, price_per_use),
          updated_at = now()
        WHERE id = ${skillId}
      `;
    }

    // Notify active MCP sessions about the updated tool
    refreshSessionTools().catch((err) => console.error("Tool refresh error:", err));

    return c.json({ status: "updated" });
  } catch (err: any) {
    console.error("Update skill error:", err);
    return c.json({ error: "Failed to update skill" }, 500);
  }
});

app.get("/api/skills/:id/analytics", async (c) => {
  try {
    const skillId = c.req.param("id");
    const rows = await sql`
      SELECT
        COUNT(*)::int as total_invocations,
        COUNT(*) FILTER (WHERE status = 'complete')::int as successful,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COALESCE(SUM(input_tokens) FILTER (WHERE status = 'complete'), 0)::int as total_input_tokens,
        COALESCE(SUM(output_tokens) FILTER (WHERE status = 'complete'), 0)::int as total_output_tokens,
        COALESCE(SUM(skill_cost) FILTER (WHERE status = 'complete'), 0)::int as total_revenue_cents
      FROM usage_events
      WHERE skill_id = ${skillId}
    `;
    return c.json(rows[0]);
  } catch (err: any) {
    console.error("Analytics error:", err);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

// ============ USER ROUTES ============

app.get("/api/usage", async (c) => {
  const apiKey = extractApiKey(c.req.header("Authorization"));
  if (!apiKey) return c.json({ error: "Missing Authorization header" }, 401);

  try {
    const user = await authenticateApiKey(apiKey);
    if (!user) return c.json({ error: "Invalid API key" }, 401);

    const rows = await sql`
      SELECT ue.id, ue.skill_id, s.slug as skill_slug, s.display_name as skill_name,
             ue.status, ue.input_tokens, ue.output_tokens, ue.skill_cost,
             ue.request_input, ue.response_output, ue.created_at
      FROM usage_events ue
      JOIN skills s ON s.id = ue.skill_id
      WHERE ue.user_id = ${user.id}
      ORDER BY ue.created_at DESC
      LIMIT 100
    `;
    return c.json({ usage: rows, balance_cents: user.balance_cents });
  } catch (err: any) {
    console.error("Usage error:", err);
    return c.json({ error: "Failed to fetch usage" }, 500);
  }
});

app.get("/api/user/skills", async (c) => {
  const apiKey = extractApiKey(c.req.header("Authorization"));
  if (!apiKey) return c.json({ error: "Missing Authorization header" }, 401);

  try {
    const user = await authenticateApiKey(apiKey);
    if (!user) return c.json({ error: "Invalid API key" }, 401);

    const skills = await getUserSkills(user.id);
    return c.json({
      skills: skills.map((s) => ({
        id: s.id,
        slug: s.slug,
        display_name: s.display_name,
        description: s.description,
        category: s.category,
        model: s.model,
        price_per_use: s.price_per_use,
      })),
    });
  } catch (err: any) {
    console.error("User skills error:", err);
    return c.json({ error: "Failed to fetch user skills" }, 500);
  }
});

// ============ SKILL INVOCATION (REST — alternative to MCP) ============

app.post("/api/skills/:slug/invoke", async (c) => {
  const apiKey = extractApiKey(c.req.header("Authorization"));
  if (!apiKey) return c.json({ error: "Missing Authorization header" }, 401);

  try {
    const user = await authenticateApiKey(apiKey);
    if (!user) return c.json({ error: "Invalid API key" }, 401);

    const slug = c.req.param("slug");
    const body = await c.req.json();
    const { input, idempotency_key } = body;

    if (!input || typeof input !== "object") {
      return c.json({ error: "Input must be a JSON object" }, 400);
    }

    const result = await invokeSkill(user.id, slug, input, idempotency_key);
    return c.json({
      result: result.content,
      usage_event_id: result.usageEventId,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      skill_cost: result.skillCost,
    });
  } catch (err: any) {
    const status = err.message?.includes("not found") ? 404
      : err.message?.includes("access") ? 403
        : err.message?.includes("Insufficient balance") ? 402
          : err.message?.includes("Invalid input") ? 422
            : err.message?.includes("Rate limit") ? 429
              : err.message?.includes("Circuit breaker") ? 503
                : 500;
    return c.json({ error: err.message }, status);
  }
});

// ============ OAUTH METADATA (required by MCP clients for auth discovery) ============

app.get("/.well-known/oauth-authorization-server", (c) => {
  const base = new URL(c.req.url).origin;
  return c.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    scopes_supported: ["mcp"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

// ============ MCP STREAMABLE HTTP ENDPOINT ============

// Store active sessions with tool handles for live updates
type RegisteredTool = ReturnType<McpServer["tool"]>;
interface McpSession {
  transport: WebStandardStreamableHTTPServerTransport;
  server: McpServer;
  userId: string;
  tools: Map<string, RegisteredTool>; // slug → handle
}
const sessions = new Map<string, McpSession>();

// Helper: build Zod schema props from a skill's JSON Schema
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

// Helper: register a single skill as an MCP tool, returns the handle
function registerSkillTool(mcpServer: McpServer, userId: string, skill: any): RegisteredTool {
  const schema = skill.input_schema || { type: "object", properties: {} };
  return mcpServer.tool(
    skill.slug,
    skill.description,
    buildZodProps(schema),
    async (args: Record<string, unknown>) => {
      try {
        const result = await invokeSkill(userId, skill.slug, args as Record<string, any>);
        return { content: [{ type: "text" as const, text: result.content }] };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );
}

// Create an MCP server with user's skills registered as tools
async function createUserMcpServer(userId: string): Promise<{ server: McpServer; tools: Map<string, RegisteredTool> }> {
  const mcpServer = new McpServer({
    name: "skillhub-marketplace",
    version: "0.1.0",
  });

  const skills = await getUserSkills(userId);
  const tools = new Map<string, RegisteredTool>();
  for (const skill of skills) {
    tools.set(skill.slug, registerSkillTool(mcpServer, userId, skill));
  }

  return { server: mcpServer, tools };
}

// Refresh tools for active sessions — adds new skills, updates changed ones, removes deleted ones
// Each mutation triggers a tools/list_changed notification to the client via the SDK
async function refreshSessionTools(userId?: string) {
  for (const [, session] of sessions) {
    if (userId && session.userId !== userId) continue;

    try {
      const skills = await getUserSkills(session.userId);
      const freshSlugs = new Set(skills.map((s) => s.slug));

      // Remove tools for deleted skills
      for (const [slug, handle] of session.tools) {
        if (!freshSlugs.has(slug)) {
          handle.remove();
          session.tools.delete(slug);
        }
      }

      // Add new skills / update existing ones
      for (const skill of skills) {
        const existing = session.tools.get(skill.slug);
        if (existing) {
          // Update description and schema in-place
          existing.update({
            description: skill.description,
            paramsSchema: buildZodProps(skill.input_schema || { type: "object", properties: {} }),
          });
        } else {
          // New skill — register it
          session.tools.set(
            skill.slug,
            registerSkillTool(session.server, session.userId, skill)
          );
        }
      }
    } catch (err) {
      console.error("Failed to refresh session tools:", err);
    }
  }
}

app.all("/mcp", async (c) => {
  const apiKey = extractApiKey(c.req.header("Authorization"));
  if (!apiKey) return c.json({ error: "Missing Authorization header" }, 401);

  const user = await authenticateApiKey(apiKey);
  if (!user) return c.json({ error: "Invalid API key" }, 401);

  // Check for existing session
  const sessionId = c.req.header("mcp-session-id");
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      return session.transport.handleRequest(c.req.raw);
    }
    // Session not found (server restarted or expired) — return 404 per spec.
    // Clients MUST start a new session when they receive this.
    return c.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Session expired. Please reconnect." }, id: null },
      404
    );
  }

  // New session: create transport + MCP server
  const { server: mcpServer, tools } = await createUserMcpServer(user.id);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (sid) => {
      sessions.set(sid, { transport, server: mcpServer, userId: user.id, tools });
    },
    onsessionclosed: (sid) => {
      sessions.delete(sid);
    },
  });

  await mcpServer.connect(transport);

  transport.onclose = () => {
    if (transport.sessionId) sessions.delete(transport.sessionId);
  };

  return transport.handleRequest(c.req.raw);
});

// Return JSON for all unmatched routes so OAuth error responses are parseable
app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
export { app };

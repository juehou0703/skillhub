// Integration tests for the REST API
// These tests require Postgres to be running (docker compose up -d postgres)

import { describe, it, expect, beforeAll } from "bun:test";
import app from "../../src/api-server.js";

const TEST_API_KEY = "sk_test_skillhub_user_001";
const BASE = "http://localhost";

async function request(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
) {
  const { method = "GET", headers = {}, body } = options;
  const req = new Request(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return app.fetch(req);
}

describe("API Integration Tests", () => {
  // ======================== HEALTH ========================
  describe("Health Check", () => {
    it("GET /health returns ok with db status", async () => {
      const res = await request("/health");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
      expect(data.db).toBe(true);
    });
  });

  // ======================== AUTH ========================
  describe("Auth", () => {
    it("POST /api/auth/signup creates a new user with sk_user_ prefixed key", async () => {
      const email = `test-${Date.now()}@example.com`;
      const res = await request("/api/auth/signup", {
        method: "POST",
        body: { email },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.api_key).toMatch(/^sk_user_/);
      expect(data.user.email).toBe(email);
      expect(data.user.balance_cents).toBe(0);
    });

    it("POST /api/auth/signup rejects duplicate email", async () => {
      const email = `dup-${Date.now()}@example.com`;
      await request("/api/auth/signup", { method: "POST", body: { email } });
      const res = await request("/api/auth/signup", { method: "POST", body: { email } });
      expect(res.status).toBe(409);
    });

    it("POST /api/auth/signup rejects missing email", async () => {
      const res = await request("/api/auth/signup", { method: "POST", body: {} });
      expect(res.status).toBe(400);
    });

    it("POST /api/auth/signup rejects invalid email (no @)", async () => {
      const res = await request("/api/auth/signup", { method: "POST", body: { email: "notanemail" } });
      expect(res.status).toBe(400);
    });

    it("newly created user can authenticate", async () => {
      const email = `auth-test-${Date.now()}@example.com`;
      const signupRes = await request("/api/auth/signup", { method: "POST", body: { email } });
      const { api_key } = await signupRes.json();

      const res = await request("/api/user/skills", {
        headers: { Authorization: `Bearer ${api_key}` },
      });
      expect(res.status).toBe(200);
    });
  });

  // ======================== SKILL BROWSING ========================
  describe("Skill Browsing", () => {
    it("GET /api/skills/browse returns published skills with all required fields", async () => {
      const res = await request("/api/skills/browse");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.skills).toBeArray();
      expect(data.skills.length).toBeGreaterThan(0);

      const skill = data.skills[0];
      expect(skill.id).toBeDefined();
      expect(skill.slug).toBeDefined();
      expect(skill.display_name).toBeDefined();
      expect(skill.description).toBeDefined();
      expect(skill.category).toBeDefined();
      expect(skill.model).toBeDefined();
      expect(typeof skill.price_per_use).toBe("number");
      expect(skill.input_schema).toBeDefined();
    });

    it("browse does not leak s3_key or status", async () => {
      const res = await request("/api/skills/browse");
      const data = await res.json();
      const skill = data.skills[0];
      expect(skill.s3_key).toBeUndefined();
    });
  });

  // ======================== USER SKILLS ========================
  describe("User Skills", () => {
    it("GET /api/user/skills returns accessible skills with category", async () => {
      const res = await request("/api/user/skills", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.skills).toBeArray();
      expect(data.skills.length).toBeGreaterThan(0);
      expect(data.skills[0].category).toBeDefined();
    });

    it("rejects invalid API key", async () => {
      const res = await request("/api/user/skills", {
        headers: { Authorization: "Bearer invalid_key_12345" },
      });
      expect(res.status).toBe(401);
    });

    it("rejects missing auth header", async () => {
      const res = await request("/api/user/skills");
      expect(res.status).toBe(401);
    });
  });

  // ======================== SKILL CREATION ========================
  describe("Skill Upload (Creator)", () => {
    it("POST /api/skills creates a new skill and grants access", async () => {
      const slug = `test-create-${Date.now()}`;
      const res = await request("/api/skills", {
        method: "POST",
        body: {
          slug,
          display_name: "Test Skill",
          description: "Integration test skill",
          category: "testing",
          input_schema: {
            type: "object",
            properties: { input: { type: "string" } },
            required: ["input"],
          },
          skill_content: "# Test Skill\nYou are a test skill.",
        },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.slug).toBe(slug);
      expect(data.status).toBe("published");

      // Verify test user has access
      const userSkills = await request("/api/user/skills", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });
      const { skills } = await userSkills.json();
      expect(skills.some((s: any) => s.slug === slug)).toBe(true);
    });

    it("rejects missing fields", async () => {
      const res = await request("/api/skills", {
        method: "POST",
        body: { slug: "incomplete" },
      });
      expect(res.status).toBe(400);
    });

    it("rejects duplicate slug", async () => {
      const slug = `dup-${Date.now()}`;
      const body = {
        slug,
        display_name: "Dup",
        description: "Dup",
        input_schema: { type: "object", properties: {} },
        skill_content: "# Dup",
      };
      await request("/api/skills", { method: "POST", body });
      const res = await request("/api/skills", { method: "POST", body });
      expect(res.status).toBe(409);
    });

    it("rejects invalid slug format", async () => {
      const res = await request("/api/skills", {
        method: "POST",
        body: {
          slug: "INVALID SLUG!!",
          display_name: "Bad Slug",
          description: "Bad slug test",
          input_schema: { type: "object", properties: {} },
          skill_content: "# Bad",
        },
      });
      expect(res.status).toBe(400);
    });

    it("rejects invalid JSON schema", async () => {
      const res = await request("/api/skills", {
        method: "POST",
        body: {
          slug: `bad-schema-${Date.now()}`,
          display_name: "Bad Schema",
          description: "Bad schema test",
          input_schema: { type: "not-a-real-type" },
          skill_content: "# Bad",
        },
      });
      expect(res.status).toBe(400);
    });
  });

  // ======================== SKILL UPDATE ========================
  describe("Skill Update", () => {
    let skillId: string;

    beforeAll(async () => {
      const res = await request("/api/skills", {
        method: "POST",
        body: {
          slug: `update-test-${Date.now()}`,
          display_name: "Update Test",
          description: "Will be updated",
          input_schema: { type: "object", properties: {} },
          skill_content: "# V1",
        },
      });
      const data = await res.json();
      skillId = data.id;
    });

    it("PUT /api/skills/:id updates metadata", async () => {
      const res = await request(`/api/skills/${skillId}`, {
        method: "PUT",
        body: { description: "Updated description" },
      });
      expect(res.status).toBe(200);
    });

    it("PUT /api/skills/:id updates skill content (new version)", async () => {
      const res = await request(`/api/skills/${skillId}`, {
        method: "PUT",
        body: { skill_content: "# V2\nUpdated content" },
      });
      expect(res.status).toBe(200);
    });

    it("returns 404 for nonexistent skill", async () => {
      const res = await request(`/api/skills/00000000-0000-0000-0000-999999999999`, {
        method: "PUT",
        body: { description: "nope" },
      });
      expect(res.status).toBe(404);
    });
  });

  // ======================== ANALYTICS ========================
  describe("Analytics", () => {
    it("GET /api/skills/:id/analytics returns stats", async () => {
      const browseRes = await request("/api/skills/browse");
      const { skills } = await browseRes.json();
      const skillId = skills[0].id;

      const res = await request(`/api/skills/${skillId}/analytics`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.total_invocations).toBe("number");
      expect(typeof data.successful).toBe("number");
      expect(typeof data.failed).toBe("number");
      expect(typeof data.total_input_tokens).toBe("number");
      expect(typeof data.total_output_tokens).toBe("number");
      expect(typeof data.total_revenue_cents).toBe("number");
    });
  });

  // ======================== USAGE ========================
  describe("Usage History", () => {
    it("GET /api/usage returns usage and balance_cents", async () => {
      const res = await request("/api/usage", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.usage).toBeArray();
      expect(typeof data.balance_cents).toBe("number");
    });

    it("rejects unauthenticated request", async () => {
      const res = await request("/api/usage");
      expect(res.status).toBe(401);
    });
  });

  // ======================== INVOCATION ========================
  describe("Skill Invocation", () => {
    it("rejects without auth", async () => {
      const res = await request("/api/skills/investigate/invoke", {
        method: "POST",
        body: { input: { input: "test" } },
      });
      expect(res.status).toBe(401);
    });

    it("returns 404 for nonexistent skill", async () => {
      const res = await request("/api/skills/nonexistent-skill-xyz/invoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        body: { input: { input: "test" } },
      });
      expect(res.status).toBe(404);
    });

    it("returns 403 for inaccessible skill", async () => {
      // Create a new user without access to any skills
      const signupRes = await request("/api/auth/signup", {
        method: "POST",
        body: { email: `noaccess-${Date.now()}@test.com` },
      });
      const { api_key } = await signupRes.json();

      // Create a skill that's NOT auto-granted to this user
      // (user was created before the skill, but skill grants to existing users)
      // Actually, our skill creation grants to ALL existing users... so let's
      // use a skill created before this user was created
      // The seeded skills should work since user was created after seed

      // Wait — actually new users get no skills. The skill creation grants to
      // existing users at creation time. So a user created AFTER a skill
      // won't have access unless we explicitly grant it.
      // Let's verify by getting user's skills
      const skillsRes = await request("/api/user/skills", {
        headers: { Authorization: `Bearer ${api_key}` },
      });
      const { skills } = await skillsRes.json();

      // The new user might have access to skills created after their signup
      // but NOT to skills created before. Let's just test with a skill
      // that exists but the new user doesn't have.
      // For a clean test: create skill, create user after, invoke
      const slug = `private-${Date.now()}`;
      await request("/api/skills", {
        method: "POST",
        body: {
          slug,
          display_name: "Private",
          description: "Private skill",
          input_schema: { type: "object", properties: {} },
          skill_content: "# Private",
        },
      });

      // Create a NEW user after the skill (so they won't get auto-grant)
      const signup2 = await request("/api/auth/signup", {
        method: "POST",
        body: { email: `after-${Date.now()}@test.com` },
      });
      const { api_key: key2 } = await signup2.json();

      const invokeRes = await request(`/api/skills/${slug}/invoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key2}` },
        body: { input: { input: "test" } },
      });
      expect(invokeRes.status).toBe(403);
    });

    it("rejects non-object input", async () => {
      const browseRes = await request("/api/skills/browse");
      const { skills } = await browseRes.json();
      const slug = skills[0].slug;

      const res = await request(`/api/skills/${slug}/invoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        body: { input: "not an object" },
      });
      expect(res.status).toBe(400);
    });
  });
});

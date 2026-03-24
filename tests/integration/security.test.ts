// Security tests for the SkillHub API
// Tests auth enforcement, data leakage prevention, and injection defense

import { describe, it, expect } from "bun:test";
import app from "../../src/api-server.js";

const BASE = "http://localhost";
const TEST_API_KEY = "sk_test_skillhub_user_001";

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

describe("Security Tests", () => {
  describe("Auth Enforcement", () => {
    const protectedRoutes = [
      { method: "GET", path: "/api/usage" },
      { method: "GET", path: "/api/user/skills" },
      { method: "POST", path: "/api/skills/test/invoke" },
    ];

    for (const route of protectedRoutes) {
      it(`${route.method} ${route.path} requires authentication`, async () => {
        const res = await request(route.path, {
          method: route.method,
          body: route.method === "POST" ? { input: { test: true } } : undefined,
        });
        expect(res.status).toBe(401);
      });

      it(`${route.method} ${route.path} rejects invalid API key`, async () => {
        const res = await request(route.path, {
          method: route.method,
          headers: { Authorization: "Bearer sk_user_fake_invalid_key_12345" },
          body: route.method === "POST" ? { input: { test: true } } : undefined,
        });
        expect(res.status).toBe(401);
      });
    }
  });

  describe("Data Leakage Prevention", () => {
    it("browse does not expose s3_key", async () => {
      const res = await request("/api/skills/browse");
      const data = await res.json();
      for (const skill of data.skills) {
        expect(skill.s3_key).toBeUndefined();
        expect(skill.creator_id).toBeUndefined();
      }
    });

    it("user skills does not expose s3_key", async () => {
      const res = await request("/api/user/skills", {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });
      const data = await res.json();
      for (const skill of data.skills) {
        expect(skill.s3_key).toBeUndefined();
      }
    });
  });

  describe("Input Validation", () => {
    it("rejects non-JSON body on invoke", async () => {
      const req = new Request(`${BASE}/api/skills/test/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Authorization: `Bearer ${TEST_API_KEY}`,
        },
        body: "not json",
      });
      const res = await app.fetch(req);
      // Should get 400 or 500, not crash
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects empty body on signup", async () => {
      const req = new Request(`${BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Rate Limiting", () => {
    it("rate limiter eventually blocks excessive requests", async () => {
      // Create a test skill for rate limiting
      const slug = `rate-limit-test-${Date.now()}`;
      await request("/api/skills", {
        method: "POST",
        body: {
          slug,
          display_name: "Rate Limit Test",
          description: "For rate limit testing",
          input_schema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
          skill_content: "# Rate Limit Test\nSay 'ok'",
        },
      });

      // The rate limiter allows 60 requests per minute per user per skill
      // We just verify the mechanism exists — we don't burn 60 real LLM calls
      const { RateLimiter } = await import("../../src/rate-limiter.js");
      const limiter = new RateLimiter(3, 60_000); // 3 per minute for testing

      const userId = "test-user-id";
      const skillId = "test-skill-id";

      expect(limiter.check(userId, skillId)).toBe(true);
      expect(limiter.check(userId, skillId)).toBe(true);
      expect(limiter.check(userId, skillId)).toBe(true);
      expect(limiter.check(userId, skillId)).toBe(false); // Blocked
      expect(limiter.remaining(userId, skillId)).toBe(0);
    });
  });

  describe("API Key Security", () => {
    it("API keys are prefixed with sk_user_", async () => {
      const res = await request("/api/auth/signup", {
        method: "POST",
        body: { email: `apikey-security-${Date.now()}@test.com` },
      });
      const data = await res.json();
      expect(data.api_key).toMatch(/^sk_user_/);
    });

    it("different signups get different API keys", async () => {
      const res1 = await request("/api/auth/signup", {
        method: "POST",
        body: { email: `unique1-${Date.now()}@test.com` },
      });
      const res2 = await request("/api/auth/signup", {
        method: "POST",
        body: { email: `unique2-${Date.now()}@test.com` },
      });
      const data1 = await res1.json();
      const data2 = await res2.json();
      expect(data1.api_key).not.toBe(data2.api_key);
    });
  });
});

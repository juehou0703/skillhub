// Integration test for the full skill invocation flow
// This test actually calls Claude CLI, so it tests the real LLM proxy
// Requires: Postgres running, skills seeded, claude CLI available

import { describe, it, expect, beforeAll } from "bun:test";
import app from "../../src/api-server.js";
import sql from "../../src/db.js";

const TEST_API_KEY = "sk_test_skillhub_user_001";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000010";
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

describe("Full Invocation Flow (requires Claude CLI)", () => {
  let testSkillSlug: string;

  beforeAll(async () => {
    testSkillSlug = `echo-test-${Date.now()}`;
    const res = await request("/api/skills", {
      method: "POST",
      body: {
        slug: testSkillSlug,
        display_name: "Echo Test",
        description: "A simple echo skill for testing. Repeats the user's input.",
        input_schema: {
          type: "object",
          properties: {
            input: { type: "string", description: "Text to echo" },
          },
          required: ["input"],
        },
        model: "haiku",
        skill_content: "You are a simple echo skill. Whatever the user says, repeat it back exactly. Only output the echoed text, nothing else.",
      },
    });
    expect(res.status).toBe(201);
  });

  it("invokes a skill and gets a response with token counts", async () => {
    const res = await request(`/api/skills/${testSkillSlug}/invoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      body: { input: { input: "Hello SkillHub" } },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBeDefined();
    expect(data.result.length).toBeGreaterThan(0);
    expect(data.usage_event_id).toBeDefined();
    expect(typeof data.input_tokens).toBe("number");
    expect(typeof data.output_tokens).toBe("number");
    expect(typeof data.skill_cost).toBe("number");
  }, 120_000);

  it("logs usage after invocation with correct fields", async () => {
    const res = await request("/api/usage", {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.usage.length).toBeGreaterThan(0);

    const event = data.usage.find(
      (u: any) => u.skill_slug === testSkillSlug && u.status === "complete"
    );
    expect(event).toBeDefined();
    expect(event.input_tokens).toBeGreaterThan(0);
    expect(event.output_tokens).toBeGreaterThan(0);
  });

  it("rejects invocation for user without access", async () => {
    const signupRes = await request("/api/auth/signup", {
      method: "POST",
      body: { email: `noaccess-invoke-${Date.now()}@test.com` },
    });
    const { api_key } = await signupRes.json();

    const res = await request(`/api/skills/${testSkillSlug}/invoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${api_key}` },
      body: { input: { input: "test" } },
    });
    expect(res.status).toBe(403);
  });

  it("handles idempotency key — second call returns cached", async () => {
    const idemKey = `idem-${Date.now()}`;

    // First call
    const res1 = await request(`/api/skills/${testSkillSlug}/invoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      body: { input: { input: "idempotency test" }, idempotency_key: idemKey },
    });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.result).toBeDefined();

    // Second call with same key — should return cached
    const res2 = await request(`/api/skills/${testSkillSlug}/invoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      body: { input: { input: "different input" }, idempotency_key: idemKey },
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.result).toContain("Cached result");
    expect(data2.usage_event_id).toBe(data1.usage_event_id);
  }, 120_000);
});

describe("Balance Deduction", () => {
  let paidSkillSlug: string;
  let userApiKey: string;
  let userId: string;

  beforeAll(async () => {
    // Create a paid skill
    paidSkillSlug = `paid-skill-${Date.now()}`;
    await request("/api/skills", {
      method: "POST",
      body: {
        slug: paidSkillSlug,
        display_name: "Paid Skill",
        description: "A skill that costs money",
        input_schema: {
          type: "object",
          properties: { input: { type: "string" } },
          required: ["input"],
        },
        model: "haiku",
        price_per_use: 100, // $1.00
        skill_content: "You are a paid test skill. Say 'paid response' and nothing else.",
      },
    });

    // Create a user with some balance
    const signupRes = await request("/api/auth/signup", {
      method: "POST",
      body: { email: `balance-test-${Date.now()}@test.com` },
    });
    const signupData = await signupRes.json();
    userApiKey = signupData.api_key;
    userId = signupData.user.id;

    // Grant balance and access
    await sql`UPDATE users SET balance_cents = 500 WHERE id = ${userId}`;
    const skillRows = await sql<{ id: string }[]>`SELECT id FROM skills WHERE slug = ${paidSkillSlug}`;
    await sql`INSERT INTO user_skills (user_id, skill_id) VALUES (${userId}, ${skillRows[0].id}) ON CONFLICT DO NOTHING`;
  });

  it("deducts balance on successful invocation", async () => {
    // Check initial balance
    const beforeRes = await request("/api/usage", {
      headers: { Authorization: `Bearer ${userApiKey}` },
    });
    const before = await beforeRes.json();
    expect(before.balance_cents).toBe(500);

    // Invoke the paid skill
    const res = await request(`/api/skills/${paidSkillSlug}/invoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userApiKey}` },
      body: { input: { input: "test" } },
    });
    expect(res.status).toBe(200);

    // Check balance was deducted
    const afterRes = await request("/api/usage", {
      headers: { Authorization: `Bearer ${userApiKey}` },
    });
    const after = await afterRes.json();
    expect(after.balance_cents).toBe(400); // 500 - 100
  }, 120_000);

  it("rejects invocation when balance is insufficient", async () => {
    // Drain the balance
    await sql`UPDATE users SET balance_cents = 50 WHERE id = ${userId}`;

    const res = await request(`/api/skills/${paidSkillSlug}/invoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userApiKey}` },
      body: { input: { input: "test" } },
    });
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toContain("Insufficient balance");
  });

  it("allows free skills when balance is zero", async () => {
    // Ensure user has zero balance
    await sql`UPDATE users SET balance_cents = 0 WHERE id = ${userId}`;

    // The echo test skill is free (price_per_use = 0)
    // But user needs access — get a free skill slug
    const browseRes = await request("/api/skills/browse");
    const { skills } = await browseRes.json();
    const freeSkill = skills.find((s: any) => s.price_per_use === 0);

    if (freeSkill) {
      // Grant access
      await sql`INSERT INTO user_skills (user_id, skill_id) VALUES (${userId}, ${freeSkill.id}) ON CONFLICT DO NOTHING`;

      const res = await request(`/api/skills/${freeSkill.slug}/invoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${userApiKey}` },
        body: { input: { input: "test" } },
      });
      // Should succeed (200) or fail at LLM level, but NOT 402
      expect(res.status).not.toBe(402);
    }
  }, 120_000);
});

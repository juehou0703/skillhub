// Concurrency tests — verify atomic balance deduction under parallel requests
// These test the database-level guarantees, not the LLM proxy

import { describe, it, expect, beforeAll } from "bun:test";
import sql from "../../src/db.js";
import { hashApiKey, generateApiKey } from "../../src/auth.js";

describe("Concurrent Balance Deduction", () => {
  it("atomic UPDATE prevents double-spending", async () => {
    // Set up a user with exactly 100 cents
    const apiKey = generateApiKey();
    const hash = hashApiKey(apiKey);
    const email = `concurrent-${Date.now()}@test.com`;

    const userRows = await sql<{ id: string }[]>`
      INSERT INTO users (email, api_key_hash, balance_cents)
      VALUES (${email}, ${hash}, 100)
      RETURNING id
    `;
    const userId = userRows[0].id;

    // Simulate 5 concurrent deductions of 50 cents each
    // Only 2 should succeed (100 / 50 = 2)
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        sql<{ id: string }[]>`
          UPDATE users SET balance_cents = balance_cents - 50
          WHERE id = ${userId} AND balance_cents >= 50
          RETURNING id
        `.then((rows) => rows.length > 0)
      )
    );

    const successCount = results.filter(Boolean).length;
    expect(successCount).toBe(2);

    // Verify final balance is 0
    const finalRows = await sql<{ balance_cents: number }[]>`
      SELECT balance_cents FROM users WHERE id = ${userId}
    `;
    expect(finalRows[0].balance_cents).toBe(0);
  });

  it("idempotency key prevents duplicate usage events", async () => {
    const idemKey = `concurrent-idem-${Date.now()}`;
    const userId = "00000000-0000-0000-0000-000000000010";

    // Get any skill ID
    const skills = await sql<{ id: string }[]>`SELECT id FROM skills LIMIT 1`;
    const skillId = skills[0].id;

    // Try to insert 5 concurrent usage events with same idempotency key
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        sql`
          INSERT INTO usage_events (user_id, skill_id, idempotency_key, status)
          VALUES (${userId}, ${skillId}, ${idemKey}, 'pending')
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING id
        `.then((rows) => rows.length > 0)
      )
    );

    // Only one should have inserted
    const insertCount = results.filter(Boolean).length;
    expect(insertCount).toBe(1);

    // Verify only one record exists
    const count = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM usage_events WHERE idempotency_key = ${idemKey}
    `;
    expect(count[0].count).toBe(1);
  });
});

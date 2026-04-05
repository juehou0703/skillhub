// MCP Gateway Server — the heart of the system
// Exposes skills as MCP tools, proxies LLM calls through Claude CLI

import sql from "./db.js";
import { skillCache } from "./skill-cache.js";
import { fetchSkillFile } from "./skill-store.js";
import { invokeLlm } from "./llm-proxy.js";
import { rateLimiter } from "./rate-limiter.js";
import { randomUUID } from "crypto";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });

export interface SkillRecord {
  id: string;
  slug: string;
  display_name: string;
  description: string;
  category: string;
  input_schema: any;
  model: string;
  price_per_use: number;
  s3_key: string;
  status: string;
}

// Get skills accessible to a user
export async function getUserSkills(userId: string): Promise<SkillRecord[]> {
  const rows = await sql<SkillRecord[]>`
    SELECT s.id, s.slug, s.display_name, s.description, s.category, s.input_schema,
           s.model, s.price_per_use, s.s3_key, s.status
    FROM skills s
    JOIN user_skills us ON us.skill_id = s.id
    WHERE us.user_id = ${userId}
      AND s.status = 'published'
  `;
  return rows;
}

// Get all published skills (for browse)
export async function getAllPublishedSkills(): Promise<SkillRecord[]> {
  const rows = await sql<SkillRecord[]>`
    SELECT id, slug, display_name, description, category, input_schema,
           model, price_per_use, s3_key, status
    FROM skills
    WHERE status = 'published'
  `;
  return rows;
}

// Invoke a skill for a user
export async function invokeSkill(
  userId: string,
  skillSlug: string,
  input: Record<string, any>,
  idempotencyKey?: string
): Promise<{ content: string; usageEventId: number; inputTokens: number; outputTokens: number; skillCost: number }> {
  // 1. Look up skill
  const skillRows = await sql<SkillRecord[]>`
    SELECT id, slug, display_name, description, category, input_schema,
           model, price_per_use, s3_key, status
    FROM skills WHERE slug = ${skillSlug} AND status = 'published'
  `;
  if (skillRows.length === 0) {
    throw new Error(`Skill "${skillSlug}" not found or not published`);
  }
  const skill = skillRows[0];

  // 2. Check access
  const accessRows = await sql`
    SELECT 1 FROM user_skills
    WHERE user_id = ${userId} AND skill_id = ${skill.id}
  `;
  if (accessRows.length === 0) {
    throw new Error(`You don't have access to skill "${skillSlug}"`);
  }

  // 3. Rate limit
  if (!rateLimiter.check(userId, skill.id)) {
    throw new Error("Rate limit exceeded. Try again later.");
  }

  // 4. Validate input against skill's JSON schema
  if (skill.input_schema && typeof skill.input_schema === "object") {
    const validate = ajv.compile(skill.input_schema);
    if (!validate(input)) {
      const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join("; ");
      throw new Error(`Invalid input: ${errors}`);
    }
  }

  // 5. Idempotency check
  const idemKey = idempotencyKey || randomUUID();
  const existingRows = await sql`
    SELECT id, status, input_tokens, output_tokens, skill_cost
    FROM usage_events WHERE idempotency_key = ${idemKey}
  `;
  if (existingRows.length > 0 && existingRows[0].status === "complete") {
    return {
      content: "[Cached result — duplicate request]",
      usageEventId: Number(existingRows[0].id),
      inputTokens: existingRows[0].input_tokens || 0,
      outputTokens: existingRows[0].output_tokens || 0,
      skillCost: existingRows[0].skill_cost || 0,
    };
  }

  // 6. Check balance (if skill costs money)
  if (skill.price_per_use > 0) {
    const balanceRows = await sql<{ balance_cents: number }[]>`
      SELECT balance_cents FROM users WHERE id = ${userId}
    `;
    if (balanceRows.length === 0 || balanceRows[0].balance_cents < skill.price_per_use) {
      throw new Error(`Insufficient balance. Skill costs $${(skill.price_per_use / 100).toFixed(4)}, your balance is $${((balanceRows[0]?.balance_cents || 0) / 100).toFixed(4)}`);
    }
  }

  // 7. Create PENDING usage event
  const eventRows = await sql<{ id: number }[]>`
    INSERT INTO usage_events (user_id, skill_id, idempotency_key, status)
    VALUES (${userId}, ${skill.id}, ${idemKey}, 'pending')
    ON CONFLICT (idempotency_key) DO UPDATE SET status = 'pending'
    RETURNING id
  `;
  const usageEventId = Number(eventRows[0].id);

  // 8. Fetch SKILL.md (cache first, then filesystem)
  let skillPrompt = skillCache.get(skill.s3_key);
  if (!skillPrompt) {
    try {
      skillPrompt = await fetchSkillFile(skill.s3_key);
      skillCache.set(skill.s3_key, skillPrompt);
    } catch {
      await sql`UPDATE usage_events SET status = 'failed' WHERE id = ${usageEventId}`;
      throw new Error(`Failed to fetch skill file for "${skillSlug}"`);
    }
  }

  // 9. Call LLM
  try {
    const userMessage =
      typeof input === "string" ? input : JSON.stringify(input, null, 2);

    const response = await invokeLlm({
      systemPrompt: skillPrompt,
      userMessage,
      model: skill.model,
    });

    // 10. Atomic balance deduction + mark usage event complete (in a transaction)
    await sql.begin(async (tx) => {
      // Deduct balance atomically (only if skill costs money)
      if (skill.price_per_use > 0) {
        const updated = await tx<{ id: string }[]>`
          UPDATE users SET balance_cents = balance_cents - ${skill.price_per_use}
          WHERE id = ${userId} AND balance_cents >= ${skill.price_per_use}
          RETURNING id
        `;
        if (updated.length === 0) {
          throw new Error("Insufficient balance (race condition — balance changed during invocation)");
        }
      }

      // Mark usage event complete with full logs
      await tx`
        UPDATE usage_events
        SET status = 'complete',
            input_tokens = ${response.inputTokens},
            output_tokens = ${response.outputTokens},
            skill_cost = ${skill.price_per_use},
            api_cost = 0,
            request_input = ${sql.json(input)}::jsonb,
            response_output = ${response.content}
        WHERE id = ${usageEventId}
      `;
    });

    return {
      content: response.content,
      usageEventId,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      skillCost: skill.price_per_use,
    };
  } catch (err) {
    // Mark failed (still store input for debugging)
    await sql`UPDATE usage_events SET status = 'failed', request_input = ${sql.json(input)}::jsonb, response_output = ${(err as Error).message} WHERE id = ${usageEventId}`;
    throw err;
  }
}

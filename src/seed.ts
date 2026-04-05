// Seed script: imports gstack skills from ~/.claude/skills/gstack into the DB
// Reads each SKILL.md, extracts frontmatter, creates DB records + stores files

import { readFile, readdir } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import sql from "./db.js";
import { storeSkillFile } from "./skill-store.js";

const GSTACK_DIR =
  process.env.GSTACK_DIR || join(process.env.HOME || "~", ".claude/skills/gstack");

const CREATOR_ID = "00000000-0000-0000-0000-000000000001"; // gstack creator
const TEST_USER_ID = "00000000-0000-0000-0000-000000000010";

// Pricing and category overrides for marketplace realism
// Skills priced at 0 (free), 50 ($0.50), or $1.99–$4.99 per invocation (stored in cents)
const SKILL_OVERRIDES: Record<string, { price: number; category: string }> = {
  benchmark: { price: 50, category: "analysis" },
  "design-consultation": { price: 50, category: "creative" },
  "design-review": { price: 299, category: "creative" },
  "plan-design-review": { price: 50, category: "creative" },
  codex: { price: 499, category: "coding" },
  qa: { price: 50, category: "coding" },
  "qa-only": { price: 249, category: "coding" },
  review: { price: 50, category: "coding" },
  "plan-ceo-review": { price: 349, category: "business" },
  "office-hours": { price: 50, category: "business" },
  retro: { price: 249, category: "analysis" },
  "land-and-deploy": { price: 50, category: "developer-tools" },
  "document-release": { price: 199, category: "writing" },
  // Free skills with diversified categories
  "plan-eng-review": { price: 0, category: "coding" },
  investigate: { price: 0, category: "analysis" },
  canary: { price: 0, category: "analysis" },
};

interface SkillMeta {
  name: string;
  description: string;
  version?: string;
}

function parseFrontmatter(content: string): { meta: SkillMeta; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { meta: { name: "unknown", description: "No description" }, body: content };
  }

  const yaml = match[1];
  const body = match[2];

  // Simple YAML parser for the fields we need
  const name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim() || "unknown";

  // Handle multi-line description with pipe (|) syntax
  let description = "";
  const descMatch = yaml.match(/^description:\s*\|?\s*\n([\s\S]*?)(?=\n\w|\n---|\z)/m);
  if (descMatch) {
    description = descMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ");
  } else {
    const singleLine = yaml.match(/^description:\s*(.+)$/m);
    if (singleLine) description = singleLine[1].trim();
  }

  const version = yaml.match(/^version:\s*(.+)$/m)?.[1]?.trim();

  return { meta: { name, description: description || "No description", version }, body };
}

// Map skill name to a simple input schema
function defaultInputSchema(skillName: string): object {
  return {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: `Input for the ${skillName} skill`,
      },
      context: {
        type: "string",
        description: "Additional context (optional)",
      },
    },
    required: ["prompt"],
  };
}

async function seed() {
  console.log("🌱 Seeding gstack skills...\n");

  // Find all SKILL.md files (top-level subdirectories only)
  const entries = await readdir(GSTACK_DIR, { withFileTypes: true });
  const skillDirs = entries.filter(
    (e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("bin")
  );

  let seeded = 0;
  let skipped = 0;

  for (const dir of skillDirs) {
    const skillPath = join(GSTACK_DIR, dir.name, "SKILL.md");
    if (!existsSync(skillPath)) {
      continue;
    }

    const content = await readFile(skillPath, "utf-8");
    const { meta, body } = parseFrontmatter(content);

    // Skip if name is unknown or too generic
    if (meta.name === "unknown") {
      console.log(`  ⏭ Skipping ${dir.name} (no valid frontmatter)`);
      skipped++;
      continue;
    }

    const slug = meta.name;
    const displayName = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    // Truncate description to first sentence for the tool description
    const shortDesc = meta.description.length > 200
      ? meta.description.substring(0, 200) + "..."
      : meta.description;

    try {
      // Check if skill already exists
      const existing = await sql`SELECT id FROM skills WHERE slug = ${slug}`;
      if (existing.length > 0) {
        console.log(`  ⏭ ${slug} already exists`);
        skipped++;
        continue;
      }

      // Store the skill file
      const tempId = crypto.randomUUID();
      const s3Key = await storeSkillFile(tempId, 1, content);

      // Look up pricing/category overrides
      const overrides = SKILL_OVERRIDES[slug];
      const skillCategory = overrides?.category || "developer-tools";
      const skillPrice = overrides?.price ?? 0;

      // Insert skill
      const rows = await sql<{ id: string }[]>`
        INSERT INTO skills (creator_id, slug, display_name, description, category, input_schema, model, price_per_use, s3_key, status)
        VALUES (
          ${CREATOR_ID}, ${slug}, ${displayName}, ${shortDesc},
          ${skillCategory}, ${sql.json(defaultInputSchema(slug))}::jsonb,
          'sonnet', ${skillPrice}, ${s3Key}, 'published'
        )
        RETURNING id
      `;

      // Re-store with real ID
      const skillId = rows[0].id;
      const realKey = await storeSkillFile(skillId, 1, content);
      await sql`UPDATE skills SET s3_key = ${realKey} WHERE id = ${skillId}`;

      // Grant access to test user
      await sql`
        INSERT INTO user_skills (user_id, skill_id)
        VALUES (${TEST_USER_ID}, ${skillId})
        ON CONFLICT DO NOTHING
      `;

      console.log(`  ✅ ${slug} — "${shortDesc.substring(0, 60)}..."`);
      seeded++;
    } catch (err: any) {
      console.error(`  ❌ ${slug}: ${err.message}`);
    }
  }

  console.log(`\n✅ Seeded ${seeded} skills, skipped ${skipped}`);
  console.log("📋 Test user API key: sk_test_skillhub_user_001");

  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

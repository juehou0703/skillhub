import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { storeSkillFile, fetchSkillFile, skillFileExists } from "../../src/skill-store.js";
import { rmSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, "../../skills-data");

describe("SkillStore", () => {
  const testSkillId = "test-skill-" + Date.now();

  afterAll(() => {
    // Cleanup test files
    try {
      rmSync(join(TEST_DIR, "skills", testSkillId), { recursive: true, force: true });
    } catch {}
  });

  it("stores and retrieves a skill file", async () => {
    const content = "# Test Skill\nThis is a test skill.";
    const key = await storeSkillFile(testSkillId, 1, content);

    expect(key).toContain(testSkillId);
    expect(key).toContain("v1");
    expect(key).toContain("SKILL.md");

    const retrieved = await fetchSkillFile(key);
    expect(retrieved).toBe(content);
  });

  it("stores different versions", async () => {
    const content1 = "Version 1";
    const content2 = "Version 2";

    const key1 = await storeSkillFile(testSkillId, 1, content1);
    const key2 = await storeSkillFile(testSkillId, 2, content2);

    expect(key1).not.toBe(key2);

    const retrieved1 = await fetchSkillFile(key1);
    const retrieved2 = await fetchSkillFile(key2);

    expect(retrieved1).toBe(content1);
    expect(retrieved2).toBe(content2);
  });

  it("checks existence correctly", async () => {
    const key = await storeSkillFile(testSkillId, 99, "test");
    expect(await skillFileExists(key)).toBe(true);
    expect(await skillFileExists("nonexistent/path")).toBe(false);
  });

  it("throws on fetching non-existent file", async () => {
    expect(fetchSkillFile("nonexistent/key/SKILL.md")).rejects.toThrow();
  });
});

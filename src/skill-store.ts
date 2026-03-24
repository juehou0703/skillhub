import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// POC: local filesystem instead of S3
const SKILLS_DIR = process.env.SKILLS_DIR || join(import.meta.dir, "..", "skills-data");

export interface SkillFile {
  content: string;
  version: number;
}

// Ensure skills directory exists
async function ensureDir(path: string) {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
  }
}

// Store a skill file (replaces S3 in POC)
export async function storeSkillFile(
  skillId: string,
  version: number,
  content: string
): Promise<string> {
  const key = `skills/${skillId}/v${version}/SKILL.md`;
  const fullPath = join(SKILLS_DIR, key);
  await ensureDir(join(SKILLS_DIR, `skills/${skillId}/v${version}`));
  await writeFile(fullPath, content, "utf-8");
  return key;
}

// Fetch a skill file by its storage key
export async function fetchSkillFile(s3Key: string): Promise<string> {
  const fullPath = join(SKILLS_DIR, s3Key);
  return readFile(fullPath, "utf-8");
}

// Check if a skill file exists
export async function skillFileExists(s3Key: string): Promise<boolean> {
  return existsSync(join(SKILLS_DIR, s3Key));
}

import { createHash, randomBytes } from "crypto";
import sql from "./db.js";

export interface User {
  id: string;
  email: string;
  balance_cents: number;
  created_at: Date;
}

// Generate a new API key with prefix
export function generateApiKey(): string {
  const random = randomBytes(24).toString("base64url");
  return `sk_user_${random}`;
}

// Hash an API key with SHA-256 (not bcrypt — keys are high-entropy)
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

// Validate API key and return user record
export async function authenticateApiKey(
  apiKey: string
): Promise<User | null> {
  const hash = hashApiKey(apiKey);
  const rows = await sql<User[]>`
    SELECT id, email, balance_cents, created_at
    FROM users
    WHERE api_key_hash = ${hash}
  `;
  return rows.length > 0 ? rows[0] : null;
}

// Create a new user with a generated API key
export async function createUser(email: string): Promise<{ user: User; apiKey: string }> {
  const apiKey = generateApiKey();
  const hash = hashApiKey(apiKey);

  const rows = await sql<User[]>`
    INSERT INTO users (email, api_key_hash, balance_cents)
    VALUES (${email}, ${hash}, 0)
    RETURNING id, email, balance_cents, created_at
  `;

  return { user: rows[0], apiKey };
}

// Extract API key from Authorization header
export function extractApiKey(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

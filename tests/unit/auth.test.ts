import { describe, it, expect } from "bun:test";
import { generateApiKey, hashApiKey, extractApiKey } from "../../src/auth.js";

describe("Auth", () => {
  describe("generateApiKey", () => {
    it("generates keys with sk_user_ prefix", () => {
      const key = generateApiKey();
      expect(key.startsWith("sk_user_")).toBe(true);
    });

    it("generates unique keys", () => {
      const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
      expect(keys.size).toBe(100);
    });

    it("generates keys of consistent length", () => {
      const key = generateApiKey();
      // sk_user_ (8) + 32 chars base64url from 24 bytes
      expect(key.length).toBe(8 + 32);
    });
  });

  describe("hashApiKey", () => {
    it("produces consistent SHA-256 hashes", () => {
      const key = "sk_user_test123";
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different keys", () => {
      const hash1 = hashApiKey("sk_user_aaa");
      const hash2 = hashApiKey("sk_user_bbb");
      expect(hash1).not.toBe(hash2);
    });

    it("produces 64-char hex string (SHA-256)", () => {
      const hash = hashApiKey("sk_user_test");
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("extractApiKey", () => {
    it("extracts key from Bearer token", () => {
      const key = extractApiKey("Bearer sk_user_abc123");
      expect(key).toBe("sk_user_abc123");
    });

    it("handles case-insensitive Bearer", () => {
      const key = extractApiKey("bearer sk_user_abc123");
      expect(key).toBe("sk_user_abc123");
    });

    it("returns null for missing header", () => {
      expect(extractApiKey(undefined)).toBeNull();
    });

    it("returns null for empty header", () => {
      expect(extractApiKey("")).toBeNull();
    });

    it("returns null for non-Bearer auth", () => {
      expect(extractApiKey("Basic abc123")).toBeNull();
    });
  });
});

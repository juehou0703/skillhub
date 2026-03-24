import { describe, it, expect, beforeEach } from "bun:test";
import { SkillCache } from "../../src/skill-cache.js";

describe("SkillCache", () => {
  let cache: SkillCache;

  beforeEach(() => {
    cache = new SkillCache(100); // 100ms TTL for tests
  });

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns null for missing keys", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("expires entries after TTL", async () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    await Bun.sleep(150);

    expect(cache.get("key1")).toBeNull();
  });

  it("invalidates specific keys", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.invalidate("key1");

    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBe("value2");
  });

  it("clears all entries", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get("key1")).toBeNull();
  });

  it("reports correct size", () => {
    expect(cache.size).toBe(0);
    cache.set("key1", "value1");
    expect(cache.size).toBe(1);
    cache.set("key2", "value2");
    expect(cache.size).toBe(2);
  });

  it("overwrites existing keys", () => {
    cache.set("key1", "value1");
    cache.set("key1", "value2");
    expect(cache.get("key1")).toBe("value2");
    expect(cache.size).toBe(1);
  });
});

import { describe, it, expect, beforeEach } from "bun:test";
import { RateLimiter } from "../../src/rate-limiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 200); // 3 requests per 200ms
  });

  it("allows requests under the limit", () => {
    expect(limiter.check("user1", "skill1")).toBe(true);
    expect(limiter.check("user1", "skill1")).toBe(true);
    expect(limiter.check("user1", "skill1")).toBe(true);
  });

  it("blocks requests over the limit", () => {
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    expect(limiter.check("user1", "skill1")).toBe(false);
  });

  it("tracks different users independently", () => {
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    // user1 is limited
    expect(limiter.check("user1", "skill1")).toBe(false);
    // user2 is not
    expect(limiter.check("user2", "skill1")).toBe(true);
  });

  it("tracks different skills independently", () => {
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    // skill1 is limited
    expect(limiter.check("user1", "skill1")).toBe(false);
    // skill2 is not
    expect(limiter.check("user1", "skill2")).toBe(true);
  });

  it("resets after window expires", async () => {
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    expect(limiter.check("user1", "skill1")).toBe(false);

    await Bun.sleep(250);

    expect(limiter.check("user1", "skill1")).toBe(true);
  });

  it("reports remaining requests correctly", () => {
    expect(limiter.remaining("user1", "skill1")).toBe(3);
    limiter.check("user1", "skill1");
    expect(limiter.remaining("user1", "skill1")).toBe(2);
    limiter.check("user1", "skill1");
    expect(limiter.remaining("user1", "skill1")).toBe(1);
    limiter.check("user1", "skill1");
    expect(limiter.remaining("user1", "skill1")).toBe(0);
  });

  it("can be reset", () => {
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");
    limiter.check("user1", "skill1");

    limiter.reset();
    expect(limiter.check("user1", "skill1")).toBe(true);
    expect(limiter.remaining("user1", "skill1")).toBe(2);
  });
});

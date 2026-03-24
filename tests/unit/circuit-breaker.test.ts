import { describe, it, expect, beforeEach } from "bun:test";
import { CircuitBreaker } from "../../src/circuit-breaker.js";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker(3, 100); // 3 failures, 100ms reset
  });

  it("starts in closed state", () => {
    expect(cb.getState()).toBe("closed");
    expect(cb.canExecute()).toBe(true);
  });

  it("stays closed after fewer failures than threshold", () => {
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("closed");
    expect(cb.canExecute()).toBe(true);
  });

  it("opens after reaching failure threshold", () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("open");
    expect(cb.canExecute()).toBe(false);
  });

  it("transitions to half-open after reset timeout", async () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    await Bun.sleep(150);

    expect(cb.getState()).toBe("half-open");
    expect(cb.canExecute()).toBe(true);
  });

  it("closes again after success in half-open state", async () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();

    await Bun.sleep(150);
    expect(cb.getState()).toBe("half-open");

    cb.recordSuccess();
    expect(cb.getState()).toBe("closed");
  });

  it("re-opens after failure in half-open state", async () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();

    await Bun.sleep(150);
    expect(cb.getState()).toBe("half-open");

    // One more failure should open it again (since count is already at threshold)
    cb.recordFailure();
    expect(cb.getState()).toBe("open");
  });

  it("resets failure count on success", () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    cb.recordFailure();
    // Only 2 failures since last success, not at threshold
    expect(cb.getState()).toBe("closed");
  });

  it("can be manually reset", () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    cb.reset();
    expect(cb.getState()).toBe("closed");
    expect(cb.canExecute()).toBe(true);
  });
});

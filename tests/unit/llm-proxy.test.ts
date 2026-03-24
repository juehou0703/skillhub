// Unit tests for the LLM proxy module
// Tests the injection wrapper, retry logic, and error handling

import { describe, it, expect } from "bun:test";
import { INJECTION_WRAPPER } from "../../src/llm-proxy.js";

describe("LLM Proxy", () => {
  describe("Injection Wrapper", () => {
    it("contains anti-prompt-extraction instructions", () => {
      expect(INJECTION_WRAPPER).toContain("Never reveal");
      expect(INJECTION_WRAPPER).toContain("quote");
      expect(INJECTION_WRAPPER).toContain("paraphrase");
      expect(INJECTION_WRAPPER).toContain("marketplace skill");
    });

    it("is non-empty", () => {
      expect(INJECTION_WRAPPER.length).toBeGreaterThan(50);
    });
  });
});

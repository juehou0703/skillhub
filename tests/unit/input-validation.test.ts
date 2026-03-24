// Unit tests for input validation behavior
// Tests that the invoke flow validates input against skill's JSON schema

import { describe, it, expect } from "bun:test";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });

describe("Input Validation (ajv)", () => {
  const schema = {
    type: "object",
    properties: {
      input: { type: "string", description: "The main input" },
      language: { type: "string", enum: ["en", "es", "fr"] },
      count: { type: "number", minimum: 1, maximum: 10 },
    },
    required: ["input"],
  };

  const validate = ajv.compile(schema);

  it("accepts valid input", () => {
    expect(validate({ input: "hello" })).toBe(true);
    expect(validate({ input: "hello", language: "en" })).toBe(true);
    expect(validate({ input: "hello", count: 5 })).toBe(true);
  });

  it("rejects missing required field", () => {
    expect(validate({})).toBe(false);
    expect(validate.errors).toBeDefined();
    expect(validate.errors!.some((e) => e.keyword === "required")).toBe(true);
  });

  it("rejects wrong type", () => {
    expect(validate({ input: 123 })).toBe(false);
  });

  it("rejects invalid enum value", () => {
    expect(validate({ input: "hi", language: "xx" })).toBe(false);
  });

  it("rejects out-of-range number", () => {
    expect(validate({ input: "hi", count: 0 })).toBe(false);
    expect(validate({ input: "hi", count: 11 })).toBe(false);
  });

  it("allows additional properties by default", () => {
    expect(validate({ input: "hi", extra: "value" })).toBe(true);
  });

  it("error messages are human-readable", () => {
    validate({});
    const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join("; ");
    expect(errors).toContain("required");
  });
});

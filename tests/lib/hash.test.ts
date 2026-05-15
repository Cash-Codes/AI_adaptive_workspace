import { describe, it, expect } from "vitest";
import { canonicalJSONStringify, hashCanonical, sha256Hex } from "@/lib/hash";

describe("canonicalJSONStringify", () => {
  it("sorts object keys deterministically", () => {
    expect(canonicalJSONStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("recurses into nested objects", () => {
    expect(canonicalJSONStringify({ b: { d: 1, c: 2 }, a: 3 })).toBe('{"a":3,"b":{"c":2,"d":1}}');
  });

  it("preserves array order (arrays are not sorted)", () => {
    expect(canonicalJSONStringify([3, 1, 2])).toBe("[3,1,2]");
  });

  it("recurses into objects inside arrays", () => {
    expect(canonicalJSONStringify([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
  });

  it("handles primitives", () => {
    expect(canonicalJSONStringify("x")).toBe('"x"');
    expect(canonicalJSONStringify(42)).toBe("42");
    expect(canonicalJSONStringify(null)).toBe("null");
    expect(canonicalJSONStringify(true)).toBe("true");
  });
});

describe("sha256Hex", () => {
  it("hashes a known input", () => {
    expect(sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});

describe("hashCanonical", () => {
  it("produces identical hashes for equivalent objects with different key order", () => {
    expect(hashCanonical({ a: 1, b: 2 })).toBe(hashCanonical({ b: 2, a: 1 }));
  });

  it("produces different hashes for different content", () => {
    expect(hashCanonical({ a: 1 })).not.toBe(hashCanonical({ a: 2 }));
  });

  it("returns a 64-char hex string", () => {
    expect(hashCanonical({ x: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

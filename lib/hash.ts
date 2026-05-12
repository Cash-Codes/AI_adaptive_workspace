import { createHash } from "node:crypto";

export function canonicalJSONStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJSONStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + canonicalJSONStringify(obj[k]));
  return "{" + parts.join(",") + "}";
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashCanonical(value: unknown): string {
  return sha256Hex(canonicalJSONStringify(value));
}

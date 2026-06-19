import { createHash } from "node:crypto";

// Deterministic UUIDv5-style id derived from a stable natural key, so every
// re-run produces the same id and upserts stay idempotent.
const NAMESPACE = "6f1c2e4a-3b5d-4c7e-8a9f-0d1e2f3a4b5c"; // project-local namespace

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/-/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

export function deterministicUuid(name: string): string {
  const ns = hexToBytes(NAMESPACE);
  const hash = createHash("sha1");
  hash.update(Buffer.from(ns));
  hash.update(Buffer.from(name, "utf8"));
  const bytes = hash.digest().subarray(0, 16);
  // Set version (5) and variant bits.
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return (
    hex.substring(0, 8) +
    "-" +
    hex.substring(8, 12) +
    "-" +
    hex.substring(12, 16) +
    "-" +
    hex.substring(16, 20) +
    "-" +
    hex.substring(20, 32)
  );
}

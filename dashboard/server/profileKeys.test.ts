import { describe, expect, it } from "vitest";
import { normalizeEd25519PublicKey } from "./profileKeys";

describe("normalizeEd25519PublicKey", () => {
  it("canonicalizes a 32-byte Base64URL Ed25519 key and derives a complete BLAKE3 digest", () => {
    const value = Buffer.alloc(32, 7).toString("base64url");
    const result = normalizeEd25519PublicKey(value);
    expect(result.publicKey).toBe(Buffer.alloc(32, 7).toString("base64"));
    expect(result.publicKeyDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects malformed or incorrect-length key material", () => {
    expect(() => normalizeEd25519PublicKey("not a key")).toThrow("Base64");
    expect(() => normalizeEd25519PublicKey(Buffer.alloc(31).toString("base64"))).toThrow("32 bytes");
  });
});

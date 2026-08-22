/** Input-boundary tests for encrypted case payloads and their required AES-GCM material. */
import { describe, expect, it } from "vitest";
import { assertEncryptionMaterial, decodeCiphertext } from "./sealCases";

describe("encrypted case input boundary", () => {
  it("accepts canonical Base64 ciphertext with an AES-GCM-sized body", () => {
    const encrypted = Buffer.alloc(17, 9).toString("base64");
    expect(decodeCiphertext(encrypted)).toHaveLength(17);
  });

  it("rejects malformed or undersized ciphertext", () => {
    expect(() => decodeCiphertext("not base64!")).toThrow("canonical Base64");
    expect(() => decodeCiphertext("AA==")).toThrow("too short");
  });

  it("requires 16-byte salt and 12-byte IV", () => {
    const salt = Buffer.alloc(16, 2).toString("base64");
    const iv = Buffer.alloc(12, 3).toString("base64");
    expect(() => assertEncryptionMaterial(salt, iv)).not.toThrow();
    expect(() => assertEncryptionMaterial(Buffer.alloc(15).toString("base64"), iv)).toThrow("salt");
    expect(() => assertEncryptionMaterial(salt, Buffer.alloc(13).toString("base64"))).toThrow("IV");
  });
});

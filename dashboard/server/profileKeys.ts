import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/** Validates a raw 32-byte Ed25519 public key and derives the complete BLAKE3 digest used for authorization. */
export function normalizeEd25519PublicKey(value: string) {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed)) throw new Error("The public key must be Base64 or Base64URL encoded.");
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(trimmed.length / 4) * 4, "=");
  const bytes = Buffer.from(normalized, "base64");
  if (bytes.byteLength !== 32) throw new Error("An Ed25519 public key must decode to exactly 32 bytes.");
  return {
    publicKey: bytes.toString("base64"),
    publicKeyDigest: bytesToHex(blake3(bytes)),
  };
}

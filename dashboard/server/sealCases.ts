/**
 * Pure request-boundary checks for encrypted case records. They prevent malformed
 * binary payloads from reaching storage and retain a small, predictable server limit.
 */
import { TRPCError } from "@trpc/server";

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_CIPHERTEXT_BYTES = 1_500_000;

export function decodeCiphertext(base64Payload: string): Buffer {
  if (!BASE64_PATTERN.test(base64Payload)) throw new TRPCError({ code: "BAD_REQUEST", message: "Encrypted payload must be canonical Base64." });
  const bytes = Buffer.from(base64Payload, "base64");
  if (bytes.length < 17) throw new TRPCError({ code: "BAD_REQUEST", message: "Encrypted payload is too short for AES-GCM ciphertext." });
  if (bytes.length > MAX_CIPHERTEXT_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Encrypted payload exceeds the case-vault limit." });
  if (bytes.toString("base64") !== base64Payload) throw new TRPCError({ code: "BAD_REQUEST", message: "Encrypted payload is not canonical Base64." });
  return bytes;
}

export function assertEncryptionMaterial(salt: string, iv: string) {
  if (!BASE64_PATTERN.test(salt) || Buffer.from(salt, "base64").length !== 16) throw new TRPCError({ code: "BAD_REQUEST", message: "Encryption salt must be a 16-byte Base64 value." });
  if (!BASE64_PATTERN.test(iv) || Buffer.from(iv, "base64").length !== 12) throw new TRPCError({ code: "BAD_REQUEST", message: "Encryption IV must be a 12-byte Base64 value." });
}

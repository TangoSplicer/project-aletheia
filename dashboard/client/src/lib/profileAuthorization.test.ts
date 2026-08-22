import { describe, expect, it } from "vitest";
import { evaluateProfileAuthorization, type ActiveVerificationProfile } from "./profileAuthorization";

const digest = "a".repeat(64);
const profile: ActiveVerificationProfile = {
  id: 7,
  name: "UK pilot register",
  jurisdiction: "United Kingdom",
  policyVersion: "2026.1",
  status: "active",
  reviewedAt: 1,
  keys: [{ id: 9, practitionerId: "P-001", practitionerName: "Ada Practitioner", publicKeyDigest: digest, validFrom: null, validUntil: null, status: "active", revocationReason: null }],
};

describe("evaluateProfileAuthorization", () => {
  it("keeps a cryptographically valid signature distinct from an unconfigured profile", () => {
    expect(evaluateProfileAuthorization(undefined, { state: "verified", message: "valid", signerKeyDigest: digest }, "P-001").state).toBe("unconfigured");
  });

  it("authorizes an active matching signer key for the manifest practitioner", () => {
    const result = evaluateProfileAuthorization(profile, { state: "verified", message: "valid", signerKeyDigest: digest }, "P-001");
    expect(result).toMatchObject({ state: "authorized", profileName: "UK pilot register", practitionerName: "Ada Practitioner" });
  });

  it("rejects an unknown, revoked, expired, or practitioner-mismatched key without changing the signature outcome", () => {
    expect(evaluateProfileAuthorization(profile, { state: "verified", message: "valid", signerKeyDigest: "b".repeat(64) }, "P-001").state).toBe("unknown_key");
    expect(evaluateProfileAuthorization({ ...profile, keys: [{ ...profile.keys[0], status: "revoked", revocationReason: "Key ceremony superseded" }] }, { state: "verified", message: "valid", signerKeyDigest: digest }, "P-001").state).toBe("revoked_key");
    expect(evaluateProfileAuthorization({ ...profile, keys: [{ ...profile.keys[0], validUntil: 10 }] }, { state: "verified", message: "valid", signerKeyDigest: digest }, "P-001", 11).state).toBe("expired_key");
    expect(evaluateProfileAuthorization(profile, { state: "verified", message: "valid", signerKeyDigest: digest }, "P-002").state).toBe("practitioner_mismatch");
  });

  it("does not claim authorization when signature verification has not passed", () => {
    expect(evaluateProfileAuthorization(profile, { state: "failed", message: "invalid", signerKeyDigest: digest }, "P-001").state).toBe("signature_unverified");
  });

  it("does not authorize a matching key until independent approval changes it to active", () => {
    const pending = { ...profile, keys: [{ ...profile.keys[0], status: "pending" as const }] };
    expect(evaluateProfileAuthorization(pending, { state: "verified", message: "valid", signerKeyDigest: digest }, "P-001").state).toBe("pending_key");
  });
});

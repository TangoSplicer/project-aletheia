import { describe, expect, it } from "vitest";
import { buildProfileProvenance } from "./profileProvenance";
import type { ActiveVerificationProfile, ProfileAuthorization } from "./profileAuthorization";

const profile: ActiveVerificationProfile = {
  id: 4,
  name: "Controlled register",
  jurisdiction: "United Kingdom",
  policyVersion: "2026.1",
  status: "active",
  reviewedAt: 1_700_000_000_000,
  keys: [],
};

describe("buildProfileProvenance", () => {
  it("preserves the evaluated authorization decision while excluding key-register material", () => {
    const decision: ProfileAuthorization = { state: "authorized", message: "Authorized", signerKeyDigest: "a".repeat(64), matchedKeyId: 12, practitionerName: "Ada Practitioner" };
    const result = buildProfileProvenance(profile, decision, new Date("2026-08-20T12:00:00.000Z"));
    expect(result).toEqual({
      evaluated_at: "2026-08-20T12:00:00.000Z",
      profile: { id: 4, name: "Controlled register", jurisdiction: "United Kingdom", policy_version: "2026.1", reviewed_at: "2023-11-14T22:13:20.000Z" },
      authorization: { state: "authorized", message: "Authorized", signer_key_digest: "a".repeat(64), matched_key_id: 12, practitioner_name: "Ada Practitioner" },
    });
    expect(JSON.stringify(result)).not.toContain("publicKey");
  });

  it("records an unconfigured authority decision without inventing profile metadata", () => {
    const result = buildProfileProvenance(undefined, { state: "unconfigured", message: "No profile", signerKeyDigest: "b".repeat(64) }, new Date("2026-08-20T12:00:00.000Z"));
    expect(result.profile).toBeNull();
    expect(result.authorization).toMatchObject({ state: "unconfigured", signer_key_digest: "b".repeat(64), matched_key_id: null });
  });
});

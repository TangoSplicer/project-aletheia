import type { ActiveVerificationProfile, ProfileAuthorization } from "./profileAuthorization";

/** Safe policy metadata included with a local verification decision; no public-key material is copied into this projection. */
export function buildProfileProvenance(profile: ActiveVerificationProfile | null | undefined, authorization: ProfileAuthorization, evaluatedAt = new Date()) {
  return {
    evaluated_at: evaluatedAt.toISOString(),
    profile: profile ? { id: profile.id, name: profile.name, jurisdiction: profile.jurisdiction, policy_version: profile.policyVersion, reviewed_at: profile.reviewedAt ? new Date(profile.reviewedAt).toISOString() : null } : null,
    authorization: {
      state: authorization.state,
      message: authorization.message,
      signer_key_digest: authorization.signerKeyDigest ?? null,
      matched_key_id: authorization.matchedKeyId ?? null,
      practitioner_name: authorization.practitionerName ?? null,
    },
  };
}

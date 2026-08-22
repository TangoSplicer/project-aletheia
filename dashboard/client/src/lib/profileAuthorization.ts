import type { SignatureResult } from "./verification";

export type ProfileSignerKey = {
  id: number;
  practitionerId: string;
  practitionerName: string | null;
  publicKeyDigest: string;
  validFrom: number | null;
  validUntil: number | null;
  status: "pending" | "active" | "revoked";
  revocationReason: string | null;
};

export type ActiveVerificationProfile = {
  id: number;
  name: string;
  jurisdiction: string;
  policyVersion: string;
  status: string;
  reviewedAt: number | null;
  keys: ProfileSignerKey[];
};

export type ProfileAuthorization = {
  state: "unconfigured" | "signature_unverified" | "authorized" | "unknown_key" | "pending_key" | "revoked_key" | "expired_key" | "practitioner_mismatch";
  message: string;
  profileName?: string;
  practitionerName?: string | null;
  signerKeyDigest?: string;
  matchedKeyId?: number;
};

export function evaluateProfileAuthorization(profile: ActiveVerificationProfile | null | undefined, signature: SignatureResult, practitionerId: string | undefined, evaluatedAt = Date.now()): ProfileAuthorization {
  if (!profile) return { state: "unconfigured", message: "No active verification profile is configured; signer authority is unconfirmed.", signerKeyDigest: signature.signerKeyDigest };
  if (signature.state !== "verified" || !signature.signerKeyDigest) return { state: "signature_unverified", message: "Profile authorization is evaluated only after the Ed25519 signature verifies.", profileName: profile.name };
  const key = profile.keys.find(candidate => candidate.publicKeyDigest === signature.signerKeyDigest);
  if (!key) return { state: "unknown_key", message: `The verified signer is not registered in active profile ${profile.name}.`, profileName: profile.name };
  const keyReference = { signerKeyDigest: signature.signerKeyDigest, matchedKeyId: key.id };
  if (key.status === "pending") return { state: "pending_key", message: "The matching signer key is awaiting independent approval and is not yet authorized.", profileName: profile.name, practitionerName: key.practitionerName, ...keyReference };
  if (key.status === "revoked") return { state: "revoked_key", message: `The matching profile key was revoked${key.revocationReason ? `: ${key.revocationReason}` : "."}`, profileName: profile.name, practitionerName: key.practitionerName, ...keyReference };
  if ((key.validFrom !== null && evaluatedAt < key.validFrom) || (key.validUntil !== null && evaluatedAt > key.validUntil)) return { state: "expired_key", message: "The matching signer key is outside its approved validity window.", profileName: profile.name, practitionerName: key.practitionerName, ...keyReference };
  if (practitionerId && key.practitionerId !== practitionerId) return { state: "practitioner_mismatch", message: `The signer is registered to ${key.practitionerId}, not manifest practitioner ${practitionerId}.`, profileName: profile.name, practitionerName: key.practitionerName, ...keyReference };
  return { state: "authorized", message: `Signer is authorized by active profile ${profile.name} (${profile.policyVersion}).`, profileName: profile.name, practitionerName: key.practitionerName, ...keyReference };
}

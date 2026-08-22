import React from "react";
import type { ActiveVerificationProfile, ProfileAuthorization } from "@/lib/profileAuthorization";

export function VerificationProfilePresentation({ profile, authorization }: { profile: ActiveVerificationProfile | null | undefined; authorization: ProfileAuthorization }) {
  if (!profile) {
    return <section aria-label="Verification profile status" className="rounded-lg border border-dashed border-[#c9c8bc] bg-white/50 p-3 text-sm text-[#596561]">No active verification profile is configured. A valid signature will remain distinct from practitioner authority.</section>;
  }
  const activeKeys = profile.keys.filter(key => key.status === "active").length;
  const pendingKeys = profile.keys.filter(key => key.status === "pending").length;
  return <section aria-label="Verification profile status" className="rounded-lg border border-[#c9c8bc] bg-white/50 p-3"><p className="card-label">ACTIVE TRUST POLICY</p><p className="font-medium">{profile.name} · {profile.jurisdiction} · v{profile.policyVersion}</p><p className="mt-1 text-sm text-[#596561]">Authority verdict: <strong>{authorization.state.replaceAll("_", " ").toUpperCase()}</strong>. {authorization.message}</p><p className="mt-2 text-xs text-[#596561]">Active signer keys: {activeKeys}{pendingKeys ? ` · Pending approval: ${pendingKeys}` : ""}</p></section>;
}

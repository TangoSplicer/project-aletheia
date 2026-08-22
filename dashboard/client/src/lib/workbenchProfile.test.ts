import { describe, expect, it } from "vitest";
import { decryptVaultPayload, encryptVaultPayload } from "./vault";
import { buildWorkbenchInspectionRecord, buildWorkbenchVaultPayload } from "./workbenchProfile";

const input = {
  manifest: { case_id: "ALT-99", practitioner_id: "P-99" },
  ledgerEntries: [],
  signature: { state: "verified" as const, message: "Signature valid", signerKeyDigest: "a".repeat(64) },
  ledger: { state: "verified" as const, message: "Ledger valid", validEntries: 1, totalEntries: 1 },
  rootMatches: true,
  profile: undefined,
  authorization: { state: "unconfigured" as const, message: "No active profile", signerKeyDigest: "a".repeat(64) },
  profileHistory: [{ id: 4, name: "UK pilot", policyVersion: "2026.2", approvals: [{ id: 8, status: "approved", reviewerUserId: 9 }] }],
};

describe("profile-aware verification workbench composition", () => {
  it("passes the evaluated profile provenance into the actual encrypted vault payload", async () => {
    const payload = buildWorkbenchVaultPayload(input, new Date("2026-08-20T12:00:00.000Z"));
    const encrypted = await encryptVaultPayload(payload, "a passphrase with sufficient length");
    await expect(decryptVaultPayload<typeof payload>(encrypted.encryptedPayload, encrypted.encryptionSalt, encrypted.encryptionIv, "a passphrase with sufficient length")).resolves.toMatchObject({ verification: { profile: { authorization: { state: "unconfigured", signer_key_digest: "a".repeat(64) } }, profileHistory: [{ policyVersion: "2026.2", approvals: [{ reviewerUserId: 9 }] }] } });
  });

  it("passes the evaluated profile provenance into the actual inspection-record output", () => {
    const record = buildWorkbenchInspectionRecord({ ...input, fileName: "seal.json", ledgerName: "ledger.jsonl", structureValid: true, checks: [] }, new Date("2026-08-20T12:00:00.000Z"));
    expect(record.profile_authorization).toMatchObject({ authorization: { state: "unconfigured", signer_key_digest: "a".repeat(64) } });
    expect(record.verification_profile_history).toMatchObject([{ policyVersion: "2026.2", approvals: [{ status: "approved" }] }]);
    expect(JSON.stringify(record)).not.toContain("privateKey");
    expect(record.verification_scope).toContain("active-profile signer authorization");
  });
});

import { describe, expect, it } from "vitest";
import { auditVerificationFilename, buildAuditVerificationRecord, downloadAuditVerificationRecord } from "./auditExport";

const sampleCase = {
  caseRefHash: "a".repeat(64), contentDigest: "b".repeat(64), verificationStatus: "verified", createdAt: "2026-08-18T10:00:00.000Z", updatedAt: "2026-08-18T11:00:00.000Z",
  auditStatus: { state: "verified" as const, checkedEvents: 2, terminalHash: "c".repeat(64) },
};

describe("audit verification export", () => {
  it("builds a portable record without ciphertext, storage, or encryption fields", () => {
    const record = buildAuditVerificationRecord(sampleCase, new Date("2026-08-18T12:00:00.000Z"));
    expect(record).toMatchObject({ schema_version: "aletheia.audit-verification-record/v2", audit_chain: { verdict: "verified", checked_event_count: 2, terminal_hash: "c".repeat(64) }, verification_profile_history: [] });
    expect(record).not.toHaveProperty("encryptedPayload");
    expect(record).not.toHaveProperty("encryptionSalt");
    expect(record).not.toHaveProperty("encryptionIv");
    expect(record).not.toHaveProperty("encryptedPayloadUrl");
  });

  it("creates the expected case-specific filename", () => {
    expect(auditVerificationFilename(sampleCase.caseRefHash)).toBe(`aletheia-audit-${"a".repeat(12)}.json`);
  });

  it("includes policy versions, approval decisions, and public-key digests without private key material", () => {
    const record = buildAuditVerificationRecord({ ...sampleCase, profileHistory: [{ id: 3, name: "UK pilot", jurisdiction: "United Kingdom", policyVersion: "2026.2", status: "retired", reviewedAt: 1_776_000_000_000, createdAt: "2026-08-18T10:00:00.000Z", updatedAt: "2026-08-18T11:00:00.000Z", keys: [{ id: 9, practitionerId: "P-001", publicKeyDigest: "d".repeat(64), status: "active", validFrom: null, validUntil: null, revokedAt: null, approvalReference: "APP-1" }], approvals: [{ id: 12, profileKeyId: 9, approvalType: "signer_key_activation", status: "approved", makerUserId: 7, reviewerUserId: 8, reviewedAt: 1_776_000_000_000, createdAt: "2026-08-18T10:00:00.000Z" }] }] });
    expect(record.verification_profile_history).toHaveLength(1);
    expect(record.verification_profile_history[0]).toMatchObject({ policyVersion: "2026.2", keys: [{ publicKeyDigest: "d".repeat(64) }], approvals: [{ reviewerUserId: 8, status: "approved" }] });
    expect(JSON.stringify(record)).not.toContain("privateKey");
  });

  it("serializes and triggers a JSON download through the supplied browser adapter", async () => {
    const clicked: { href?: string; download?: string } = {};
    const revoked: string[] = [];
    const result = downloadAuditVerificationRecord(buildAuditVerificationRecord(sampleCase), "audit.json", { createObjectURL: () => "blob:verification", revokeObjectURL: url => revoked.push(url), createAnchor: () => ({ href: "", download: "", click: () => { clicked.href = "blob:verification"; clicked.download = "audit.json"; } }) });
    expect(clicked).toEqual({ href: "blob:verification", download: "audit.json" });
    expect(revoked).toEqual(["blob:verification"]);
    expect(await result.blob.text()).toContain("Aletheia audit-chain verification");
  });
});

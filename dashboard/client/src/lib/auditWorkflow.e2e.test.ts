/** End-to-end browser-contract test: verified audit metadata becomes a safe downloadable record. */
import { describe, expect, it } from "vitest";
import { AUDIT_GENESIS_HASH, createAuditEventHash, verifyAuditChain } from "../../../server/auditChain";
import { auditStatusPresentation } from "./auditStatus";
import { buildAuditVerificationRecord, downloadAuditVerificationRecord } from "./auditExport";

const TEST_KEY = "audit-workflow-e2e-test-key";

describe("audit verification export workflow", () => {
  it("verifies a linked audit chain, renders its verified state, and downloads a ciphertext-free JSON record", async () => {
    const unsigned = { userId: 33, caseId: 88, sequenceNumber: 1, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: "a".repeat(64), previousEventHash: AUDIT_GENESIS_HASH, eventTimestamp: 1_776_480_000_000 };
    const event = { ...unsigned, eventHash: createAuditEventHash(unsigned, TEST_KEY) };
    const verdict = verifyAuditChain([event], TEST_KEY);
    expect(verdict).toMatchObject({ valid: true, checkedEvents: 1 });
    if (!verdict.valid) throw new Error("Expected the audit workflow fixture to verify.");

    const status = { state: "verified" as const, checkedEvents: verdict.checkedEvents, terminalHash: verdict.terminalHash };
    expect(auditStatusPresentation(status)).toMatchObject({ label: "AUDIT VERIFIED", tone: "pass" });
    const record = buildAuditVerificationRecord({ caseRefHash: "b".repeat(64), contentDigest: unsigned.payloadDigest, verificationStatus: "verified", createdAt: "2026-08-18T10:00:00.000Z", updatedAt: "2026-08-18T10:00:01.000Z", auditStatus: status }, new Date("2026-08-18T10:00:02.000Z"));

    let clicked = false;
    const exported = downloadAuditVerificationRecord(record, "audit-workflow.json", { createObjectURL: () => "blob:audit-workflow", revokeObjectURL: url => expect(url).toBe("blob:audit-workflow"), createAnchor: () => ({ href: "", download: "", click: () => { clicked = true; } }) });
    const payload = JSON.parse(await exported.blob.text()) as Record<string, unknown>;
    expect(clicked).toBe(true);
    expect(payload).toMatchObject({ record_type: "Aletheia audit-chain verification", audit_chain: { verdict: "verified", checked_event_count: 1 } });
    expect(payload).not.toHaveProperty("encryptedPayload");
    expect(payload).not.toHaveProperty("encryptionSalt");
  });
});

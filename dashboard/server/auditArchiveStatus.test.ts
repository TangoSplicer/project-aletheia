import { describe, expect, it } from "vitest";
import { AUDIT_GENESIS_HASH, createAuditEventHash, type AuditChainEvent } from "./auditChain";
import { summarizeArchiveAuditStatus } from "./auditArchiveStatus";

const signingKey = "archive-summary-test-key";

function event(sequenceNumber: number, previousEventHash = AUDIT_GENESIS_HASH): AuditChainEvent {
  const unsigned = { userId: 2, caseId: 8, sequenceNumber, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: String(sequenceNumber).repeat(64).slice(0, 64), previousEventHash, eventTimestamp: 1_776_480_000_000 + sequenceNumber };
  return { ...unsigned, eventHash: createAuditEventHash(unsigned, signingKey) };
}

describe("archive audit status", () => {
  it("retains the complete audit event total when verification stops at a broken event", () => {
    const first = event(1);
    const second = { ...event(2, first.eventHash), payloadDigest: "f".repeat(64) };
    expect(summarizeArchiveAuditStatus([first, second], signingKey)).toMatchObject({ state: "attention", checkedEvents: 1, totalEvents: 2 });
  });
});

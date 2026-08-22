/** Backend unit tests for the server-keyed tamper-evident audit chain. */
import { describe, expect, it } from "vitest";
import { AUDIT_GENESIS_HASH, createAuditEventHash, verifyAuditChain, type AuditChainEvent } from "./auditChain";

const TEST_AUDIT_KEY = "test-only-audit-key";

function event(overrides: Partial<AuditChainEvent> = {}): AuditChainEvent {
  const unsigned = {
    userId: 7,
    caseId: 12,
    sequenceNumber: 1,
    eventType: "CASE_SAVED_ENCRYPTED",
    payloadDigest: "a".repeat(64),
    previousEventHash: AUDIT_GENESIS_HASH,
    eventTimestamp: 1_776_480_000_000,
    ...overrides,
  };
  return { ...unsigned, eventHash: createAuditEventHash(unsigned, TEST_AUDIT_KEY) };
}

describe("server audit chain", () => {
  it("accepts sequential HMAC-linked events", () => {
    const first = event();
    const second = event({ sequenceNumber: 2, previousEventHash: first.eventHash, payloadDigest: "b".repeat(64), eventTimestamp: first.eventTimestamp + 1 });
    expect(verifyAuditChain([first, second], TEST_AUDIT_KEY)).toMatchObject({ valid: true, checkedEvents: 2, terminalHash: second.eventHash });
  });

  it("rejects a payload digest modified after audit signing", () => {
    const first = event();
    const altered = { ...first, payloadDigest: "c".repeat(64) };
    expect(verifyAuditChain([altered], TEST_AUDIT_KEY)).toMatchObject({ valid: false, reason: expect.stringContaining("Event hash mismatch") });
  });

  it("rejects a broken predecessor link", () => {
    const first = event();
    const second = event({ sequenceNumber: 2, previousEventHash: "d".repeat(64), eventTimestamp: first.eventTimestamp + 1 });
    expect(verifyAuditChain([first, second], TEST_AUDIT_KEY)).toMatchObject({ valid: false, reason: expect.stringContaining("Previous hash mismatch") });
  });
});

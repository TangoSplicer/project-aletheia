import { describe, expect, it } from "vitest";
import { chronologicalAuditTimeline } from "./auditTimeline";

describe("audit timeline", () => {
  it("orders metadata events chronologically and adds a human-readable save label", () => {
    const timeline = chronologicalAuditTimeline([
      { id: 2, caseId: 9, sequenceNumber: 2, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: "b".repeat(64), eventTimestamp: 2000 },
      { id: 1, caseId: 9, sequenceNumber: 1, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: "a".repeat(64), eventTimestamp: 1000 },
    ]);
    expect(timeline.map(event => event.sequenceNumber)).toEqual([1, 2]);
    expect(timeline[0]).toMatchObject({ label: "Encrypted case vault saved" });
  });

  it("uses the sequence number as a deterministic tie-breaker", () => {
    const timeline = chronologicalAuditTimeline([
      { id: 2, caseId: 9, sequenceNumber: 2, eventType: "UNKNOWN", payloadDigest: "b".repeat(64), eventTimestamp: 1000 },
      { id: 1, caseId: 9, sequenceNumber: 1, eventType: "UNKNOWN", payloadDigest: "a".repeat(64), eventTimestamp: 1000 },
    ]);
    expect(timeline.map(event => event.sequenceNumber)).toEqual([1, 2]);
  });
});

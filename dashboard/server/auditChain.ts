/**
 * Server-owned audit-chain primitives. A domain-separated HMAC makes stored audit
 * metadata tamper-evident without exposing encrypted case content or vault keys.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

export const AUDIT_GENESIS_HASH = "0".repeat(64);

export type AuditChainEvent = {
  userId: number;
  caseId: number;
  sequenceNumber: number;
  eventType: string;
  payloadDigest: string;
  previousEventHash: string;
  eventHash: string;
  eventTimestamp: number;
};

function auditKey() {
  if (!ENV.cookieSecret) throw new Error("Audit-chain signing key is not configured");
  return `aletheia-audit-v1:${ENV.cookieSecret}`;
}

function canonicalAuditPayload(event: Omit<AuditChainEvent, "eventHash">): string {
  return [
    event.userId,
    event.caseId,
    event.sequenceNumber,
    event.eventType,
    event.payloadDigest,
    event.previousEventHash,
    event.eventTimestamp,
  ].join("|");
}

export function createAuditEventHash(event: Omit<AuditChainEvent, "eventHash">, signingKey = auditKey()): string {
  return createHmac("sha256", signingKey).update(canonicalAuditPayload(event), "utf8").digest("hex");
}

export function verifyAuditChain(events: AuditChainEvent[], signingKey = auditKey()) {
  let previousEventHash = AUDIT_GENESIS_HASH;
  let expectedSequence = 1;
  for (const event of events) {
    if (event.sequenceNumber !== expectedSequence) return { valid: false, checkedEvents: expectedSequence - 1, reason: `Sequence gap at event ${event.sequenceNumber}.` };
    if (event.previousEventHash !== previousEventHash) return { valid: false, checkedEvents: expectedSequence - 1, reason: `Previous hash mismatch at event ${event.sequenceNumber}.` };
    const { eventHash: _eventHash, ...unsignedEvent } = event;
    const expectedHash = createAuditEventHash(unsignedEvent, signingKey);
    const stored = Buffer.from(event.eventHash, "hex");
    const expected = Buffer.from(expectedHash, "hex");
    if (stored.length !== expected.length || !timingSafeEqual(stored, expected)) return { valid: false, checkedEvents: expectedSequence - 1, reason: `Event hash mismatch at event ${event.sequenceNumber}.` };
    previousEventHash = event.eventHash;
    expectedSequence += 1;
  }
  return { valid: true, checkedEvents: events.length, terminalHash: previousEventHash };
}

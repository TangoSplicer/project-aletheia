import { verifyAuditChain, type AuditChainEvent } from "./auditChain";

export type ArchiveAuditStatus = { state: "verified" | "attention" | "unavailable"; checkedEvents: number; totalEvents: number; terminalHash?: string; reason?: string };

/** Separates a complete event total from the verifier's checked-prefix count for archive display. */
export function summarizeArchiveAuditStatus(events: AuditChainEvent[], signingKey?: string): ArchiveAuditStatus {
  if (!events.length) return { state: "unavailable", checkedEvents: 0, totalEvents: 0, reason: "No audit events recorded for this case." };
  const verdict = verifyAuditChain(events, signingKey);
  return verdict.valid
    ? { state: "verified", checkedEvents: verdict.checkedEvents, totalEvents: events.length, terminalHash: verdict.terminalHash }
    : { state: "attention", checkedEvents: verdict.checkedEvents, totalEvents: events.length, reason: verdict.reason };
}

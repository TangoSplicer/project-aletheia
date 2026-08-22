/** Client-facing labels for server-authenticated audit-chain verdicts. */
export type AuditStatus = { state: "verified" | "attention" | "unavailable"; checkedEvents: number; totalEvents: number; reason?: string };

export function auditStatusPresentation(status: AuditStatus) {
  if (status.state === "verified") return { label: "AUDIT VERIFIED", tone: "pass" as const, title: `${status.checkedEvents} audit event${status.checkedEvents === 1 ? "" : "s"} verified` };
  if (status.state === "attention") return { label: "AUDIT REVIEW", tone: "alert" as const, title: status.reason ?? "The audit chain requires review." };
  return { label: "AUDIT PENDING", tone: "pending" as const, title: status.reason ?? "No audit events are available for this case." };
}

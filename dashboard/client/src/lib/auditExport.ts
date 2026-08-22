/**
 * Portable audit verification records intentionally omit ciphertext, vault parameters,
 * storage locations, and decrypted evidence. They are safe to share for integrity review.
 */
import type { AuditStatus } from "./auditStatus";

export type AuditExportCase = {
  caseRefHash: string;
  contentDigest: string;
  verificationStatus: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  auditStatus: AuditStatus & { terminalHash?: string };
  profileHistory?: AuditProfileVersion[];
};

export type AuditProfileVersion = {
  id: number;
  name: string;
  jurisdiction: string;
  policyVersion: string;
  status: "draft" | "active" | "retired";
  reviewedAt: Date | string | number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  keys: Array<{ id: number; practitionerId: string; publicKeyDigest: string; status: "pending" | "active" | "revoked"; validFrom: number | null; validUntil: number | null; revokedAt: number | null; approvalReference: string | null }>;
  approvals: Array<{ id: number; profileKeyId: number | null; approvalType: "profile_activation" | "signer_key_activation"; status: "pending" | "approved" | "rejected" | "cancelled"; makerUserId: number; reviewerUserId: number | null; reviewedAt: number | null; createdAt: Date | string }>;
};

export type AuditVerificationRecord = {
  schema_version: "aletheia.audit-verification-record/v2";
  record_type: "Aletheia audit-chain verification";
  exported_at: string;
  case: { reference_hash: string; content_digest: string; verification_status: string; created_at: string; updated_at: string };
  audit_chain: { verdict: AuditStatus["state"]; checked_event_count: number; terminal_hash: string | null; reason: string | null };
  verification_profile_history: AuditProfileVersion[];
  scope: string;
  exclusions: string[];
};

const toIso = (value: Date | string) => new Date(value).toISOString();

export function buildAuditVerificationRecord(caseRecord: AuditExportCase, exportedAt = new Date()): AuditVerificationRecord {
  return {
    schema_version: "aletheia.audit-verification-record/v2",
    record_type: "Aletheia audit-chain verification",
    exported_at: exportedAt.toISOString(),
    case: { reference_hash: caseRecord.caseRefHash, content_digest: caseRecord.contentDigest, verification_status: caseRecord.verificationStatus, created_at: toIso(caseRecord.createdAt), updated_at: toIso(caseRecord.updatedAt) },
    audit_chain: { verdict: caseRecord.auditStatus.state, checked_event_count: caseRecord.auditStatus.checkedEvents, terminal_hash: caseRecord.auditStatus.terminalHash ?? null, reason: caseRecord.auditStatus.reason ?? null },
    verification_profile_history: caseRecord.profileHistory ?? [],
    scope: "Owner-scoped server verification of the HMAC-linked Aletheia audit chain at export time, plus safe owner-scoped verification-profile version history.",
    exclusions: ["Encrypted case ciphertext", "Vault passphrase and encryption material", "Storage locations and signed retrieval URLs", "Manifest, ledger, and other plaintext evidence"],
  };
}

export function auditVerificationFilename(caseRefHash: string) {
  return `aletheia-audit-${caseRefHash.slice(0, 12)}.json`;
}

export type DownloadRuntime = { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void; createAnchor: () => Pick<HTMLAnchorElement, "href" | "download" | "click"> };

export function downloadAuditVerificationRecord(record: AuditVerificationRecord, fileName: string, runtime?: DownloadRuntime) {
  const browser = runtime ?? { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL, createAnchor: () => document.createElement("a") };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = browser.createObjectURL(blob);
  const anchor = browser.createAnchor();
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  browser.revokeObjectURL(url);
  return { fileName, blob };
}

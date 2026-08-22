export type ApprovalExportRecord = {
  id: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvalType: "profile_activation" | "signer_key_activation";
  userId: number;
  makerUserId: number;
  makerNote: string | null;
  reviewerUserId: number | null;
  reviewerNote: string | null;
  createdAt: Date | string | number;
  reviewedAt: Date | string | number | null;
  profileName: string;
  jurisdiction: string;
  policyVersion: string;
  practitionerId: string | null;
  practitionerName: string | null;
  publicKeyDigest: string | null;
};

export type ApprovalExportScope = "all" | "pending" | "completed";

export type DownloadRuntime = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => { href: string; download: string; click: () => void };
};

const CSV_HEADERS = ["approval_id", "status", "approval_type", "created_at_utc", "completed_at_utc", "owner_user_id", "maker_user_id", "reviewer_user_id", "profile_name", "jurisdiction", "policy_version", "practitioner_id", "practitioner_name", "public_key_digest", "maker_note", "reviewer_note"];

function formatTimestamp(value: Date | string | number | null) {
  if (!value) return "";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "" : timestamp.toISOString();
}

/** Quotes every CSV cell, removes line breaks, and neutralizes formula-leading text before spreadsheet import. */
export function escapeApprovalCsvCell(value: unknown) {
  const normalized = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  const formulaSafe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export function buildApprovalCsv(records: ApprovalExportRecord[]) {
  const rows = records.map(record => [record.id, record.status, record.approvalType, formatTimestamp(record.createdAt), formatTimestamp(record.reviewedAt), record.userId, record.makerUserId, record.reviewerUserId, record.profileName, record.jurisdiction, record.policyVersion, record.practitionerId, record.practitionerName, record.publicKeyDigest, record.makerNote, record.reviewerNote].map(escapeApprovalCsvCell).join(","));
  return `\uFEFF${CSV_HEADERS.join(",")}\n${rows.join("\n")}\n`;
}

export function approvalCsvFilename(scope: ApprovalExportScope, now = new Date()) {
  return `aletheia-approval-register-${scope}-${now.toISOString().slice(0, 10)}.csv`;
}

export function downloadApprovalCsv(records: ApprovalExportRecord[], scope: ApprovalExportScope, runtime: DownloadRuntime = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL, createAnchor: () => document.createElement("a") }) {
  const blob = new Blob([buildApprovalCsv(records)], { type: "text/csv;charset=utf-8" });
  const url = runtime.createObjectURL(blob);
  const anchor = runtime.createAnchor();
  anchor.href = url;
  anchor.download = approvalCsvFilename(scope);
  anchor.click();
  runtime.revokeObjectURL(url);
}

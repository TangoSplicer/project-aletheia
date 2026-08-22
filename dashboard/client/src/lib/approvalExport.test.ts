import { describe, expect, it, vi } from "vitest";
import { approvalCsvFilename, buildApprovalCsv, downloadApprovalCsv, escapeApprovalCsvCell } from "./approvalExport";

const record = {
  id: 17,
  status: "approved" as const,
  approvalType: "signer_key_activation" as const,
  userId: 52,
  makerUserId: 52,
  makerNote: "=HYPERLINK(\"https://unsafe.example\")\nsecond line",
  reviewerUserId: 8,
  reviewerNote: "Independent review complete",
  createdAt: "2026-08-20T12:00:00.000Z",
  reviewedAt: Date.UTC(2026, 7, 21, 13, 30),
  profileName: "North register",
  jurisdiction: "United Kingdom",
  policyVersion: "2026.3",
  practitionerId: "P-017",
  practitionerName: "Avery Practitioner",
  publicKeyDigest: "a".repeat(64),
};

describe("approval CSV export", () => {
  it("quotes and neutralizes CSV spreadsheet formulas without retaining line breaks", () => {
    expect(escapeApprovalCsvCell("=1+1\nnext")).toBe("\"'=1+1 next\"");
    const csv = buildApprovalCsv([record]);
    expect(csv).toContain("approval_id,status,approval_type");
    expect(csv).toContain("\"'=HYPERLINK(\"\"https://unsafe.example\"\") second line\"");
    expect(csv).toContain("\"2026-08-21T13:30:00.000Z\"");
    expect(csv).not.toContain("privateKey");
  });

  it("downloads the UTF-8 CSV using a stable scope and date filename", () => {
    const click = vi.fn();
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn(() => "blob:approval-export");
    const anchor = { href: "", download: "", click };
    downloadApprovalCsv([record], "completed", { createObjectURL, revokeObjectURL, createAnchor: () => anchor });
    expect(anchor.href).toBe("blob:approval-export");
    expect(anchor.download).toMatch(/^aletheia-approval-register-completed-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:approval-export");
    expect(approvalCsvFilename("pending", new Date("2026-08-21T00:00:00.000Z"))).toBe("aletheia-approval-register-pending-2026-08-21.csv");
  });
});

import { describe, expect, it } from "vitest";
import { buildInspectionRecord } from "./inspectionExport";
import { buildProfileProvenance } from "./profileProvenance";

describe("buildInspectionRecord", () => {
  it("includes the evaluated profile authority provenance in the generated inspection record", () => {
    const provenance = buildProfileProvenance(undefined, { state: "unconfigured", message: "No active profile", signerKeyDigest: "a".repeat(64) }, new Date("2026-08-20T12:00:00.000Z"));
    const record = buildInspectionRecord({ manifest: { case_id: "ALT-7" }, fileName: "seal.json", ledgerName: "", structureValid: true, signature: { state: "verified", message: "valid", signerKeyDigest: "a".repeat(64) }, profileAuthorization: provenance, ledger: { state: "verified", message: "valid", validEntries: 1, totalEntries: 1 }, rootMatches: true, ledgerEntries: [{}], checks: [], generatedAt: new Date("2026-08-20T12:00:00.000Z") });
    expect(record.profile_authorization).toEqual(provenance);
    expect(record.verification_scope).toContain("active-profile signer authorization");
  });
});

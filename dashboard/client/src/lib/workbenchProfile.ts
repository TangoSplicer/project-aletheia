import type { ActiveVerificationProfile, ProfileAuthorization } from "./profileAuthorization";
import { buildInspectionRecord } from "./inspectionExport";
import { buildProfileProvenance } from "./profileProvenance";
import type { LedgerEntry, LedgerResult, SealManifest, SignatureResult } from "./verification";

type CommonInput = {
  manifest: SealManifest;
  ledgerEntries: LedgerEntry[];
  signature: SignatureResult;
  ledger: LedgerResult;
  rootMatches: boolean;
  profile: ActiveVerificationProfile | null | undefined;
  authorization: ProfileAuthorization;
  profileHistory?: unknown[];
};

/** The exact profile-aware metadata object persisted in the browser-encrypted vault. */
export function buildWorkbenchVaultPayload(input: CommonInput, exportedAt = new Date()) {
  return {
    manifest: input.manifest,
    ledgerEntries: input.ledgerEntries,
    verification: {
      signature: input.signature,
      ledger: input.ledger,
      rootMatches: input.rootMatches,
      profile: buildProfileProvenance(input.profile, input.authorization, exportedAt),
      profileHistory: input.profileHistory ?? [],
      exportedAt: exportedAt.toISOString(),
    },
  };
}

/** The exact profile-aware inspection record produced by the verification workbench. */
export function buildWorkbenchInspectionRecord(input: CommonInput & { fileName: string; ledgerName: string; structureValid: boolean; checks: unknown[] }, generatedAt = new Date()) {
  return buildInspectionRecord({
    manifest: input.manifest,
    fileName: input.fileName,
    ledgerName: input.ledgerName,
    structureValid: input.structureValid,
    signature: input.signature,
    profileAuthorization: buildProfileProvenance(input.profile, input.authorization, generatedAt),
    profileHistory: input.profileHistory ?? [],
    ledger: input.ledger,
    rootMatches: input.rootMatches,
    ledgerEntries: input.ledgerEntries,
    checks: input.checks,
    generatedAt,
  });
}

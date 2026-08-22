import type { LedgerResult, SealManifest, SignatureResult } from "./verification";

export function buildInspectionRecord(input: {
  manifest: SealManifest;
  fileName: string;
  ledgerName: string;
  structureValid: boolean;
  signature: SignatureResult;
  profileAuthorization: unknown;
  profileHistory?: unknown[];
  ledger: LedgerResult;
  rootMatches: boolean;
  ledgerEntries: unknown[];
  checks: unknown[];
  generatedAt?: Date;
}) {
  return {
    generated_at: (input.generatedAt ?? new Date()).toISOString(),
    verification_scope: "Client-side structural validation, Web Crypto Ed25519 envelope verification, BLAKE3 JSONL/JSON ledger continuity recomputation, and active-profile signer authorization evaluation.",
    source_manifest: input.fileName,
    source_ledger: input.ledgerName || null,
    structure_valid: input.structureValid,
    signature: input.signature,
    profile_authorization: input.profileAuthorization,
    verification_profile_history: input.profileHistory ?? [],
    ledger: { ...input.ledger, root_matches_manifest: input.rootMatches, imported_entry_count: input.ledgerEntries.length },
    checks: input.checks,
    manifest: input.manifest,
  };
}

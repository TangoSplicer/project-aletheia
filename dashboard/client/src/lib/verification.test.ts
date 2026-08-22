/** Verification utility tests cover valid and tampered ledger states. */
import { describe, expect, it } from "vitest";
import { inspectLedger, ledgerHash, type LedgerEntry } from "./verification";

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  const base: LedgerEntry = {
    sequence_id: 1,
    timestamp: "2026-08-13T09:41:00Z",
    event_type: "PRACTITIONER_ATTESTATION",
    actor: "PRACTITIONER-UK-204",
    object_ref: "ALT-2026-0142",
    detail_hash: "payload",
    previous_hash: "GENESIS",
    entry_hash: "",
    ...overrides,
  };
  return { ...base, entry_hash: ledgerHash(base) };
}

describe("inspectLedger", () => {
  it("accepts a correctly chained BLAKE3 ledger", () => {
    const first = entry();
    const second = entry({ sequence_id: 2, previous_hash: first.entry_hash, event_type: "CASE_SEALED", detail_hash: first.entry_hash });
    const result = inspectLedger([first, second]);
    expect(result.state).toBe("verified");
    expect(result.rootHash).toBe(second.entry_hash);
  });

  it("rejects a tampered entry hash", () => {
    const first = { ...entry(), entry_hash: "tampered" };
    const result = inspectLedger([first]);
    expect(result.state).toBe("failed");
    expect(result.message).toContain("Entry-hash mismatch");
  });
});

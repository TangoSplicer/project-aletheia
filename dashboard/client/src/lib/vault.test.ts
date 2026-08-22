/** Tests prove the case-vault payload round trip and reject the wrong passphrase. */
import { describe, expect, it } from "vitest";
import { decryptVaultPayload, encryptVaultPayload, hashCaseReference, restoreVaultArtifact } from "./vault";
import { buildProfileProvenance } from "./profileProvenance";

describe("client vault", () => {
  it("round-trips a case payload through AES-GCM encryption", async () => {
    const encrypted = await encryptVaultPayload({ caseId: "ALT-42", entries: [1, 2] }, "a passphrase with sufficient length");
    await expect(decryptVaultPayload<{ caseId: string }>(encrypted.encryptedPayload, encrypted.encryptionSalt, encrypted.encryptionIv, "a passphrase with sufficient length")).resolves.toMatchObject({ caseId: "ALT-42" });
  });

  it("uses a stable one-way case reference hash", async () => {
    await expect(hashCaseReference("ALT-42")).resolves.toHaveLength(64);
  });

  it("persists the evaluated profile authorization inside the encrypted vault payload", async () => {
    const profile = buildProfileProvenance(undefined, { state: "unconfigured", message: "No active profile", signerKeyDigest: "a".repeat(64) }, new Date("2026-08-20T12:00:00.000Z"));
    const encrypted = await encryptVaultPayload({ manifest: { case_id: "ALT-42" }, ledgerEntries: [], verification: { profile } }, "a passphrase with sufficient length");
    await expect(decryptVaultPayload<{ verification: { profile: typeof profile } }>(encrypted.encryptedPayload, encrypted.encryptionSalt, encrypted.encryptionIv, "a passphrase with sufficient length")).resolves.toMatchObject({ verification: { profile: { authorization: { state: "unconfigured", signer_key_digest: "a".repeat(64) } } } });
  });

  it("restores a fetched ciphertext artifact only after local decryption and digest verification", async () => {
    const original = { manifest: { case_id: "ALT-42" }, ledgerEntries: [], verification: { restoredAt: "2026-08-17T20:00:00Z" } };
    const encrypted = await encryptVaultPayload(original, "a passphrase with sufficient length");
    const request = async () => new Response(encrypted.encryptedPayload, { status: 200 });
    await expect(restoreVaultArtifact("/manus-storage/case.bin", encrypted.encryptionSalt, encrypted.encryptionIv, encrypted.contentDigest, "a passphrase with sufficient length", request)).resolves.toEqual(original);
  });

  it("rejects a wrong vault passphrase without returning a restored payload", async () => {
    const encrypted = await encryptVaultPayload({ manifest: { case_id: "ALT-42" }, ledgerEntries: [] }, "a passphrase with sufficient length");
    const request = async () => new Response(encrypted.encryptedPayload, { status: 200 });
    await expect(restoreVaultArtifact("/manus-storage/case.bin", encrypted.encryptionSalt, encrypted.encryptionIv, encrypted.contentDigest, "wrong vault passphrase", request)).rejects.toBeDefined();
  });
});

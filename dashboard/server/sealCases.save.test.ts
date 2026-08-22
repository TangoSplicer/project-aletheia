/** End-to-end procedure contract test for the encrypted storage and audit persistence handoff. */
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const saveEncryptedSealCaseWithAudit = vi.fn();
const storagePut = vi.fn();

vi.mock("./db", () => ({
  getEncryptedSealCase: vi.fn(),
  listSealAuditEvents: vi.fn(),
  listSealCases: vi.fn(),
  listSealCasesWithAuditStatus: vi.fn(),
  saveEncryptedSealCaseWithAudit,
  verifySealAuditChainForCase: vi.fn(),
}));

vi.mock("./storage", () => ({
  storageGet: vi.fn(),
  storagePut,
}));

const { appRouter } = await import("./routers");

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 303, openId: "case-owner", email: null, name: "Case Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const validInput = {
  caseRefHash: "a".repeat(64),
  encryptedPayload: Buffer.alloc(17, 9).toString("base64"),
  encryptionSalt: Buffer.alloc(16, 2).toString("base64"),
  encryptionIv: Buffer.alloc(12, 3).toString("base64"),
  contentDigest: "b".repeat(64),
  verificationStatus: "verified" as const,
};

describe("sealCases.save persistence flow", () => {
  it("writes ciphertext to storage, then persists its storage key with an audit event", async () => {
    storagePut.mockResolvedValueOnce({ key: "seal-vault/303/object.bin", url: "/manus-storage/seal-vault/303/object.bin" });
    saveEncryptedSealCaseWithAudit.mockResolvedValueOnce({
      record: { id: 42, updatedAt: new Date("2026-08-17T20:00:00Z") },
      auditEvent: { sequenceNumber: 1, eventHash: "c".repeat(64) },
    });
    const result = await appRouter.createCaller(authenticatedContext()).sealCases.save(validInput);
    expect(storagePut).toHaveBeenCalledWith(`seal-vault/303/${validInput.caseRefHash}.bin`, expect.any(Buffer));
    expect(saveEncryptedSealCaseWithAudit).toHaveBeenCalledWith(303, expect.objectContaining({ encryptedPayload: "seal-vault/303/object.bin", contentDigest: validInput.contentDigest }));
    expect(result).toMatchObject({ id: 42, auditSequence: 1, auditHash: "c".repeat(64) });
  });

  it("rejects invalid AES-GCM material before touching object storage", async () => {
    await expect(appRouter.createCaller(authenticatedContext()).sealCases.save({ ...validInput, encryptionIv: Buffer.alloc(11).toString("base64") })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storagePut).toHaveBeenCalledTimes(1);
  });
});

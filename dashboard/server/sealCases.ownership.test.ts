/** Protected procedures must propagate the authenticated owner ID to every case and audit lookup. */
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const listSealCases = vi.fn();
const listSealCasesWithAuditStatus = vi.fn();
const listSealAuditEvents = vi.fn();
const getEncryptedSealCase = vi.fn();
const verifySealAuditChainForCase = vi.fn();

vi.mock("./db", () => ({
  getEncryptedSealCase,
  listSealAuditEvents,
  listSealCases,
  listSealCasesWithAuditStatus,
  saveEncryptedSealCaseWithAudit: vi.fn(),
  verifySealAuditChainForCase,
}));

vi.mock("./storage", () => ({ storageGet: vi.fn(), storagePut: vi.fn() }));

const { appRouter } = await import("./routers");

function authenticatedContext(userId: number): TrpcContext {
  return { user: { id: userId, openId: `user-${userId}`, email: null, name: `User ${userId}`, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("sealCases ownership isolation", () => {
  it("passes only the authenticated owner ID when listing case metadata", async () => {
    listSealCases.mockResolvedValueOnce([]);
    await appRouter.createCaller(authenticatedContext(202)).sealCases.list();
    expect(listSealCases).toHaveBeenLastCalledWith(202);
  });

  it("passes only the authenticated owner ID when calculating archive audit statuses", async () => {
    listSealCasesWithAuditStatus.mockResolvedValueOnce([]);
    await appRouter.createCaller(authenticatedContext(202)).sealCases.archive();
    expect(listSealCasesWithAuditStatus).toHaveBeenLastCalledWith(202);
  });

  it("passes the authenticated owner and a bounded cursor page to the audit history lookup", async () => {
    const cursor = { eventTimestamp: 1_776_480_000_000, id: 17 };
    listSealAuditEvents.mockResolvedValueOnce({ events: [], nextCursor: undefined });
    await appRouter.createCaller(authenticatedContext(202)).sealCases.audit({ limit: 10, cursor, eventType: "CASE_SAVED_ENCRYPTED", fromTimestamp: 1_776_480_000_000 });
    expect(listSealAuditEvents).toHaveBeenLastCalledWith(202, { limit: 10, cursor, eventType: "CASE_SAVED_ENCRYPTED", fromTimestamp: 1_776_480_000_000 });
  });

  it("returns NOT_FOUND rather than another owner's ciphertext reference", async () => {
    getEncryptedSealCase.mockResolvedValueOnce(undefined);
    await expect(appRouter.createCaller(authenticatedContext(202)).sealCases.get({ id: 77 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(getEncryptedSealCase).toHaveBeenLastCalledWith(202, 77);
  });

  it("returns NOT_FOUND rather than another owner's audit-chain verdict", async () => {
    verifySealAuditChainForCase.mockResolvedValueOnce(undefined);
    await expect(appRouter.createCaller(authenticatedContext(202)).sealCases.verifyAudit({ id: 77 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(verifySealAuditChainForCase).toHaveBeenLastCalledWith(202, 77);
  });
});

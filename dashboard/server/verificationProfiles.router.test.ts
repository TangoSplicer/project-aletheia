import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const addVerificationProfileKey = vi.fn();
const countActionablePendingProfileApprovals = vi.fn();
const createVerificationProfile = vi.fn();
const decideProfileApproval = vi.fn();
const getActiveVerificationProfile = vi.fn();
const listActionablePendingProfileApprovals = vi.fn();
const listApprovalExportRecords = vi.fn();
const listPendingProfileApprovals = vi.fn();
const listProfileApprovalRequests = vi.fn();
const listVerificationProfileHistory = vi.fn();
const listVerificationProfiles = vi.fn();
const markVerificationProfileReviewed = vi.fn();
const retireVerificationProfile = vi.fn();
const revokeVerificationProfileKey = vi.fn();

vi.mock("./db", () => ({
  addVerificationProfileKey,
  countActionablePendingProfileApprovals,
  createVerificationProfile,
  decideProfileApproval,
  getActiveVerificationProfile,
  getEncryptedSealCase: vi.fn(),
  listSealAuditEvents: vi.fn(),
  listSealCases: vi.fn(),
  listSealCasesWithAuditStatus: vi.fn(),
  listPendingProfileApprovals,
  listActionablePendingProfileApprovals,
  listApprovalExportRecords,
  listProfileApprovalRequests,
  listVerificationProfileHistory,
  listVerificationProfiles,
  markVerificationProfileReviewed,
  retireVerificationProfile,
  revokeVerificationProfileKey,
  saveEncryptedSealCaseWithAudit: vi.fn(),
  verifySealAuditChainForCase: vi.fn(),
}));
vi.mock("./storage", () => ({ storageGet: vi.fn(), storagePut: vi.fn() }));

const { appRouter } = await import("./routers");

function authenticatedContext(userId: number, role: "user" | "admin" = "user"): TrpcContext {
  return { user: { id: userId, openId: `user-${userId}`, email: null, name: `User ${userId}`, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("verificationProfiles protected router", () => {
  it("scopes current, list, and creation operations to the authenticated owner", async () => {
    getActiveVerificationProfile.mockResolvedValueOnce(undefined);
    listVerificationProfiles.mockResolvedValueOnce([]);
    createVerificationProfile.mockResolvedValueOnce({ id: 5 });
    const caller = appRouter.createCaller(authenticatedContext(52));
    await caller.verificationProfiles.current();
    await caller.verificationProfiles.list();
    await caller.verificationProfiles.create({ name: "Pilot", jurisdiction: "UK", policyVersion: "2026.1" });
    expect(getActiveVerificationProfile).toHaveBeenLastCalledWith(52);
    expect(listVerificationProfiles).toHaveBeenLastCalledWith(52);
    expect(createVerificationProfile).toHaveBeenLastCalledWith(52, { name: "Pilot", jurisdiction: "UK", policyVersion: "2026.1" });
  });

  it("normalizes a registered key, forwards the authenticated owner, and hides profiles owned by another user", async () => {
    const key = Buffer.alloc(32, 4).toString("base64url");
    addVerificationProfileKey.mockResolvedValueOnce(undefined);
    await expect(appRouter.createCaller(authenticatedContext(52)).verificationProfiles.addKey({ profileId: 99, practitionerId: "P-99", publicKey: key })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(addVerificationProfileKey).toHaveBeenLastCalledWith(52, expect.objectContaining({ profileId: 99, practitionerId: "P-99", publicKeyDigest: expect.stringMatching(/^[a-f0-9]{64}$/) }));
  });

  it("requires an explicit revocation reason and scopes revocation to the authenticated owner", async () => {
    revokeVerificationProfileKey.mockResolvedValueOnce(false);
    await expect(appRouter.createCaller(authenticatedContext(52)).verificationProfiles.revokeKey({ keyId: 8, reason: "Compromised during ceremony" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(revokeVerificationProfileKey).toHaveBeenLastCalledWith(52, 8, "Compromised during ceremony");
  });

  it("records profile review and retirement only for the authenticated owner’s active profile", async () => {
    markVerificationProfileReviewed.mockResolvedValueOnce(true);
    retireVerificationProfile.mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(authenticatedContext(52));
    await expect(caller.verificationProfiles.markReviewed({ profileId: 6, reviewedAt: 1_777_000_000_000 })).resolves.toEqual({ reviewed: true });
    await expect(caller.verificationProfiles.retire({ profileId: 6 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(markVerificationProfileReviewed).toHaveBeenLastCalledWith(52, 6, 1_777_000_000_000);
    expect(retireVerificationProfile).toHaveBeenLastCalledWith(52, 6);
  });

  it("limits approval-history requests to the owner and requires an administrator for the global pending queue", async () => {
    listProfileApprovalRequests.mockResolvedValueOnce([]);
    listVerificationProfileHistory.mockResolvedValueOnce([]);
    const userCaller = appRouter.createCaller(authenticatedContext(52));
    await userCaller.verificationProfiles.approvalRequests();
    await userCaller.verificationProfiles.history();
    await expect(userCaller.verificationProfiles.pendingApprovals()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listProfileApprovalRequests).toHaveBeenLastCalledWith(52);
    expect(listVerificationProfileHistory).toHaveBeenLastCalledWith(52);
  });

  it("allows an administrator to decide a pending request but prevents maker self-approval at the database boundary", async () => {
    listPendingProfileApprovals.mockResolvedValueOnce([]);
    decideProfileApproval.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: 11, status: "approved" });
    const adminCaller = appRouter.createCaller(authenticatedContext(8, "admin"));
    await adminCaller.verificationProfiles.pendingApprovals();
    await expect(adminCaller.verificationProfiles.decideApproval({ approvalId: 11, decision: "approved", reviewerNote: "Independent review complete" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminCaller.verificationProfiles.decideApproval({ approvalId: 12, decision: "approved", reviewerNote: "Independent review complete" })).resolves.toMatchObject({ id: 11, status: "approved" });
    expect(decideProfileApproval).toHaveBeenNthCalledWith(1, 8, 11, "approved", "Independent review complete");
    expect(decideProfileApproval).toHaveBeenNthCalledWith(2, 8, 12, "approved", "Independent review complete");
  });

  it("forwards an independently recorded rejection without activating the requested change", async () => {
    decideProfileApproval.mockResolvedValueOnce({ id: 14, status: "rejected" });
    const adminCaller = appRouter.createCaller(authenticatedContext(8, "admin"));
    await expect(adminCaller.verificationProfiles.decideApproval({ approvalId: 14, decision: "rejected", reviewerNote: "Policy evidence is incomplete" })).resolves.toMatchObject({ id: 14, status: "rejected" });
    expect(decideProfileApproval).toHaveBeenLastCalledWith(8, 14, "rejected", "Policy evidence is incomplete");
  });

  it("limits the scalable approval queue and badge summary to an independent administrator", async () => {
    listActionablePendingProfileApprovals.mockResolvedValueOnce({ approvals: [], nextCursor: undefined });
    countActionablePendingProfileApprovals.mockResolvedValueOnce({ count: 2 });
    const userCaller = appRouter.createCaller(authenticatedContext(52));
    await expect(userCaller.verificationProfiles.approvalQueue({ limit: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.verificationProfiles.approvalSummary()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const adminCaller = appRouter.createCaller(authenticatedContext(8, "admin"));
    await adminCaller.verificationProfiles.approvalQueue({ limit: 12, approvalType: "profile_activation" });
    await adminCaller.verificationProfiles.approvalSummary();
    expect(listActionablePendingProfileApprovals).toHaveBeenCalledWith(8, { limit: 12, approvalType: "profile_activation" });
    expect(countActionablePendingProfileApprovals).toHaveBeenCalledWith(8);
  });

  it("forwards an administrator queue search and lifecycle-status filter to the scoped query", async () => {
    listActionablePendingProfileApprovals.mockResolvedValueOnce({ approvals: [], nextCursor: undefined });
    const adminCaller = appRouter.createCaller(authenticatedContext(8, "admin"));
    await adminCaller.verificationProfiles.approvalQueue({ limit: 12, status: "completed", search: "North register" });
    expect(listActionablePendingProfileApprovals).toHaveBeenLastCalledWith(8, { limit: 12, status: "completed", search: "North register" });
  });

  it("limits CSV register export to administrators and forwards the requested lifecycle scope", async () => {
    listApprovalExportRecords.mockResolvedValueOnce({ records: [], hasMore: false });
    const userCaller = appRouter.createCaller(authenticatedContext(52));
    await expect(userCaller.verificationProfiles.approvalExport({ status: "all" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const adminCaller = appRouter.createCaller(authenticatedContext(8, "admin"));
    await expect(adminCaller.verificationProfiles.approvalExport({ status: "completed" })).resolves.toEqual({ records: [], hasMore: false });
    expect(listApprovalExportRecords).toHaveBeenCalledWith("completed");
  });
});

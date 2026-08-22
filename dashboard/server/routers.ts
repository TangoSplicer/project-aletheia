import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { addVerificationProfileKey, countActionablePendingProfileApprovals, createVerificationProfile, decideProfileApproval, getActiveVerificationProfile, getEncryptedSealCase, listActionablePendingProfileApprovals, listApprovalExportRecords, listPendingProfileApprovals, listProfileApprovalRequests, listSealAuditEvents, listSealCases, listSealCasesWithAuditStatus, listVerificationProfileHistory, listVerificationProfiles, markVerificationProfileReviewed, retireVerificationProfile, revokeVerificationProfileKey, saveEncryptedSealCaseWithAudit, verifySealAuditChainForCase } from "./db";
import { normalizeEd25519PublicKey } from "./profileKeys";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { assertEncryptionMaterial, decodeCiphertext } from "./sealCases";
import { storageGet, storagePut } from "./storage";

const hash = z.string().regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 hex digest.");
const base64 = z.string().min(1).max(2_000_000);
const encryptedCaseInput = z.object({
  caseRefHash: hash,
  encryptedPayload: base64,
  encryptionSalt: z.string().min(12).max(256),
  encryptionIv: z.string().min(12).max(256),
  contentDigest: hash,
  verificationStatus: z.enum(["verified", "review_required"]),
});
const auditPageInput = z.object({
  limit: z.number().int().min(5).max(25).default(10),
  cursor: z.object({ eventTimestamp: z.number().int().nonnegative(), id: z.number().int().positive() }).optional(),
  eventType: z.string().min(1).max(80).optional(),
  fromTimestamp: z.number().int().nonnegative().optional(),
}).default({ limit: 10 });
const profileInput = z.object({
  name: z.string().trim().min(2).max(120),
  jurisdiction: z.string().trim().min(2).max(120),
  policyVersion: z.string().trim().min(1).max(64),
  reviewedAt: z.number().int().nonnegative().optional(),
  makerNote: z.string().trim().min(3).max(255).optional(),
});
const profileKeyInput = z.object({
  profileId: z.number().int().positive(),
  practitionerId: z.string().trim().min(1).max(160),
  practitionerName: z.string().trim().min(1).max(160).optional(),
  publicKey: z.string().trim().min(40).max(128),
  validFrom: z.number().int().nonnegative().optional(),
  validUntil: z.number().int().nonnegative().optional(),
  approvalReference: z.string().trim().min(1).max(255).optional(),
  makerNote: z.string().trim().min(3).max(255).optional(),
}).superRefine((value, context) => {
  if (value.validFrom && value.validUntil && value.validUntil <= value.validFrom) context.addIssue({ code: "custom", path: ["validUntil"], message: "The key expiry must be after the validity start." });
});
const approvalQueueInput = z.object({
  limit: z.number().int().min(5).max(25).default(12),
  cursor: z.object({ createdAt: z.number().int().nonnegative(), id: z.number().int().positive() }).optional(),
  approvalType: z.enum(["profile_activation", "signer_key_activation"]).optional(),
  status: z.enum(["all", "pending", "completed", "approved", "rejected", "cancelled"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
}).default({ limit: 12 });
const approvalExportInput = z.object({ status: z.enum(["all", "pending", "completed"]).default("all") }).default({ status: "all" });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  verificationProfiles: router({
    current: protectedProcedure.query(({ ctx }) => getActiveVerificationProfile(ctx.user.id)),
    list: protectedProcedure.query(({ ctx }) => listVerificationProfiles(ctx.user.id)),
    history: protectedProcedure.query(({ ctx }) => listVerificationProfileHistory(ctx.user.id)),
    approvalRequests: protectedProcedure.query(({ ctx }) => listProfileApprovalRequests(ctx.user.id)),
    pendingApprovals: adminProcedure.query(() => listPendingProfileApprovals()),
    approvalQueue: adminProcedure.input(approvalQueueInput).query(({ ctx, input }) => listActionablePendingProfileApprovals(ctx.user.id, input)),
    approvalSummary: adminProcedure.query(({ ctx }) => countActionablePendingProfileApprovals(ctx.user.id)),
    approvalExport: adminProcedure.input(approvalExportInput).query(({ input }) => listApprovalExportRecords(input.status)),
    create: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => createVerificationProfile(ctx.user.id, input)),
    addKey: protectedProcedure.input(profileKeyInput).mutation(async ({ ctx, input }) => {
      let normalized: ReturnType<typeof normalizeEd25519PublicKey>;
      try {
        normalized = normalizeEd25519PublicKey(input.publicKey);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid Ed25519 public key." });
      }
      try {
        const record = await addVerificationProfileKey(ctx.user.id, { ...input, ...normalized });
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Verification profile not found." });
        return record;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "CONFLICT", message: "This public key is already registered for the profile or could not be saved." });
      }
    }),
    revokeKey: protectedProcedure.input(z.object({ keyId: z.number().int().positive(), reason: z.string().trim().min(3).max(255) })).mutation(async ({ ctx, input }) => {
      const revoked = await revokeVerificationProfileKey(ctx.user.id, input.keyId, input.reason);
      if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "Active signer key not found." });
      return { revoked: true } as const;
    }),
    markReviewed: protectedProcedure.input(z.object({ profileId: z.number().int().positive(), reviewedAt: z.number().int().nonnegative().optional() })).mutation(async ({ ctx, input }) => {
      const updated = await markVerificationProfileReviewed(ctx.user.id, input.profileId, input.reviewedAt);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Active verification profile not found." });
      return { reviewed: true } as const;
    }),
    retire: protectedProcedure.input(z.object({ profileId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const retired = await retireVerificationProfile(ctx.user.id, input.profileId);
      if (!retired) throw new TRPCError({ code: "NOT_FOUND", message: "Active verification profile not found." });
      return { retired: true } as const;
    }),
    decideApproval: adminProcedure.input(z.object({ approvalId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewerNote: z.string().trim().min(3).max(255) })).mutation(async ({ ctx, input }) => {
      const result = await decideProfileApproval(ctx.user.id, input.approvalId, input.decision, input.reviewerNote);
      if (!result) throw new TRPCError({ code: "FORBIDDEN", message: "A separate reviewer must decide a pending approval." });
      return result;
    }),
  }),
  sealCases: router({
    list: protectedProcedure.query(({ ctx }) => listSealCases(ctx.user.id)),
    archive: protectedProcedure.query(({ ctx }) => listSealCasesWithAuditStatus(ctx.user.id)),
    audit: protectedProcedure.input(auditPageInput).query(({ ctx, input }) => listSealAuditEvents(ctx.user.id, input)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const record = await getEncryptedSealCase(ctx.user.id, input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Case not found." });
      const artifact = await storageGet(record.encryptedPayload);
      const { encryptedPayload: _storageKey, ...safeRecord } = record;
      return { ...safeRecord, encryptedPayloadUrl: artifact.url };
    }),
    verifyAudit: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const result = await verifySealAuditChainForCase(ctx.user.id, input.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Case not found." });
      return result;
    }),
    save: protectedProcedure.input(encryptedCaseInput).mutation(async ({ ctx, input }) => {
      assertEncryptionMaterial(input.encryptionSalt, input.encryptionIv);
      const ciphertext = decodeCiphertext(input.encryptedPayload);
      const artifact = await storagePut(`seal-vault/${ctx.user.id}/${input.caseRefHash}.bin`, ciphertext);
      try {
        const saved = await saveEncryptedSealCaseWithAudit(ctx.user.id, { ...input, encryptedPayload: artifact.key });
        return { id: saved.record.id, updatedAt: saved.record.updatedAt, auditSequence: saved.auditEvent.sequenceNumber, auditHash: saved.auditEvent.eventHash };
      } catch (error) {
        console.error("[SealCases] Encrypted case save failed", { userId: ctx.user.id, caseRefHash: input.caseRefHash });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The encrypted case could not be persisted." });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;

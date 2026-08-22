import { and, asc, count, desc, eq, gt, gte, inArray, like, lt, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, sealAuditEvents, sealCases, users, verificationProfileApprovals, verificationProfileKeys, verificationProfiles } from "../drizzle/schema";
import { AUDIT_GENESIS_HASH, createAuditEventHash, type AuditChainEvent, verifyAuditChain } from "./auditChain";
import { summarizeArchiveAuditStatus } from "./auditArchiveStatus";
import { filterAuditEvents, paginateAuditEvents } from "./auditPagination";
import { type ApprovalQueueCursor as StableApprovalQueueCursor } from "./approvalQueuePagination";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the database connection so type-checking and unit tests remain isolated.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type EncryptedCaseInput = {
  caseRefHash: string;
  encryptedPayload: string;
  encryptionSalt: string;
  encryptionIv: string;
  contentDigest: string;
  verificationStatus: "verified" | "review_required";
};

export type VerificationProfileInput = { name: string; jurisdiction: string; policyVersion: string; reviewedAt?: number; makerNote?: string };
export type VerificationProfileKeyInput = { profileId: number; practitionerId: string; practitionerName?: string; publicKey: string; publicKeyDigest: string; validFrom?: number; validUntil?: number; approvalReference?: string; makerNote?: string };

export async function getActiveVerificationProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const profiles = await db.select().from(verificationProfiles).where(and(eq(verificationProfiles.userId, userId), eq(verificationProfiles.status, "active"))).orderBy(desc(verificationProfiles.updatedAt)).limit(1);
  const profile = profiles[0];
  if (!profile) return undefined;
  const keys = await db.select({ id: verificationProfileKeys.id, practitionerId: verificationProfileKeys.practitionerId, practitionerName: verificationProfileKeys.practitionerName, publicKeyDigest: verificationProfileKeys.publicKeyDigest, validFrom: verificationProfileKeys.validFrom, validUntil: verificationProfileKeys.validUntil, status: verificationProfileKeys.status, revocationReason: verificationProfileKeys.revocationReason }).from(verificationProfileKeys).where(and(eq(verificationProfileKeys.userId, userId), eq(verificationProfileKeys.profileId, profile.id))).orderBy(asc(verificationProfileKeys.practitionerId));
  return { ...profile, keys };
}

export async function listVerificationProfiles(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select().from(verificationProfiles).where(eq(verificationProfiles.userId, userId)).orderBy(desc(verificationProfiles.updatedAt));
}

/** Safe owner-scoped policy history for inclusion in case/audit exports; never contains private key material. */
export async function listVerificationProfileHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const profiles = await listVerificationProfiles(userId);
  if (!profiles.length) return [];
  const profileIds = profiles.map(profile => profile.id);
  const [keys, approvals] = await Promise.all([
    db.select({ id: verificationProfileKeys.id, profileId: verificationProfileKeys.profileId, practitionerId: verificationProfileKeys.practitionerId, publicKeyDigest: verificationProfileKeys.publicKeyDigest, status: verificationProfileKeys.status, validFrom: verificationProfileKeys.validFrom, validUntil: verificationProfileKeys.validUntil, revokedAt: verificationProfileKeys.revokedAt, approvalReference: verificationProfileKeys.approvalReference }).from(verificationProfileKeys).where(and(eq(verificationProfileKeys.userId, userId), inArray(verificationProfileKeys.profileId, profileIds))).orderBy(asc(verificationProfileKeys.profileId), asc(verificationProfileKeys.id)),
    db.select({ id: verificationProfileApprovals.id, profileId: verificationProfileApprovals.profileId, profileKeyId: verificationProfileApprovals.profileKeyId, approvalType: verificationProfileApprovals.approvalType, status: verificationProfileApprovals.status, makerUserId: verificationProfileApprovals.makerUserId, reviewerUserId: verificationProfileApprovals.reviewerUserId, reviewedAt: verificationProfileApprovals.reviewedAt, createdAt: verificationProfileApprovals.createdAt }).from(verificationProfileApprovals).where(and(eq(verificationProfileApprovals.userId, userId), inArray(verificationProfileApprovals.profileId, profileIds))).orderBy(asc(verificationProfileApprovals.id)),
  ]);
  return profiles.map(profile => ({ ...profile, keys: keys.filter(key => key.profileId === profile.id), approvals: approvals.filter(approval => approval.profileId === profile.id) }));
}

export async function createVerificationProfile(userId: number, input: VerificationProfileInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.transaction(async tx => {
    await tx.insert(verificationProfiles).values({ userId, name: input.name, jurisdiction: input.jurisdiction, policyVersion: input.policyVersion, status: "draft", reviewedAt: input.reviewedAt ?? Date.now() });
    const records = await tx.select().from(verificationProfiles).where(and(eq(verificationProfiles.userId, userId), eq(verificationProfiles.status, "draft"), eq(verificationProfiles.name, input.name), eq(verificationProfiles.policyVersion, input.policyVersion))).orderBy(desc(verificationProfiles.id)).limit(1);
    if (!records[0]) throw new Error("Verification profile persistence did not return a record");
    await tx.insert(verificationProfileApprovals).values({ userId, profileId: records[0].id, approvalType: "profile_activation", makerUserId: userId, makerNote: input.makerNote ?? null });
    return records[0];
  });
}

export async function addVerificationProfileKey(userId: number, input: VerificationProfileKeyInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const profile = await db.select({ id: verificationProfiles.id }).from(verificationProfiles).where(and(eq(verificationProfiles.id, input.profileId), eq(verificationProfiles.userId, userId))).limit(1);
  if (!profile[0]) return undefined;
  await db.insert(verificationProfileKeys).values({ userId, profileId: input.profileId, practitionerId: input.practitionerId, practitionerName: input.practitionerName ?? null, publicKey: input.publicKey, publicKeyDigest: input.publicKeyDigest, validFrom: input.validFrom ?? null, validUntil: input.validUntil ?? null, approvalReference: input.approvalReference ?? null, status: "pending" });
  const records = await db.select().from(verificationProfileKeys).where(and(eq(verificationProfileKeys.userId, userId), eq(verificationProfileKeys.profileId, input.profileId), eq(verificationProfileKeys.publicKeyDigest, input.publicKeyDigest))).limit(1);
  if (records[0]) await db.insert(verificationProfileApprovals).values({ userId, profileId: input.profileId, profileKeyId: records[0].id, approvalType: "signer_key_activation", makerUserId: userId, makerNote: input.makerNote ?? null });
  return records[0];
}

export async function listProfileApprovalRequests(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select().from(verificationProfileApprovals).where(eq(verificationProfileApprovals.userId, userId)).orderBy(desc(verificationProfileApprovals.updatedAt));
}

export async function listPendingProfileApprovals() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select({ id: verificationProfileApprovals.id, userId: verificationProfileApprovals.userId, profileId: verificationProfileApprovals.profileId, profileKeyId: verificationProfileApprovals.profileKeyId, approvalType: verificationProfileApprovals.approvalType, makerUserId: verificationProfileApprovals.makerUserId, makerNote: verificationProfileApprovals.makerNote, createdAt: verificationProfileApprovals.createdAt, profileName: verificationProfiles.name, jurisdiction: verificationProfiles.jurisdiction, policyVersion: verificationProfiles.policyVersion, practitionerId: verificationProfileKeys.practitionerId, practitionerName: verificationProfileKeys.practitionerName, publicKeyDigest: verificationProfileKeys.publicKeyDigest }).from(verificationProfileApprovals).innerJoin(verificationProfiles, eq(verificationProfileApprovals.profileId, verificationProfiles.id)).leftJoin(verificationProfileKeys, eq(verificationProfileApprovals.profileKeyId, verificationProfileKeys.id)).where(eq(verificationProfileApprovals.status, "pending")).orderBy(asc(verificationProfileApprovals.createdAt));
}

export type ApprovalQueueCursor = StableApprovalQueueCursor;
export type ApprovalQueueStatusFilter = "all" | "pending" | "completed" | "approved" | "rejected" | "cancelled";
export type ApprovalQueueInput = { limit: number; cursor?: ApprovalQueueCursor; approvalType?: "profile_activation" | "signer_key_activation"; status?: ApprovalQueueStatusFilter; search?: string };
export type ApprovalExportScope = "all" | "pending" | "completed";

/** Returns a bounded, metadata-only governance register for administrator CSV export. */
export async function listApprovalExportRecords(scope: ApprovalExportScope) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const statusCondition = scope === "pending" ? eq(verificationProfileApprovals.status, "pending") : scope === "completed" ? inArray(verificationProfileApprovals.status, ["approved", "rejected", "cancelled"]) : undefined;
  const rows = await db.select({ id: verificationProfileApprovals.id, status: verificationProfileApprovals.status, approvalType: verificationProfileApprovals.approvalType, userId: verificationProfileApprovals.userId, profileId: verificationProfileApprovals.profileId, profileKeyId: verificationProfileApprovals.profileKeyId, makerUserId: verificationProfileApprovals.makerUserId, makerNote: verificationProfileApprovals.makerNote, reviewerUserId: verificationProfileApprovals.reviewerUserId, reviewerNote: verificationProfileApprovals.reviewerNote, createdAt: verificationProfileApprovals.createdAt, reviewedAt: verificationProfileApprovals.reviewedAt, updatedAt: verificationProfileApprovals.updatedAt, profileName: verificationProfiles.name, jurisdiction: verificationProfiles.jurisdiction, policyVersion: verificationProfiles.policyVersion, practitionerId: verificationProfileKeys.practitionerId, practitionerName: verificationProfileKeys.practitionerName, publicKeyDigest: verificationProfileKeys.publicKeyDigest }).from(verificationProfileApprovals).innerJoin(verificationProfiles, eq(verificationProfileApprovals.profileId, verificationProfiles.id)).leftJoin(verificationProfileKeys, eq(verificationProfileApprovals.profileKeyId, verificationProfileKeys.id)).where(statusCondition).orderBy(desc(verificationProfileApprovals.updatedAt), desc(verificationProfileApprovals.id)).limit(5001);
  return { records: rows.slice(0, 5000), hasMore: rows.length > 5000 };
}

/** Returns an administrator-visible governance queue; pending actions remain separately maker–checker scoped. */
export async function listActionablePendingProfileApprovals(reviewerUserId: number, input: ApprovalQueueInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const status = input.status ?? "pending";
  const pendingForReviewer = and(eq(verificationProfileApprovals.status, "pending"), ne(verificationProfileApprovals.makerUserId, reviewerUserId));
  const completed = inArray(verificationProfileApprovals.status, ["approved", "rejected", "cancelled"]);
  const statusCondition = status === "pending" ? pendingForReviewer : status === "completed" ? completed : status === "all" ? or(pendingForReviewer, completed) : eq(verificationProfileApprovals.status, status);
  const conditions = [statusCondition];
  if (input.approvalType) conditions.push(eq(verificationProfileApprovals.approvalType, input.approvalType));
  if (input.search) {
    const term = `%${input.search.trim()}%`;
    conditions.push(or(like(verificationProfiles.name, term), like(verificationProfiles.policyVersion, term), like(verificationProfileKeys.practitionerId, term), like(verificationProfileKeys.practitionerName, term))!);
  }
  if (input.cursor) {
    const cursorDate = new Date(input.cursor.createdAt);
    conditions.push(or(gt(verificationProfileApprovals.createdAt, cursorDate), and(eq(verificationProfileApprovals.createdAt, cursorDate), gt(verificationProfileApprovals.id, input.cursor.id)))!);
  }
  const rows = await db.select({ id: verificationProfileApprovals.id, status: verificationProfileApprovals.status, userId: verificationProfileApprovals.userId, profileId: verificationProfileApprovals.profileId, profileKeyId: verificationProfileApprovals.profileKeyId, approvalType: verificationProfileApprovals.approvalType, makerUserId: verificationProfileApprovals.makerUserId, makerNote: verificationProfileApprovals.makerNote, reviewerUserId: verificationProfileApprovals.reviewerUserId, reviewerNote: verificationProfileApprovals.reviewerNote, createdAt: verificationProfileApprovals.createdAt, reviewedAt: verificationProfileApprovals.reviewedAt, profileName: verificationProfiles.name, jurisdiction: verificationProfiles.jurisdiction, policyVersion: verificationProfiles.policyVersion, practitionerId: verificationProfileKeys.practitionerId, practitionerName: verificationProfileKeys.practitionerName, publicKeyDigest: verificationProfileKeys.publicKeyDigest }).from(verificationProfileApprovals).innerJoin(verificationProfiles, eq(verificationProfileApprovals.profileId, verificationProfiles.id)).leftJoin(verificationProfileKeys, eq(verificationProfileApprovals.profileKeyId, verificationProfileKeys.id)).where(and(...conditions)).orderBy(asc(verificationProfileApprovals.createdAt), asc(verificationProfileApprovals.id)).limit(input.limit + 1);
  const approvals = rows.slice(0, input.limit);
  const last = approvals.at(-1);
  return { approvals, nextCursor: rows.length > input.limit && last ? { createdAt: new Date(last.createdAt).getTime(), id: last.id } : undefined };
}

/** A low-cost count for dashboard attention badges; self-submitted requests cannot be counted as reviewer work. */
export async function countActionablePendingProfileApprovals(reviewerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [result] = await db.select({ total: count() }).from(verificationProfileApprovals).where(and(eq(verificationProfileApprovals.status, "pending"), ne(verificationProfileApprovals.makerUserId, reviewerUserId)));
  return { count: Number(result?.total ?? 0) };
}

export async function decideProfileApproval(reviewerUserId: number, approvalId: number, decision: "approved" | "rejected", reviewerNote: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.transaction(async tx => {
    const approval = (await tx.select().from(verificationProfileApprovals).where(and(eq(verificationProfileApprovals.id, approvalId), eq(verificationProfileApprovals.status, "pending"))).limit(1))[0];
    if (!approval || approval.makerUserId === reviewerUserId) return undefined;
    const reviewedAt = Date.now();
    await tx.update(verificationProfileApprovals).set({ status: decision, reviewerUserId, reviewerNote, reviewedAt }).where(eq(verificationProfileApprovals.id, approval.id));
    if (decision === "approved" && approval.approvalType === "profile_activation") {
      await tx.update(verificationProfiles).set({ status: "draft" }).where(and(eq(verificationProfiles.userId, approval.userId), eq(verificationProfiles.status, "active")));
      await tx.update(verificationProfiles).set({ status: "active", reviewedAt }).where(eq(verificationProfiles.id, approval.profileId));
    }
    if (decision === "approved" && approval.approvalType === "signer_key_activation" && approval.profileKeyId) await tx.update(verificationProfileKeys).set({ status: "active" }).where(and(eq(verificationProfileKeys.id, approval.profileKeyId), eq(verificationProfileKeys.userId, approval.userId)));
    return { ...approval, status: decision, reviewerUserId, reviewerNote, reviewedAt };
  });
}

export async function markVerificationProfileReviewed(userId: number, profileId: number, reviewedAt = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.update(verificationProfiles).set({ reviewedAt }).where(and(eq(verificationProfiles.id, profileId), eq(verificationProfiles.userId, userId), eq(verificationProfiles.status, "active")));
  return result[0].affectedRows > 0;
}

export async function retireVerificationProfile(userId: number, profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.update(verificationProfiles).set({ status: "retired" }).where(and(eq(verificationProfiles.id, profileId), eq(verificationProfiles.userId, userId), eq(verificationProfiles.status, "active")));
  return result[0].affectedRows > 0;
}

export async function revokeVerificationProfileKey(userId: number, keyId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.update(verificationProfileKeys).set({ status: "revoked", revocationReason: reason, revokedAt: Date.now() }).where(and(eq(verificationProfileKeys.id, keyId), eq(verificationProfileKeys.userId, userId), eq(verificationProfileKeys.status, "active")));
  return result[0].affectedRows > 0;
}

export async function listSealCases(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select({ id: sealCases.id, caseRefHash: sealCases.caseRefHash, contentDigest: sealCases.contentDigest, verificationStatus: sealCases.verificationStatus, createdAt: sealCases.createdAt, updatedAt: sealCases.updatedAt }).from(sealCases).where(eq(sealCases.userId, userId)).orderBy(desc(sealCases.updatedAt));
}

/** Returns archive metadata with a server-verified audit-chain verdict for each owner-scoped case. */
export async function listSealCasesWithAuditStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const cases = await listSealCases(userId);
  if (!cases.length) return [];
  const events = await db.select({ userId: sealAuditEvents.userId, caseId: sealAuditEvents.caseId, sequenceNumber: sealAuditEvents.sequenceNumber, eventType: sealAuditEvents.eventType, payloadDigest: sealAuditEvents.payloadDigest, previousEventHash: sealAuditEvents.previousEventHash, eventHash: sealAuditEvents.eventHash, eventTimestamp: sealAuditEvents.eventTimestamp }).from(sealAuditEvents).where(and(eq(sealAuditEvents.userId, userId), inArray(sealAuditEvents.caseId, cases.map(record => record.id)))).orderBy(asc(sealAuditEvents.caseId), asc(sealAuditEvents.sequenceNumber));
  const eventsByCase = new Map<number, AuditChainEvent[]>();
  for (const event of events) {
    const grouped = eventsByCase.get(event.caseId) ?? [];
    grouped.push(event as AuditChainEvent);
    eventsByCase.set(event.caseId, grouped);
  }
  return cases.map(record => {
    const caseEvents = eventsByCase.get(record.id) ?? [];
    return { ...record, auditStatus: summarizeArchiveAuditStatus(caseEvents) };
  });
}

export async function getEncryptedSealCase(userId: number, caseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const records = await db.select().from(sealCases).where(and(eq(sealCases.userId, userId), eq(sealCases.id, caseId))).limit(1);
  return records[0];
}

/** Writes the case reference and its next HMAC-linked audit event in one database transaction. */
export async function saveEncryptedSealCaseWithAudit(userId: number, input: EncryptedCaseInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.transaction(async tx => {
    const existing = await tx.select({ id: sealCases.id }).from(sealCases).where(and(eq(sealCases.userId, userId), eq(sealCases.caseRefHash, input.caseRefHash))).limit(1);
    if (existing[0]) {
      await tx.update(sealCases).set({ encryptedPayload: input.encryptedPayload, encryptionSalt: input.encryptionSalt, encryptionIv: input.encryptionIv, contentDigest: input.contentDigest, verificationStatus: input.verificationStatus }).where(eq(sealCases.id, existing[0].id));
    } else {
      await tx.insert(sealCases).values({ userId, ...input });
    }
    const records = await tx.select().from(sealCases).where(and(eq(sealCases.userId, userId), eq(sealCases.caseRefHash, input.caseRefHash))).limit(1);
    const record = records[0];
    if (!record) throw new Error("Case persistence did not return a record");
    const latest = await tx.select({ sequenceNumber: sealAuditEvents.sequenceNumber, eventHash: sealAuditEvents.eventHash }).from(sealAuditEvents).where(eq(sealAuditEvents.caseId, record.id)).orderBy(desc(sealAuditEvents.sequenceNumber)).limit(1);
    const sequenceNumber = (latest[0]?.sequenceNumber ?? 0) + 1;
    const eventTimestamp = Date.now();
    const auditInput = { userId, caseId: record.id, sequenceNumber, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: input.contentDigest, previousEventHash: latest[0]?.eventHash ?? AUDIT_GENESIS_HASH, eventTimestamp };
    const eventHash = createAuditEventHash(auditInput);
    await tx.insert(sealAuditEvents).values({ ...auditInput, eventHash });
    return { record, auditEvent: { ...auditInput, eventHash } };
  });
}

export type AuditEventCursor = { eventTimestamp: number; id: number };
export type AuditEventPageInput = { cursor?: AuditEventCursor; limit: number; eventType?: string; fromTimestamp?: number };

/** Returns a bounded owner-scoped audit page, newest first, using a stable timestamp-and-ID cursor. */
export async function listSealAuditEvents(userId: number, input: AuditEventPageInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const conditions = [eq(sealAuditEvents.userId, userId)];
  if (input.eventType) conditions.push(eq(sealAuditEvents.eventType, input.eventType));
  if (input.fromTimestamp !== undefined) conditions.push(gte(sealAuditEvents.eventTimestamp, input.fromTimestamp));
  if (input.cursor) {
    const cursorCondition = or(lt(sealAuditEvents.eventTimestamp, input.cursor.eventTimestamp), and(eq(sealAuditEvents.eventTimestamp, input.cursor.eventTimestamp), lt(sealAuditEvents.id, input.cursor.id)));
    if (cursorCondition) conditions.push(cursorCondition);
  }
  const cursorWhere = and(...conditions);
  const rows = await db.select({ id: sealAuditEvents.id, caseId: sealAuditEvents.caseId, sequenceNumber: sealAuditEvents.sequenceNumber, eventType: sealAuditEvents.eventType, payloadDigest: sealAuditEvents.payloadDigest, previousEventHash: sealAuditEvents.previousEventHash, eventHash: sealAuditEvents.eventHash, eventTimestamp: sealAuditEvents.eventTimestamp, createdAt: sealAuditEvents.createdAt }).from(sealAuditEvents).where(cursorWhere).orderBy(desc(sealAuditEvents.eventTimestamp), desc(sealAuditEvents.id)).limit(input.limit + 1);
  return paginateAuditEvents(filterAuditEvents(rows, input), input.limit);
}

export async function verifySealAuditChainForCase(userId: number, caseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const ownedCase = await getEncryptedSealCase(userId, caseId);
  if (!ownedCase) return undefined;
  const events = await db.select({ userId: sealAuditEvents.userId, caseId: sealAuditEvents.caseId, sequenceNumber: sealAuditEvents.sequenceNumber, eventType: sealAuditEvents.eventType, payloadDigest: sealAuditEvents.payloadDigest, previousEventHash: sealAuditEvents.previousEventHash, eventHash: sealAuditEvents.eventHash, eventTimestamp: sealAuditEvents.eventTimestamp }).from(sealAuditEvents).where(eq(sealAuditEvents.caseId, caseId)).orderBy(asc(sealAuditEvents.sequenceNumber));
  return verifyAuditChain(events as AuditChainEvent[]);
}

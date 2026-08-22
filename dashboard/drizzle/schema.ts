import { bigint, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Ciphertext-only case store. The client encrypts source manifests and ledgers
 * before persistence; the service never receives a case vault phrase or plaintext.
 */
export const sealCases = mysqlTable("seal_cases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  caseRefHash: varchar("caseRefHash", { length: 64 }).notNull(),
  encryptedPayload: text("encryptedPayload").notNull(),
  encryptionSalt: varchar("encryptionSalt", { length: 256 }).notNull(),
  encryptionIv: varchar("encryptionIv", { length: 256 }).notNull(),
  contentDigest: varchar("contentDigest", { length: 64 }).notNull(),
  verificationStatus: varchar("verificationStatus", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("seal_cases_owner_case_idx").on(table.userId, table.caseRefHash),
]);

/** Immutable metadata-only audit trail. No case plaintext is written to this table. */
export const sealAuditEvents = mysqlTable("seal_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  caseId: int("caseId").notNull().references(() => sealCases.id, { onDelete: "cascade" }),
  sequenceNumber: int("sequenceNumber").notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  payloadDigest: varchar("payloadDigest", { length: 64 }).notNull(),
  previousEventHash: varchar("previousEventHash", { length: 64 }).notNull(),
  eventHash: varchar("eventHash", { length: 64 }).notNull(),
  eventTimestamp: bigint("eventTimestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("seal_audit_events_case_idx").on(table.caseId, table.createdAt),
  index("seal_audit_events_owner_timeline_idx").on(table.userId, table.eventTimestamp, table.id),
  uniqueIndex("seal_audit_events_case_sequence_unique").on(table.caseId, table.sequenceNumber),
]);

export type SealCase = typeof sealCases.$inferSelect;
export type InsertSealCase = typeof sealCases.$inferInsert;

/** An owner-managed, versioned trust policy for local manifest verification. */
export const verificationProfiles = mysqlTable("verification_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 120 }).notNull(),
  policyVersion: varchar("policyVersion", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  reviewedAt: bigint("reviewedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("verification_profiles_owner_status_idx").on(table.userId, table.status, table.updatedAt),
]);

/** A different privileged reviewer must approve a maker’s proposed profile or signer-key change. */
export const verificationProfileApprovals = mysqlTable("verification_profile_approvals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: int("profileId").notNull().references(() => verificationProfiles.id, { onDelete: "cascade" }),
  profileKeyId: int("profileKeyId").references(() => verificationProfileKeys.id, { onDelete: "cascade" }),
  approvalType: mysqlEnum("approvalType", ["profile_activation", "signer_key_activation"]).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  makerUserId: int("makerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  makerNote: varchar("makerNote", { length: 255 }),
  reviewerUserId: int("reviewerUserId").references(() => users.id, { onDelete: "set null" }),
  reviewerNote: varchar("reviewerNote", { length: 255 }),
  reviewedAt: bigint("reviewedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("verification_profile_approvals_owner_status_idx").on(table.userId, table.status, table.updatedAt),
  index("verification_profile_approvals_reviewer_idx").on(table.reviewerUserId, table.status),
  index("verification_profile_approvals_queue_idx").on(table.status, table.createdAt, table.id),
]);

/** Public Ed25519 keys approved by the owner for a specific verification profile. */
export const verificationProfileKeys = mysqlTable("verification_profile_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: int("profileId").notNull().references(() => verificationProfiles.id, { onDelete: "cascade" }),
  practitionerId: varchar("practitionerId", { length: 160 }).notNull(),
  practitionerName: varchar("practitionerName", { length: 160 }),
  algorithm: mysqlEnum("algorithm", ["Ed25519"]).default("Ed25519").notNull(),
  publicKey: varchar("publicKey", { length: 128 }).notNull(),
  publicKeyDigest: varchar("publicKeyDigest", { length: 64 }).notNull(),
  validFrom: bigint("validFrom", { mode: "number" }),
  validUntil: bigint("validUntil", { mode: "number" }),
  status: mysqlEnum("status", ["pending", "active", "revoked"]).default("pending").notNull(),
  revocationReason: varchar("revocationReason", { length: 255 }),
  revokedAt: bigint("revokedAt", { mode: "number" }),
  approvalReference: varchar("approvalReference", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("verification_profile_keys_owner_profile_idx").on(table.userId, table.profileId, table.status),
  uniqueIndex("verification_profile_keys_profile_digest_unique").on(table.profileId, table.publicKeyDigest),
]);

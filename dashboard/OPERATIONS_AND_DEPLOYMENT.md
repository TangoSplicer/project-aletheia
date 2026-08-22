# Aletheia Seal Desk — Operations and Deployment Runbook

## 1. Operating model

The desk has three trust zones. The browser performs plaintext verification and vault encryption/decryption. Object storage retains opaque ciphertext. The database and server retain owner-scoped metadata, profile governance records, and an HMAC-linked audit chain. The server never receives the vault passphrase, manifest plaintext, or custody-ledger plaintext.

| Layer | Responsibility | Sensitive material retained |
|---|---|---|
| Browser | Ed25519 verification, BLAKE3 recomputation, AES-256-GCM vault cryptography | Plaintext inputs and passphrase for the active browser session only. |
| Object storage | Encrypted vault artifact storage | Ciphertext bytes only. |
| Database | Case metadata, audit metadata, profile/key/approval records | Storage keys, hashes, salts, IVs, status, and governance metadata. |
| Server | Authentication, authorization, ownership enforcement, audit HMAC creation | Platform-managed signing material; never vault passphrases. |

## 2. Required production configuration

Do not commit environment values. In the managed deployment, the built-in variables are injected by the platform. For a self-hosted or GitHub-derived deployment, configure equivalent values through your deployment provider’s secret manager.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL/TiDB connection string with TLS where supported. |
| `JWT_SECRET` | Yes | Session-cookie signing secret; preserve carefully for audit continuity. |
| `VITE_APP_ID` | Yes | OAuth client/application identifier. |
| `OAUTH_SERVER_URL` | Yes | OAuth token/callback service base URL. |
| `VITE_OAUTH_PORTAL_URL` | Yes | Browser-facing OAuth login portal. |
| `OWNER_OPEN_ID` | Yes | Initial project owner identity; receives administrative role at sign-in. |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Managed mode | Built-in storage and platform services. Replace with appropriate provider integrations when self-hosting. |

Reviewer email delivery is intentionally **deferred**. Do not represent an in-product alert badge as an email notification. Before enabling email, choose a verified transactional provider, configure a sender domain, define reviewer-recipient policy, add delivery-failure handling, and review message privacy.

## 3. Database migration procedure

All schema changes use committed Drizzle migration files. Do not run ad hoc destructive SQL against a production case database.

```bash
pnpm install --frozen-lockfile
pnpm drizzle-kit generate        # only when authoring a new schema change
# Review the generated SQL before applying it.
pnpm drizzle-kit migrate
```

The current migration set includes the approval-queue index `verification_profile_approvals_queue_idx`, which supports oldest-first pending-request retrieval. Back up the production database before any migration and record the deployed migration version.

## 4. OAuth launch checks

Authentication must remain fail-closed. The client builds a dynamic-origin login return URI and binds it to a one-time host-only nonce. The callback accepts only a clean HTTPS callback URI, with local HTTP allowed solely for localhost development.

1. Publish to the final HTTPS origin.
2. Register the exact production origin and callback route with the identity provider.
3. Confirm cookie and cross-site browser policy behavior in every supported browser.
4. Complete a real sign-in, callback, protected API, logout, and re-login test on the public domain.
5. Keep the development-only local identity disabled in production. Never use it as a production OAuth workaround.

> An upstream identity-provider 403 is not corrected by bypassing application authorization. Treat it as a provider configuration or availability incident and retain fail-closed controls.

## 5. Governance administration

The maker–checker design relies on distinct human accounts and an accurate `admin` role.

| Control | Required operational action |
|---|---|
| Administrator assignment | Promote only trusted governance operators using the database administration process. Remove access promptly when roles change. |
| Profile proposal | Require the maker to supply a policy rationale and external supporting evidence according to organizational policy. |
| Signer-key proposal | Verify public-key identity, practitioner mapping, validity window, and approval reference before independent review. |
| Approval decision | A different administrator records a substantive reviewer note. The database rejects self-approval. |
| Queue monitoring | Review the badge and approval queue on an operational schedule. Requests become Review soon after 3 days and Urgent after 7. |
| Email alerts | Deferred until an approved transactional-email design and recipient policy are configured. |

The queue returns only changes the active administrator may decide. It uses a stable oldest-first `(createdAt, id)` cursor and a database index. Age is display-only priority; it never changes authorization or lets a maker elevate their own request.

## 6. Audit, storage, and recovery

Every case save writes an HMAC-SHA-256-linked audit event in the same database transaction as its case record. The event binds the owner, case, sequence, event type, payload digest, preceding event hash, and timestamp. This makes unauthorized modification, deletion, insertion, or reordering detectable when verification succeeds.

| Operational event | Expected behavior | Operator response |
|---|---|---|
| Invalid ciphertext material | Request fails before storage write | Correct the client payload; do not retry unchanged data. |
| Ciphertext size over 1.5 MB | Request is rejected | Keep larger source evidence outside the vault or split the supported package. |
| Database failure after object upload | No case row or audit event is committed | Retry the save; treat any opaque orphan as inaccessible storage lifecycle material. |
| Audit verification failure | Vault remains encrypted; audit history is untrusted | Preserve outputs, halt downstream reliance, and investigate access and key continuity. |
| Lost vault passphrase | Ciphertext cannot be decrypted | Recover only from the custodian’s approved secret-management system. |
| HMAC secret rotation | Historical audit verification may fail without the old key | Export/verify existing audit records first and maintain an approved rotation plan. |

The chain is **tamper evidence**, not an independent timestamp authority or a legal-admissibility determination. Use a separately governed timestamping or transparency service when that assurance is required.

## 7. Release procedure

1. Review `CHANGELOG.md`, the database migration list, and open deferred work in `todo.md`.
2. Run `pnpm test`, `pnpm check`, and `pnpm build` from a clean checkout.
3. Confirm migrations have been applied in a staging environment.
4. Test public-domain OAuth, manifest inspection, encrypted save/restore, audit export, profile proposal, independent approval, rejection, priority display, and queue pagination.
5. Create a source-control release commit and push it to the protected GitHub repository.
6. Save and publish the managed application checkpoint.
7. Monitor sign-in errors, queue age, audit verification results, database health, and storage errors after release.

## 8. Self-hosting note

The current deployment uses managed database, storage, notification, OAuth, and runtime facilities. A GitHub checkout contains the source and migration history, but a self-hosted deployment requires compatible replacements for those services. Treat the GitHub repository as the **source of truth for code**, not as a complete standalone infrastructure bundle.

## 9. Further recommended enhancements

1. Add verified transactional email or enterprise messaging after defining recipient policy, privacy templates, retries, and delivery observability.
2. Add a governed organization/team model so queue access can be constrained to a defined reviewer group rather than global administrators.
3. Add an external timestamp/transparency integration for audit exports that require stronger independent time evidence.
4. Add a retention policy and lifecycle job for opaque unreferenced storage objects after reviewed database failures.
5. Add organization-approved profile import/export with signed change packages and multi-party review evidence.

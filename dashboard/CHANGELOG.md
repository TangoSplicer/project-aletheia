# Changelog

All notable source, security, governance, and operational changes are recorded here. Dates use UTC.

## [1.1.0] — 2026-08-21

### Added

- Validated, shareable URL query parameters for approval-queue search, lifecycle status, request type, and priority filters. Invalid values fall back safely, while each recipient remains subject to their own authorization and maker–checker boundaries.
- A dedicated **Approval queue** route and administrator-only sidebar entry for independently actionable profile and signer-key changes.
- Header attention badge that appears only when an administrator has approval requests created by someone else.
- Stable oldest-first approval-queue cursor pagination using `(createdAt, id)` and the `verification_profile_approvals_queue_idx` database index.
- Request-type filtering and age-derived priority cues: New request, Review soon after 3 days, and Urgent review after 7 days.
- Required reviewer decision notes and dedicated approve/reject controls in the queue.
- Administrator-only CSV export for pending, completed, or all approval records, with UTF-8 output, ISO timestamps, a 5,000-record guard, and spreadsheet-formula-safe cell escaping.
- Regression coverage for queue authorization, self-review exclusion, oldest-first multi-page progression, request-type filtering, age priority, pagination, filter reset, approval, rejection, and post-decision query invalidation.
- GitHub-ready source documentation: consolidated README, user guide, deployment/operations runbook, security policy, and this changelog.

### Changed

- The workbench profile dialog now links to a dedicated approval queue instead of presenting a dense inline reviewer form.
- Dashboard counts use a lightweight server-side independently-actionable approval summary instead of fetching the full global queue.
- Repository guidance now distinguishes managed deployment from self-hosting and documents deferred reviewer email delivery.

### Security

- Queue queries exclude the active reviewer’s own requests at the database layer; self-approval remains rejected within the approval-decision transaction.
- Priority is derived solely from creation time and cannot be assigned by a maker.

### Deferred

- Transactional reviewer email notifications remain a tracked follow-up pending an approved provider, sender domain, recipient policy, privacy template, retry, and delivery-observability design.

## [1.0.0] — 2026-08-20

### Added

- React/TypeScript local-first verification dashboard with protected tRPC/Express backend and MySQL/TiDB persistence.
- Browser-native Ed25519 manifest envelope verification and BLAKE3 custody-ledger recomputation/root comparison.
- Browser-side AES-256-GCM encrypted case vaults with owner-scoped storage references and local restore/decryption.
- HMAC-SHA-256 linked case audit chain, owner-scoped archive status badges, safe JSON audit exports, timeline visualization, filters, pagination, and unseen-event indication.
- Development-only local test identity with explicit production fail-closed protections.
- Verification profiles with jurisdiction, policy version, lifecycle status, review date, approved signer-key records, full BLAKE3 public-key digests, validity windows, revocation, and separate signature-versus-authority evaluation.
- Maker–checker profile/key activation approvals, database-level self-approval prevention, pending non-authorizing signer keys, and safe profile-version history in inspection and audit exports.
- Dynamic-origin, nonce-bound OAuth start flow and strict callback safety validation.
- Offline Windows and Android companion build guidance plus case lifecycle and commercialization planning documents.

### Security

- Hardened ciphertext validation, transactional audit writes, ownership isolation, ciphertext-free exports, and documented audit/OAuth operational limits.

### Validation

- Added automated unit, router, UI-rendering, and browser-style interaction coverage across cryptographic, storage, audit, archive, profile, governance, and OAuth controls.

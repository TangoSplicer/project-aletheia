# Project Aletheia Roadmap to v2

## Purpose and planning boundary

This roadmap translates the current v1 architectural baseline into a sequenced path toward **Project Aletheia v2**. It covers the Rust core, SRA integration, validation suite, and Aletheia Seal Desk dashboard as one governed ecosystem. It is a planning and decision document, not a delivery commitment, accreditation claim, legal opinion, or evidence of method validation.

The v1 architecture is frozen. Any change that affects method behavior, cryptographic handling, interpretation boundaries, or deployed governance workflows must be reviewed as a new versioned method change with suitable validation evidence. A completed software feature does not, by itself, make a forensic or compliance claim true.

## v2 outcomes

Version 2 should be considered only when the ecosystem can demonstrate the outcomes below through documented evidence, independent review where appropriate, and repeatable release controls.

| Outcome | What v2 should provide | What it must not imply |
|---|---|---|
| Reproducible system | Pinned dependencies, repeatable validation commands, versioned artifacts, and explicit migration records. | That all deployments are identical or automatically compliant. |
| Governed trust | Organization-scoped profiles, reviewer roles, durable approval records, and separate maker–checker decisions. | That an approved account proves real-world authority without organizational evidence. |
| Durable case operations | Defined retention, recovery, audit-key continuity, export, and incident processes. | That encrypted storage or an audit chain alone establishes legal admissibility. |
| Interoperable evidence packages | Versioned, safe, signed metadata packages with clear import/export rules. | That third-party systems will interpret the package identically without their own validation. |
| Validated method change | A controlled v2 change package with traceable requirements, tests, SRA evidence, review decisions, and release record. | A substitute for jurisdiction-specific accreditation or expert interpretation. |

## Delivery principles

1. **Preserve the v1 baseline.** Keep baseline artifacts and validation evidence reproducible; develop v2 changes on separate versioned branches or release candidates.
2. **Security before convenience.** New UX, notification, import, or integration paths must fail closed on authorization errors and avoid exposing evidence, secrets, or sensitive governance content.
3. **Evidence before labels.** Do not label a capability as FSR-ready, ISO-compliant, court-ready, accredited, or legally admissible without the organization’s independently reviewed evidence package.
4. **Small, reversible changes.** Each milestone should have bounded migration, rollback, and operator instructions. Database changes require reviewed migrations and a recovery plan.
5. **Human accountability remains explicit.** The platform can structure review and tamper evidence; it does not replace practitioner judgment, organizational authorization, or quality management.

## Release lanes and sequence

The roadmap uses release lanes rather than calendar promises. A lane starts only when its stated prerequisites are met, and it exits only when its measurable gates pass.

| Lane | Target | Primary purpose | Dependency |
|---|---|---|---|
| A | v1.1 operational hardening | Make current dashboard and source releases reproducible, governable, and supportable. | Current validated source. |
| B | v1.2–v1.3 organizational operations | Add scoped roles, reviewer operations, lifecycle controls, and safer collaboration. | Lane A release evidence. |
| C | v1.4–v1.5 evidence interoperability | Establish controlled exchange packages, audit continuity, and core/dashboard integration points. | Lanes A and B governance controls. |
| D | v2.0 release candidate | Build and validate the new method version evidence package. | All mandatory gates from A–C. |

## Lane A — v1.1 operational hardening

### Objective

Turn the current dashboard and framework source tree into a repeatable, reviewable release process without changing forensic interpretation or relaxing existing fail-closed controls.

| Work item | Deliverable | Exit gate |
|---|---|---|
| CI protection | Required GitHub quality gate for dashboard locked install, tests, TypeScript, and production build. | Branch rules require the dashboard workflow on relevant changes; a clean pull request passes it. |
| Release discipline | Semantic dashboard tags and release-candidate policy. | A practice release candidate records commit SHA, changelog, test output, migration review, and rollback reference. |
| Documentation map | User, operator, security, contributor, release, and environment guides are linked from the repository root. | A new contributor can identify the correct guide and reproduce the dashboard checks from a clean clone. |
| Dependency posture | Review Node/pnpm versions and third-party update policy. | Supported runtime and lockfile process are documented; high-risk updates receive explicit review. |
| Baseline preservation | Archive v1 release artifacts and their validation references. | v1 baseline commit/tag and current validation notes are discoverable without ambiguity. |

### Lane A non-goals

Do not introduce automatic legal conclusions, production authentication bypasses, unreviewed external trust dependencies, or schema changes merely to improve visual presentation.

## Lane B — v1.2–v1.3 organizational operations

### Objective

Evolve the dashboard from owner-global administration to controlled organizational governance while preserving independent review and local-first evidence handling.

| Work item | Deliverable | Acceptance criteria |
|---|---|---|
| Organization and team model | Organization, membership, and scoped roles for case, profile, and approval operations. | Cross-organization access is denied server-side; role changes are audited; tests cover membership removal and role downgrade. |
| Reviewer groups | Explicit reviewer pools for profile and signer-key requests. | Queue queries and counts are scoped to independently actionable reviewer memberships; self-review stays database-blocked. |
| Notification design | Transactional email or enterprise-messaging design with recipient policy, privacy templates, retries, and delivery observability. | No notification contains secrets, evidence, ciphertext, passphrases, or unreviewed personally sensitive data; delivery failure is surfaced without blocking governance. |
| Governance SLA reporting | Queue age, pending count, decision throughput, and escalation policy reporting. | Metrics are metadata-only, permission-scoped, exportable, and do not create a new authorization path. |
| Profile lifecycle governance | Scheduled review policy, controlled retirement, and delegated policy owner records. | All status changes include actor, rationale, and independent approval where policy requires it. |

### Decision gate: notification channel

Before implementation, select an approved provider and sender domain, define jurisdictions and recipients, approve message content and retention, and decide how undeliverable messages are handled. The current dashboard badge is an in-product signal, not an email-delivery claim.

## Lane C — v1.4–v1.5 evidence interoperability and continuity

### Objective

Enable carefully governed exchange and long-term verification without importing source evidence or weakening encryption, authorization, or provenance boundaries.

| Work item | Deliverable | Acceptance criteria |
|---|---|---|
| Profile change packages | Signed, versioned profile/key registration export and import format. | Import validates schema, signer, policy compatibility, version, and independent approval evidence before any authorization effect. |
| Approval and audit exports | Versioned safe register/export schemas with explicit privacy classifications. | Exports exclude private keys, passphrases, plaintext evidence, and ciphertext; formula-safe CSV and schema tests remain mandatory. |
| Audit continuity | Approved HMAC-key rotation, verification-key retention, and incident-recovery procedure. | Historical audit records remain verifiable across an approved rotation exercise or explicitly report the supported verification scope. |
| Independent time evidence | Optional, separately governed timestamp/transparency integration for exports. | The integration is tested for verification and failure states; UI distinguishes tamper evidence from independent time evidence. |
| Core/dashboard contracts | Versioned manifest, ledger, and sealing contract shared between Core Nexus and the dashboard. | Fixtures pass in both environments; compatibility matrix covers supported and rejected versions. |
| Retention and storage lifecycle | Reviewed opaque-object retention, orphan handling, legal-hold process, and deletion authorization model. | Storage cleanup is dry-run capable, auditable, organization-scoped, and cannot delete referenced vaults. |

### Decision gate: integration trust boundary

For each external timestamp, identity, notification, or storage integration, record the data sent, jurisdictional/privacy implications, failure behavior, authentication method, support owner, and removal/rollback plan before production use.

## Lane D — v2.0 release candidate and method change package

### Objective

Produce a controlled v2 release candidate backed by repeatable software validation and the organization’s method-change evidence, rather than treating a feature-complete branch as a finished forensic method.

| Evidence area | v2.0 release-candidate gate |
|---|---|
| Requirements traceability | Every v2 requirement maps to source changes, tests, documentation, and acceptance evidence. |
| Method-change scope | The delta from the frozen v1 baseline is explicitly enumerated, including behavior, cryptography, workflows, interfaces, schemas, and operational assumptions. |
| SRA and regression evidence | Relevant SRA checks, deterministic fixtures, negative tests, and compatibility cases run reproducibly and have reviewed results. |
| Security review | Threat model, authorization review, secret handling, export privacy, dependency review, and incident response updates are completed. |
| Data and migration review | Schema migrations, rollback constraints, backup/restore exercise, retention impact, and data-protection review are documented. |
| Operational readiness | Public-domain OAuth test, access-role test, case save/restore, audit verification, independent approval, export, monitoring, and incident drills are recorded. |
| Independent review | Required technical, governance, and quality reviewers sign or record approval according to organizational policy. |
| Release control | Annotated `v2.0.0-rc.N` tag, changelog, deployed commit SHA, known limitations, and rollback reference are published. |

v2.0.0 is released only after the release candidate gates are satisfied, outstanding critical findings are resolved or formally accepted by the accountable authority, and the organization has completed its own method-validation and quality approvals.

## Cross-cutting backlog

The following items should be prioritized through the lanes above rather than added opportunistically.

| Priority | Theme | Candidate work |
|---|---|---|
| P0 | Authorization and audit integrity | Organization scoping, reviewer groups, audit-key rotation, incident drills, and role-change tests. |
| P1 | Operational resilience | Backup/restore exercises, migration rehearsals, storage retention dry runs, monitoring and alert runbooks. |
| P1 | Interoperability | Versioned profile packages, contract fixtures, safe export schemas, compatibility matrix. |
| P2 | User efficiency | Saved queue views, date-range export filters, governed batch review support, accessibility audits, and optional enterprise notifications. |
| P2 | Product packaging | Installation bundle, supported deployment reference, administrator onboarding, and commercial support boundaries. |

## Metrics and review cadence

Review this roadmap at each dashboard release candidate, Core Nexus method change, material SRA-library update, security incident, or quarterly governance review—whichever happens first. Track the measures below as decision inputs, not as automated quality claims.

| Measure | Direction | Review question |
|---|---|---|
| Required CI pass rate | Sustain at 100% for release candidates | Are source releases reproducible? |
| Open critical security findings | Reach zero before release | Is there an unresolved security risk that blocks deployment? |
| Pending approval age | Decrease within approved service levels | Are reviewer operations adequately staffed and scoped? |
| Audit verification exceptions | Investigate every exception | Are key continuity, storage, and access controls operating as designed? |
| Migration rehearsal success | Sustain at 100% for release candidates | Can operators apply and recover the planned data change? |
| Documentation freshness | Update with each material change | Can users and operators follow instructions that match the released software? |

## Immediate next actions

1. Protect `main` with both the framework validation gate and the dashboard quality gate.
2. Run a `dashboard-v1.1.0-rc.1` practice release using `dashboard/RELEASE_POLICY.md`, including a staging migration rehearsal and public-domain OAuth smoke test.
3. Convene the organization-scoping design review before implementing notifications or broader reviewer access.
4. Define the Core Nexus/dashboard manifest and ledger compatibility matrix and add shared fixtures.
5. Establish accountable owners for security, release, governance, storage lifecycle, and method-change evidence.

## Change log for this roadmap

| Date | Change | Owner |
|---|---|---|
| 2026-08-22 | Initial v2 sequencing derived from the frozen v1 baseline, current master plan, dashboard operations runbook, and release policy. | Project Aletheia maintainers |

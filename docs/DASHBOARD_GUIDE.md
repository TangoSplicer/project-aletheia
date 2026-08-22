# Aletheia Seal Desk in Project Aletheia

## Purpose

The Aletheia Seal Desk is the web dashboard located in [`../dashboard/`](../dashboard/). It is a local-first verification and governance application that supports signed-manifest inspection, BLAKE3 custody-ledger recomputation, encrypted case-vault workflows, audit verification, verification-profile governance, and maker–checker approval operations.

> The dashboard is an integrity and workflow tool. It does not itself establish legal admissibility, professional identity, accreditation, source authenticity, or an authoritative timestamp. Organizations remain responsible for policy, method validation, personnel competence, evidence handling, and independent review.

## Choose the right guide

| Audience | Start here | Then use |
|---|---|---|
| Practitioner or case custodian | [`dashboard/USER_GUIDE.md`](../dashboard/USER_GUIDE.md) | Daily verification, vault, archive, and safe-export workflows. |
| Approval reviewer or administrator | [`dashboard/USER_GUIDE.md`](../dashboard/USER_GUIDE.md) | Maker–checker queue review, priority, filters, CSV register export, and shareable filter views. |
| Deployment operator | [`dashboard/OPERATIONS_AND_DEPLOYMENT.md`](../dashboard/OPERATIONS_AND_DEPLOYMENT.md) | Environment configuration, migrations, OAuth, launch, recovery, and operational limits. |
| Security reviewer | [`dashboard/SECURITY.md`](../dashboard/SECURITY.md) | Trust boundaries, threat-relevant controls, and vulnerability reporting. |
| Release owner | [`dashboard/RELEASE_POLICY.md`](../dashboard/RELEASE_POLICY.md) | Required quality evidence, release candidates, tags, and rollback process. |
| Developer or contributor | [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Repository layout, tests, scope boundaries, and change process. |

## Clean-clone quick start

Clone the framework with its configured submodules, then move into the dashboard directory.

```bash
git clone --recurse-submodules https://github.com/TangoSplicer/project-aletheia.git
cd project-aletheia/dashboard
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
```

The dashboard requires Node.js 22 or later, pnpm, and a compatible MySQL/TiDB service for authenticated persistence workflows. Local manifest and ledger inspection can take place in the browser, but archive, profile-governance, approval queue, and audit-history functions require the server-side configuration described in the operations runbook.

## Repository layout

| Path | Role |
|---|---|
| `core-nexus/` | Rust core and integrity validation. |
| `sra-library/` | Standard Reference Artifact library integration. |
| `validation-suite/` | Framework validation gate. |
| `dashboard/` | Aletheia Seal Desk React/TypeScript application and its focused documentation. |
| `.github/workflows/validation-gate.yml` | Framework pull-request validation. |
| `.github/workflows/dashboard-ci.yml` | Dashboard dependency, test, type-check, and production-build gate. |

## Operating boundaries

The dashboard processes manifest and custody-ledger inputs locally for inspection. Saving a vault encrypts case material in the browser before persistence; the service should not receive the vault passphrase or plaintext evidence. Approval queue links can carry filter state, but a link never grants access—each viewer is independently authorized, and the database enforces maker–checker separation.

Do not commit private keys, OAuth client secrets, passphrases, evidence, decrypted case content, ciphertext, personal operational data, or production configuration files. Review the dashboard-specific license in [`dashboard/LICENSE`](../dashboard/LICENSE) alongside the repository-level license before combining, redistributing, or changing licensing terms.

## Release and support expectations

Run the dashboard quality commands before proposing a dashboard change. The GitHub workflow repeats the locked install, test, type check, and production build on dashboard changes. A passing CI run is necessary but does not replace migration review, security review, operational launch checks, forensic-method validation, or organizational quality assurance.

```bash
cd dashboard
pnpm test
pnpm check
pnpm build
```

Use the release policy for semantic dashboard tags, release-candidate handling, evidence expectations, and rollback limits. Use the operations runbook—not a source-code rollback alone—when database schema, deployment configuration, or live security posture is involved.

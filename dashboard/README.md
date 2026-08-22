# Aletheia Seal Desk

**Aletheia Seal Desk** is a local-first verification workbench for inspecting signed sealing manifests, recomputing BLAKE3 custody ledgers, preserving encrypted case vaults, and governing trusted practitioner signing keys. The deployed dashboard is available at [seal-dash-a3mkk4dq.manus.space](https://seal-dash-a3mkk4dq.manus.space).

The application is designed to keep source evidence in the browser. It is an integrity and workflow tool, not a legal-admissibility, accreditation, identity, or timestamp-authority service.

## What it does

| Capability | What the desk provides | Security boundary |
|---|---|---|
| Manifest inspection | Local required-field checks and Ed25519 envelope verification | The manifest is read in the browser. |
| Ledger verification | Local BLAKE3 custody-chain recomputation and root comparison | The uploaded ledger remains in the browser. |
| Case vaults | AES-256-GCM browser-side encryption before case persistence | The server never receives the vault passphrase or plaintext evidence. |
| Case archive | Owner-scoped restore, local decryption, audit-chain status, and safe verification exports | Stored artifacts are ciphertext and integrity metadata only. |
| Verification profiles | Jurisdiction-, policy-, lifecycle-, and key-scoped authority records | A valid signature is deliberately distinct from practitioner authority. |
| Maker–checker governance | Independent approval of profile and signer-key activation | A maker cannot decide their own request. Pending/rejected changes do not authorize. |
| Approval operations | Count badge, dedicated administrator queue, request-type filtering, age-derived priority, and stable cursor pagination | Only independently actionable pending records are returned to an administrator. |

## Documentation

| Document | Audience | Use it for |
|---|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | Practitioners, reviewers, and case custodians | Day-to-day verification, vault, archive, and approval workflows. |
| [OPERATIONS_AND_DEPLOYMENT.md](OPERATIONS_AND_DEPLOYMENT.md) | Administrators and deployment operators | Configuration, database migration, OAuth, production launch, recovery, and operational limits. |
| [SECURITY.md](SECURITY.md) | Security reviewers and contributors | Trust boundaries, vulnerability reporting, and supported disclosure practices. |
| [CHANGELOG.md](CHANGELOG.md) | Operators and developers | Consolidated feature, security, governance, and migration history. |
| [RELEASE_POLICY.md](RELEASE_POLICY.md) | Release owners | Required CI evidence, semantic tags, release candidates, and rollback boundaries. |

## Quick start

The project requires **Node.js 22+**, **pnpm**, and a compatible MySQL/TiDB database for authenticated persistence. The UI can inspect a manifest and ledger locally, but archive, governance, and authenticated workflows require the server and its configured environment.

```bash
pnpm install
pnpm test
pnpm check
pnpm build
```

For local development, configure the variables described in [OPERATIONS_AND_DEPLOYMENT.md](OPERATIONS_AND_DEPLOYMENT.md), apply the committed Drizzle migrations, then run:

```bash
pnpm dev
```

## Primary user journeys

### Verify a sealing package

Open **Verify seal**, select a JSON sealing manifest, and select its associated JSONL or JSON custody ledger. The desk evaluates the Ed25519 envelope, recomputes the ledger, and presents separate outcomes for signature validity and registered-practitioner authority. Exporting the inspection record produces safe metadata only; it never contains vault ciphertext, plaintext evidence, or passphrases.

### Save and restore an encrypted case

After loading a case, provide a vault passphrase of at least 14 characters and choose **Save vault**. Encryption happens in the browser. In **Case archive**, choose **Restore**, enter the original passphrase, and the browser decrypts the downloaded ciphertext locally before returning to the workbench.

> Losing the vault passphrase prevents decryption. The platform cannot recover it.

### Review governance changes

An administrator opens **Approval queue** from the sidebar or the header attention badge. The queue includes only pending changes created by another user, orders them from longest waiting to newest, and labels attention based only on age: **Urgent review** after seven days and **Review soon** after three. The reviewer must record a decision note before approving or rejecting. Approval activates the requested profile or signer key; rejection leaves it inactive.

## Repository and release posture

This dashboard is maintained inside [TangoSplicer/project-aletheia](https://github.com/TangoSplicer/project-aletheia) under `dashboard/`. Dependencies, build output, local logs, secrets, and runtime artifacts are excluded from source control. Consult the repository-level [dashboard guide](../docs/DASHBOARD_GUIDE.md) and [contribution guide](../CONTRIBUTING.md) before changing release or deployment posture.

## Quality gates

Before a release, run the following commands and require all of them to succeed:

```bash
pnpm test
pnpm check
pnpm build
```

The current suite covers cryptographic verification, encrypted vault handling, audit chaining, owner isolation, OAuth safety, profile authority, maker–checker controls, export safety, approval queue prioritization, stable pagination, filtering, and both approve/reject UI workflows.

## License

This project is distributed under the [MIT License](LICENSE). Third-party packages remain subject to their respective licenses.

# Aletheia Seal Desk Release Policy

## Purpose and scope

This policy governs source releases of the dashboard stored in `dashboard/`. It applies to the React client, Express/tRPC server, database schema and migrations, user-facing documentation, and deployment configuration. It does **not** certify a forensic method, a practitioner, a source artifact, or an operational deployment. Those claims require separate organizational evidence and review.

## Versioning and tags

Use semantic version tags in the form `dashboard-vMAJOR.MINOR.PATCH`. Create tags only from the protected `main` branch after the required checks pass. Increment the version according to the highest-impact included change.

| Change category | Version increment | Examples |
|---|---:|---|
| Security fix or backward-compatible correction | PATCH | Authorization correction, CSV escaping fix, documentation correction. |
| Backward-compatible capability | MINOR | New queue filters, audit export field, administrator workflow. |
| Breaking interface, schema, or deployment change | MAJOR | Required migration with incompatible data model, removed API contract, changed authentication integration. |

Pre-release candidates use `dashboard-vMAJOR.MINOR.PATCH-rc.N`. A release candidate is an internal review artifact, not a production assurance statement.

## Required release evidence

Before tagging, the release owner records the commit SHA and confirms the following. The repository quality gate executes the first four steps on dashboard changes; the remaining checks require accountable human review.

| Evidence | Required confirmation |
|---|---|
| Dependencies | `pnpm install --frozen-lockfile` completed from `dashboard/`. |
| Automated coverage | `pnpm test` completed successfully. |
| Static validation | `pnpm check` completed successfully. |
| Production artifact | `pnpm build` completed successfully. |
| Migration review | Every pending Drizzle migration is reviewed, ordered, and applied through the approved database process. |
| Security review | Authentication, authorization, export scope, and new secret requirements were reviewed for the specific release. |
| Operational review | The deployment and rollback steps in `OPERATIONS_AND_DEPLOYMENT.md` are current and practicable. |
| Governance review | Changes to verification profile, signer-key, or maker–checker workflows have an independent reviewer where policy requires it. |

## Tagging procedure

1. Confirm `git status --short` is empty and the target commit is on `main`.
2. Run the release evidence commands from `dashboard/` and retain their output in the delivery record or release notes.
3. Update `CHANGELOG.md` with the version, date, security-relevant changes, migrations, and operator actions.
4. Create and push an annotated tag, for example: `git tag -a dashboard-v1.2.0 -m "Aletheia Seal Desk v1.2.0"` followed by `git push origin dashboard-v1.2.0`.
5. Publish only after a deployment owner completes the environment, OAuth callback, migration, and smoke-test checklist in `OPERATIONS_AND_DEPLOYMENT.md`.

## Rollback and incident handling

If a release fails validation or creates an operational risk, stop rollout, preserve the relevant logs and audit metadata, and return to the last validated release tag. Do not use a code rollback to reverse database data without an approved recovery plan. Security incidents follow `SECURITY.md`; suspected evidence or audit integrity issues also follow the organization’s forensic quality process.

## Release documentation

Each tagged release must provide a concise changelog entry, the deployed dashboard version or commit SHA, completed migration identifiers, configuration changes, known limitations, and rollback reference. The public source documentation must never contain passphrases, OAuth client secrets, private keys, case content, ciphertext, or personal data beyond approved examples.

# Contributing to Project Aletheia

## Scope and safety

Project Aletheia contains several components with distinct runtime and validation boundaries. Make changes within the narrowest appropriate component and avoid broad refactors that obscure forensic, governance, or deployment review. Contributions must not introduce private keys, passphrases, production credentials, decrypted evidence, case content, or unapproved personal data into source control.

| Area | Primary path | First validation step |
|---|---|---|
| Rust core | `core-nexus/` | Follow the existing Core Nexus validation commands and `validation-gate.yml`. |
| SRA integration | `sra-library/`, `validation-suite/` | Run the relevant SRA consistency and validation checks. |
| Dashboard | `dashboard/` | `pnpm test`, `pnpm check`, and `pnpm build`. |
| Documentation and policy | Repository root, `docs/`, or `dashboard/*.md` | Check links, claims, and operating instructions against implemented behavior. |

## Dashboard contribution workflow

1. Read [`docs/DASHBOARD_GUIDE.md`](docs/DASHBOARD_GUIDE.md) and the dashboard’s [security policy](dashboard/SECURITY.md) before changing a dashboard workflow.
2. Add the requirement to `dashboard/todo.md` before implementation. Do not delete historical items.
3. Keep server-scoped authorization in the tRPC/database layer. Client controls and URL parameters are never authority decisions.
4. Add or update Vitest coverage for the new behavior, including prohibited or unauthorized paths where relevant.
5. Run the locked validation sequence from `dashboard/`.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
```

6. Update the appropriate guide, operations runbook, security notes, and changelog when behavior, configuration, security boundaries, or operator actions change.
7. Follow [`dashboard/RELEASE_POLICY.md`](dashboard/RELEASE_POLICY.md) for release candidates, version tags, and deployment evidence.

## Pull requests and reviews

Describe the user or operator outcome, affected components, validation commands, migration implications, security implications, and documentation changes. Changes to authentication, authorization, case persistence, audit integrity, verification authority, cryptographic handling, or release configuration require an independent reviewer. Do not approve your own governance change where the application or organizational policy requires maker–checker separation.

## Reporting issues

Use the repository’s forensic non-conformance template for quality issues. Report security vulnerabilities through the dashboard [security policy](dashboard/SECURITY.md) rather than publicly disclosing exploit details. Keep issue reports free from live case artifacts, secrets, personal data, and confidential operational records.

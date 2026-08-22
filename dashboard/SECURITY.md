# Security Policy

## Supported security boundaries

The desk is designed around browser-local evidence handling, authenticated owner scoping, encrypted vault persistence, tamper-evident audit metadata, and maker–checker approval controls. The expected boundaries are described in [OPERATIONS_AND_DEPLOYMENT.md](OPERATIONS_AND_DEPLOYMENT.md).

The following are intentional limits, not defects to work around:

- A cryptographically valid Ed25519 signature does not alone establish practitioner authority.
- An active profile does not establish real-world identity, accreditation, legal authority, or evidence truthfulness.
- Audit-chain verification is tamper evidence, not independent timestamp authority or legal-admissibility proof.
- A lost vault passphrase cannot be recovered by the service.
- Reviewer email notifications are currently deferred; dashboard badges and queues are not email delivery.

## Reporting a vulnerability

Do not post sensitive vulnerabilities, exploit details, credentials, evidence, private keys, or vault material in a public issue. Report privately to the project owner with:

1. A concise description of the affected boundary.
2. Reproduction steps using synthetic, non-sensitive inputs.
3. Expected and observed behavior.
4. Potential impact and any suggested mitigation.

Allow time for acknowledgement, triage, remediation, validation, and coordinated disclosure. Do not attempt to access other users’ records or exercise an exploit against production data.

## Deployment hygiene

Keep secrets out of Git history, enforce HTTPS, register the exact OAuth callback origin, restrict database access, use least privilege for administrators, back up databases before migrations, and retain evidence according to your applicable policy. See the operations runbook for the complete launch checklist.

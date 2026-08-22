# Aletheia Seal Desk — User Guide

## 1. Before you begin

Use a current desktop browser and sign in with an account that has access to the desk. For profile governance work, an account needs the **admin** role. Keep three materials separate: the sealing manifest, the custody ledger, and the vault passphrase. The desk does not transmit manifest or ledger plaintext as part of local verification.

| Material | Format | Where it is used | Do not do this |
|---|---|---|---|
| Sealing manifest | JSON | Verify seal | Do not edit it after signing. |
| Custody ledger | JSONL or JSON | Verify seal | Do not confuse its root with a signature result. |
| Vault passphrase | User-chosen secret, 14+ characters | Save vault / Restore | Do not send it by email or record it in the case file. |
| Inspection export | JSON metadata | Your independent record system | Do not treat it as a copy of the source evidence. |

## 2. Verify a manifest and ledger

1. Open **Verify seal**.
2. Select the sealing manifest. The desk checks its structure and begins Ed25519 verification in the browser.
3. Select the custody ledger. The desk recomputes its BLAKE3 chain and compares the computed root with the root declared in the manifest.
4. Read the **Checks & provenance** list. Each check has a distinct status; an apparently valid signature does not by itself establish that a practitioner was authorized.
5. Review **Verification authority**. An authorized result requires an active profile and an approved, in-window, non-revoked key matched to the claimed practitioner.
6. Use **Export inspection record** when you need a safe verification summary. The export excludes source evidence, plaintext vault content, ciphertext, private keys, and passphrases.

### Understanding verification results

| Result | Meaning | Recommended next step |
|---|---|---|
| Seal verified | Required fields, signature, and ledger root completed successfully | Preserve the inspection export and follow your organization’s evidence policy. |
| Review required | One or more verification conditions could not be established | Do not rely on the seal as final; identify the failed or incomplete check. |
| Signature valid; authority unconfirmed | A public key controlled the signature but is not authorized by an active profile | Obtain a properly governed profile/key registration. |
| Revoked, expired, or mismatched key | The signature can be mathematically valid but is not authorized for this claim | Escalate through the policy and governance process. |

## 3. Save an encrypted case vault

Saving a vault is optional. It preserves a locally encrypted restoration package and a server-side audit reference; it is not an evidence-ingestion system.

1. Complete the verification work you want preserved.
2. Enter a unique passphrase of at least 14 characters in **Vault passphrase**.
3. Choose **Save vault**.
4. Record the passphrase using your organization’s approved secret-management method. The desk cannot retrieve it later.

The browser derives the encryption key and encrypts the case using AES-256-GCM. The server receives ciphertext, encryption parameters, hashes, and status metadata—not the passphrase, manifest plaintext, or ledger plaintext.

## 4. Use Case Archive

**Case archive** lists encrypted records belonging to the signed-in owner. Each record has a visible audit verdict:

| Audit badge | Interpretation |
|---|---|
| AUDIT VERIFIED | The stored metadata chain recomputed successfully. |
| AUDIT REVIEW | The chain needs investigation or has an integrity concern. |
| AUDIT PENDING | There is not yet enough audit history for a final chain verdict. |

Use **Export audit** to download a safe verification record. Use **Restore** to request ciphertext for your account and decrypt it locally with the original passphrase. The visual audit timeline supports event filters, date selection, pages, and a jump-to-newest action when background refresh detects unseen events.

## 5. Manage verification profiles and signer keys

Use the **Verification settings** control in the workbench header.

1. Submit a profile with a name, jurisdiction, policy version, and maker rationale. It begins as a draft with a pending activation request.
2. After activation, register a practitioner’s 32-byte raw Ed25519 public key in Base64 or Base64URL form. The desk canonicalizes it and records its full BLAKE3 digest.
3. Supply optional validity windows and approval references where your policy requires them.
4. A separate administrator approves or rejects the key request. Before approval, a key stays pending and cannot authorize a manifest.
5. Record a periodic profile review or retire an active profile when it is no longer applicable. Historical profile decisions stay present in safe exports.

> A profile is an organizational trust policy. It is not proof of real-world identity, professional accreditation, legal authority, or the authenticity of source evidence.

## 6. Review approval requests as an administrator

The header shows a **Review approvals** badge only when there are pending requests you may independently decide. Click it, or open **Approval queue** from the sidebar.

The queue protects maker–checker separation by excluding your own requests. It provides request-type filters, age priority, oldest-first ordering, and bounded pages. For each request:

1. Read the proposed profile or signer-key information and maker rationale.
2. Check the applicable policy, identity evidence, and approval reference outside the desk as required by your organization.
3. Enter an independent reviewer decision note of at least three characters.
4. Choose **Approve and activate** only if the request meets policy, or **Reject request** if it does not.

| Age label | Meaning | Expected handling |
|---|---|---|
| New request | Less than 3 days pending | Normal review cadence. |
| Review soon | 3–6 days pending | Prioritize during the next governance review. |
| Urgent review | 7+ days pending | Investigate delay and complete or formally escalate review. |

Priority is calculated from submission age. Makers cannot assign or escalate their own priority.

### Share a queue filter view

The approval queue’s search, lifecycle-status, request-type, and age-priority controls are reflected in its URL. Copy that URL to share the same **filter view** with another reviewer. A shared URL does not grant authority or access: each recipient sees only records their own authenticated session and maker–checker permissions permit.

### Export the approval register

Administrators can select **Pending and completed**, **Pending only**, or **Completed only** in the queue’s **Export records** control and choose **Export CSV**. The export contains approval status, type, submitted/completed UTC timestamps, profile and signer metadata, actor identifiers, public-key digest, and maker/reviewer decision notes. It is a governance register, not an evidence export: it excludes private keys, source evidence, vault plaintext, ciphertext, passphrases, and storage locations.

CSV cells are quoted and text that could be interpreted as a spreadsheet formula is neutralized before download. Export access is administrator-only; the default all-records export is limited to 5,000 rows and reports when further historical records require a narrower scope or archival process.

## 7. Offline companion workflow

The companion applications are offline viewers for exported verification records. They do not replace the dashboard’s authenticated archive, server audit verification, profile governance, or online authorization checks. Build and sharing instructions are maintained with the companion project at `/home/ubuntu/aletheia-offline-companion/BUILD_AND_SHARING.md`.

## 8. Troubleshooting

| Symptom | Likely cause | Safe response |
|---|---|---|
| Sign-in loop or 403 | Identity-provider registration or browser policy issue | Follow the OAuth checks in the operations runbook. Do not disable authorization. |
| Wrong vault passphrase | Incorrect secret or mismatched artifact | Stop and verify the source passphrase; repeated attempts do not recover plaintext. |
| Ledger root mismatch | Incomplete, wrong, or altered ledger | Preserve inputs and investigate through case procedure. |
| Review badge is absent | No independently actionable queue entries | Confirm the request was submitted by another user and the reviewer is an admin. |
| Approval cannot be decided | You are the maker or are not an admin | Use a separate administrator; self-approval is intentionally blocked. |

For deployment, administration, recovery, and security limits, see [OPERATIONS_AND_DEPLOYMENT.md](OPERATIONS_AND_DEPLOYMENT.md).

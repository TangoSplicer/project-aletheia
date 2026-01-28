# Evidential Finality: Attestation & Digital Sealing

## ⚖️ Legal Significance
The sealing process marks the transition of a technical working document into an **Expert Witness Report** suitable for the Criminal Justice System. It satisfies the **UK FSR Statutory Code v2** requirement for clear accountability and the **Criminal Procedure Rules (CrimPR) Part 19**.

## 🛡️ The Two-Stage Protocol

### Stage 1: Practitioner Attestation
The framework requires an explicit, manual confirmation of the **Statement of Truth**. This cannot be bypassed or automated. The attestation links the human expert's identity and their duty to the court to the specific technical findings generated.

### Stage 2: Cryptographic Sealing
Once attestation is captured:
1.  **SHA-256 Hashing:** The final report is hashed.
2.  **Detached Signature:** A signature file (`.sig`) is generated, binding the practitioner's identity to the report hash.
3.  **Ledger Entry:** The event is written to the Immutable Chain-of-Custody Ledger.

## 🔍 Verification for Defence Experts
To verify that a report has not been altered post-signature:
1.  The defence expert re-hashes the report file.
2.  The resulting hash is compared against the `Report-Hash` field in the `.sig` file.
3.  The hash is cross-referenced against the `REPORT_SEALED` entry in the `chain_of_custody.jsonl`.

## ⚠️ Non-Repudiation
Because the sealing occurs in an air-gapped environment using local keys, and is recorded in a cryptographically chained ledger, the practitioner cannot later claim the report was generated without their knowledge or consent.

> "The signature represents the finality of the forensic process. It confirms that the human expert has reviewed the automated outputs and adopts them as their own evidence."

# Forensic Chain of Custody (CoC) Immutable Ledger

## Purpose
The **Aletheia CoC Ledger** provides a cryptographically verifiable record of all forensic activities performed within the framework. This satisfies the requirements of **UK FSR Statutory Code v2** regarding the "integrity and continuity of evidence" and **ISO/IEC 17025** requirements for technical records.

## Technical Design
- **Cryptographic Chaining:** Each entry incorporates the hash of the preceding entry. Any alteration, deletion, or insertion in the ledger file will break the hash chain, rendering the tamper evident.
- **Append-Only:** The framework is programmatically restricted from modifying existing ledger entries.
- **Local Sovereignty:** The ledger is stored locally to maintain the air-gap. No external blockchain or network is used.

## Recorded Event Types
1. **EVIDENCE_INGESTION:** Initial hashing and registration of source material.
2. **MODEL_VERIFICATION:** Cryptographic check of AI weights against the SRA Library.
3. **ANALYSIS_START/END:** Timestamps for specific module executions (e.g., media-synth).
4. **VALIDATION_EVENT:** Results of automated tool self-tests against Gold Images.
5. **REPORT_GENERATION:** Final hash of the produced forensic report.

## Legal Admissibility
The ledger is exported as a human-readable JSONL file. In court, the Forensic Practitioner can provide this file to demonstrate that the tool's process was linear, documented, and untampered from ingestion to final report.

> "The audit trail was maintained through a deterministic hash-linking process, ensuring that every action taken by the software was recorded in a permanent and verifiable sequence (FSR Code v2)."

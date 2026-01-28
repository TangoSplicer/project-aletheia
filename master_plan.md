# Project Aletheia: Master Architectural Plan (v1.0)

## 1. Executive Summary
Project Aletheia is an open-source digital forensics framework designed for the 2026 legal landscape. It bridges the gap between high-speed AI analysis and the strict evidentiary requirements of the UK Forensic Science Regulator (FSR) and ISO/IEC 17025.

## 2. Core Repositories
- **Framework (project-aletheia):** The primary analysis engine.
- **SRA Library (aletheia-sra-library):** The ground-truth database (linked via Git Submodule).

## 3. Finalized Technical Stack
- **Core Engine:** Rust (Memory-safe, high-concurrency).
- **Analysis Modules:** Python (AI/ML integration).
- **Ledger:** Cryptographically chained JSONL (Local/Offline).
- **Communication:** Internal Nexus Middleware (JSON-LD).

## 4. Operational Guardrails
- **Air-Gap First:** No network calls during analysis.
- **Model Integrity:** Mandatory hash-verification of AI weights before execution.
- **Legal Finality:** Two-stage Practitioner Attestation and Digital Sealing.
- **FSR Compliance:** Automated "Verification of Method" against Gold Images.

## 5. Implementation Status
| Component | Status | Jurisdiction |
| :--- | :--- | :--- |
| Core Nexus (Ingestion/Hashing) | COMPLETE | UK/USA/EU |
| SRA Submodule Linking | COMPLETE | Global |
| Model Integrity Verification | COMPLETE | UK FSR / ISO 17025 |
| CoC Immutable Ledger | COMPLETE | Global |
| media-synth Module (v1) | COMPLETE | UK (FSR-ready) |
| Forensic Report Generator | COMPLETE | UK (CPS-ready) |
| Practitioner Sealing Logic | COMPLETE | UK (CrimPR-ready) |
| SRA-Verify Utility | PENDING | - |

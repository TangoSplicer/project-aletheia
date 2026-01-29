# Architecture Baseline – Project Aletheia v1.0.0

## Status
**FROZEN – ACCREDITATION BASELINE**

This document defines the immutable architectural state of Project Aletheia as of release:

- `v1.0.0-fsr-baseline` (Core Nexus)
- `v1.0.0-sra-gatekeeper` (SRA Library)

Any deviation from this baseline constitutes a **new method version** under:
- UK FSR Statutory Code v2
- ISO/IEC 17025 §7.2 and §7.8

---

## Core Architectural Principles

### 1. Determinism
All forensic processing is:
- Hash-pinned
- Ledger-anchored
- Practitioner-authorized

No execution may occur without a verified method authority.

### 2. Method Authority ≠ Evidence Interpretation
The system explicitly separates:
- **Method verification** (technical suitability)
- **Evidential interpretation** (expert opinion)

This prevents probabilistic or automated assertions of guilt.

### 3. Immutable Audit Trail
Every critical action is recorded in an append-only, cryptographically chained ledger:
- SRA_PINNED
- ANALYSIS_START / END
- REPORT_GENERATED

Tampering invalidates the chain.

---

## Scope of v1.0.0

### Included
- SRA lifecycle (scan → verify → attest → seal)
- Dual hashing (BLAKE3 + SHA-256)
- Practitioner digital signatures (Ed25519)
- Runtime execution integrity gate
- Court-ready report generation
- CPIA-appropriate disclosure design

### Explicitly Excluded
- No probabilistic conclusions
- No automated evidential assertions
- No networked trust dependencies
- No embedded SRA artifacts

---

## Change Control
Any future changes require:
- New semantic version
- Fresh validation evidence
- Updated accreditation documentation

This baseline is legally defensible as a **complete forensic method framework**.

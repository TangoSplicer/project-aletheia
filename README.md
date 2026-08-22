# Project Aletheia: Next-Gen Autonomous Forensic Framework

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Standard: UK FSR Code v2](https://img.shields.io/badge/Compliance-UK_FSR_Code_v2-red)](https://www.gov.uk/government/organisations/forensic-science-regulator)
[![Standard: ISO/IEC 17025](https://img.shields.io/badge/Standard-ISO%2FIEC_17025-gold)](https://www.iso.org/standard/66912.html)

## ⚖️ Court-Admissible & Regulator-Ready
Project Aletheia is a 2026-specification digital forensic framework engineered to meet the **Forensic Science Regulator (FSR) Statutory Code v2** requirements. Unlike legacy tools, Aletheia prioritizes **Verification of Method** through automated alignment with the **Aletheia SRA (Standard Reference Artifact) Library**.

### Core Pillars
* **FSR-Compliant by Design:** Integrated non-conformance logging and standard reference checking.
* **Validated Core:** Rust-based memory-safe ingestion and BLAKE3/SHA-256 dual-hashing.
* **Explainable AI (XAI):** Human-in-the-loop triage for deepfake and synthetic media detection.
* **Jurisdiction Switch:** Toggle logic and terminology between UK (FSR), USA (NIST/Daubert), and EU (AI Act).

## Aletheia Seal Desk dashboard

The React/TypeScript **Aletheia Seal Desk** source is included in [`dashboard/`](dashboard/). It provides local-first Ed25519 manifest verification, BLAKE3 ledger review, encrypted vault restoration, case-audit inspection, verification-profile governance, maker–checker approval controls, and an administrator approval queue. Start with the [dashboard documentation map](docs/DASHBOARD_GUIDE.md), which directs practitioners to the [user guide](dashboard/USER_GUIDE.md), operators to the [operations runbook](dashboard/OPERATIONS_AND_DEPLOYMENT.md), reviewers to the [security policy](dashboard/SECURITY.md), and release owners to the [release policy](dashboard/RELEASE_POLICY.md).

## Documentation and contribution paths

| Need | Document |
|---|---|
| Framework architecture and validation boundaries | [ARCHITECTURE_BASELINE.md](ARCHITECTURE_BASELINE.md) and [VALIDATION_SCOPE.md](VALIDATION_SCOPE.md) |
| Local environment and SRA setup | [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) and [docs/UPDATING_SRA_LIB.md](docs/UPDATING_SRA_LIB.md) |
| Dashboard users, operators, and reviewers | [docs/DASHBOARD_GUIDE.md](docs/DASHBOARD_GUIDE.md) |
| Contributors and pull-request expectations | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Framework-level security reporting | [SECURITY.md](SECURITY.md) |

## 🛡️ Disclosure
This software is intended for use by competent forensic practitioners. All automated findings must be verified by a human expert in accordance with Part B of the FSR Statutory Code.

## 📜 License
This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

The dashboard retains its own [`dashboard/LICENSE`](dashboard/LICENSE). Review both license texts and obtain appropriate legal review before combining, redistributing, or changing licensing terms.

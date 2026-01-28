# Forensic Compliance: Model Integrity Verification

## Overview
In accordance with **UK FSR Statutory Code v2** and **ISO/IEC 17025**, all automated methods must be verified prior to use. Project Aletheia implements a mandatory "Model Integrity Check" for all AI-assisted modules.

## Technical Safeguards
- **Pre-execution Verification:** Model weights are hashed using BLAKE3/SHA-256 before any data is processed.
- **Reference Pining:** Expected hashes are loaded from the cryptographically signed `Aletheia SRA Library`.
- **Hard-Stop Policy:** If a hash mismatch is detected, the `core-nexus` will terminate execution of the module and record a Non-Conformance Event.

## Audit Logs
Integrity logs are stored in JSONL format, suitable for disclosure during court proceedings. Each log entry includes:
1. **Timestamp** (UTC)
2. **Model Identifier**
3. **Calculated vs. Expected Hash**
4. **SRA Artifact Reference**

## Court Disclosure Statement
"The software utilized a deterministic verification process to ensure that the Artificial Intelligence models remained in their validated state and had not been subject to unauthorized modification (Validation of Methods, FSR Code v2)."

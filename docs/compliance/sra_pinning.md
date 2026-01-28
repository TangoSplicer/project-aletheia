SRA Pinning: Legal & Technical Rationale
1. ISO/IEC 17025 §7.2 Mapping
This implementation fulfills Section 7.2.1.5 (Verification of methods). By requiring a pinned .sram manifest, the Core Nexus ensures that the laboratory (the practitioner) has verified the method is fit for purpose. The execution gate ensures the actual method used at runtime is bit-for-bit identical to the verified method.
2. UK FSR Statutory Code v2 Alignment
The SRA Pinning mechanism enforces the Senior Accountable Individual (SAI) and practitioner responsibility requirements.
Accountability: Every execution is cryptographically linked to a practitioner_id via the signed manifest.
Integrity: Dual-hashing (BLAKE3/SHA-256) ensures no silent corruption or unauthorized updates to forensic logic (e.g., regex sets or model weights).
3. Method Authority vs. Evidence
Under CPIA 1996, the SRA Pin serves as part of the "Description of Method." It does not assert that a specific file is evidence of a crime; rather, it asserts that the tool used to find that evidence was authorized by a competent human. This allows the defense to audit the exact version of any reference artifact used.
5. Forensic Decision Rationale
Strict Mode by Default: In digital forensics, an unverified method is a failed method. Strict mode ensures that no "helpful" bypasses exist that could weaken a court submission.
Signature before Ledger: We verify the practitioner's intent (the signature) before we record the event in the ledger. This ensures the ledger only contains legally authorized transitions.
Dual Hashing: Provides a bridge between modern performance (BLAKE3) and established court expectations (SHA-256), mitigating cryptographic obsolescence.
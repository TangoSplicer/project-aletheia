Method Authority and Reporting Compliance
1. Transparency Requirements (FSR v2)
The UK FSR Code requires that any automated method or AI-assisted process be clearly identified and its validation status disclosed. By including the Authorized Methods Table in every report, Project Aletheia ensures the court knows exactly which practitioner authorized the technical logic used.
2. ISO/IEC 17025 Technical Records
Under §7.8.2.1, report results must include all information requested by the customer and necessary for the interpretation of the results. By correlating SRA_PINNED events with ANALYSIS events, we provide a complete technical record of the method's lifecycle.
3. CPIA 1996 Disclosure Standards
This implementation protects the prosecution and expert witness from challenges regarding "black box" algorithms. A defense expert can:
Read the .sram manifest hash from the report.
Independently verify the practitioner's signature.
Audit the exact regex or model weights used, ensuring full disclosure of the forensic process.
5. Forensic Decision Rationale
Linear Narrative: We do not group events by type in the narrative; we present them in the sequence they were recorded. This prevents "cherry-picking" of timeline events during court testimony.
System Attestation: Adding a hard-coded string in the report engine ensures that the system's own integrity logic is declared as a technical observation.
Hash-Sealing: By writing the report hash back to the ledger, we create a circular dependency: you cannot change the report without breaking the ledger, and you cannot change the ledger without breaking the report.
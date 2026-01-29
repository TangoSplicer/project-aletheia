# Forensic Examination Report: UK FSR v2 Compliant

**Case Identifier:** {{case_id}}
**Report Hash (SHA-256):** {{report_hash}}
**Timestamp:** {{generation_timestamp}}

---

## 3A. Authorized Methods & Practitioner Attestation

| Artifact Name | SHA-256 Hash | Practitioner ID | Jurisdiction | Ledger ID |
|:---|:---|:---|:---|:---|
{% for method in authorized_methods %}
| {{method.artifact_name}} | {{method.sha256_hash}} | {{method.practitioner_id}} | {{method.jurisdiction}} | {{method.ledger_sequence}} |
{% endfor %}

### Statement of Method Authorization
The methods listed above have been verified as fit for forensic purpose under ISO/IEC 17025 §7.2.1.5 and authorized by the named practitioner. 

**Legal Distinction:** - **Method Verification:** Asserts technical suitability of the tool/logic.
- **Evidential Interpretation:** Asserts findings based on method application.
Project Aletheia maintains this separation to ensure auditability under CPIA 1996.

---

## 4. Chain of Custody & Event Narrative
The following sequence is extracted from the immutable ledger. Any modification to these events will invalidate the cryptographic hash chain.

| Sequence | Event Type | Technical Observation / Detail | Hash Anchor |
|:---|:---|:---|:---|
{% for event in chain_of_custody_narrative %}
| {{event.sequence}} | {{event.event_type}} | {{event.description}} | `{{event.hash_anchor}}` |
{% endfor %}

---
*End of Federally Sealed Report*

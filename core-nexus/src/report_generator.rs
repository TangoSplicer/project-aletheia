use crate::coc_ledger::{LedgerEntry, CocLedger};
use crate::hashing::{hash_file, HashAlgorithm};
use crate::config::COC_LEDGER_PATH;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};

#[derive(Debug, Serialize, Deserialize)]
pub struct ReportMetadata {
    pub case_reference: String,
    pub exhibit_reference: String,
    pub practitioner_name: String,
    pub organization: String,
}

pub struct ReportGenerator;

impl ReportGenerator {
    pub fn generate_uk_report(
        metadata: ReportMetadata,
        module_findings: &str,
        output_path: &str,
    ) -> io::Result<String> {
        // 1. Fetch Ledger entries for the Audit Trail section
        let ledger_data = fs::read_to_string(COC_LEDGER_PATH)?;
        let mut audit_trail = String::new();
        for line in ledger_data.lines() {
            let entry: LedgerEntry = serde_json::from_str(line)?;
            audit_trail.push_str(&format!(
                "| {} | {} | {} | {} |\n",
                entry.timestamp, entry.event_type, entry.object_ref, entry.entry_hash
            ));
        }

        // 2. Load Template
        let template = fs::read_to_string("project-aletheia/reports/templates/uk_fsr_report.md")?;
        
        // 3. Deterministic Synthesis
        let report_content = template
            .replace("{{CASE_REF}}", &metadata.case_reference)
            .replace("{{EXHIBIT_REF}}", &metadata.exhibit_reference)
            .replace("{{PRACTITIONER}}", &metadata.practitioner_name)
            .replace("{{ORG}}", &metadata.organization)
            .replace("{{AUDIT_TRAIL}}", &audit_trail)
            .replace("{{FINDINGS}}", module_findings);

        // 4. Write to disk
        fs::write(output_path, &report_content)?;

        // 5. Calculate Final Report Hash
        let hash_result = hash_file(output_path, HashAlgorithm::Sha256)?;
        
        // 6. Record to CoC Ledger
        CocLedger::append(
            COC_LEDGER_PATH,
            "REPORT_GENERATED",
            &metadata.practitioner_name,
            output_path,
            &hash_result.hex_digest,
        )?;

        Ok(hash_result.hex_digest)
    }
}

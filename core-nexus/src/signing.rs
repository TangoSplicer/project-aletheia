use crate::hashing::{hash_file, HashAlgorithm};
use crate::coc_ledger::CocLedger;
use crate::config::COC_LEDGER_PATH;
use std::fs;
use std::io::{self, Write};
use std::path::Path;

pub struct SealingEngine;

impl SealingEngine {
    pub fn seal_report(
        report_path: &str,
        practitioner_name: &str,
        signature_key_ref: &str, // Reference to local PKCS#8 key path
    ) -> io::Result<String> {
        let path = Path::new(report_path);
        if !path.exists() {
            return Err(io::Error::new(io::ErrorKind::NotFound, "Report file not found"));
        }

        // 1. Generate final report hash
        let report_hash = hash_file(report_path, HashAlgorithm::Sha256)?;

        // 2. Simulate cryptographic signing (Offline Detached Signature)
        // In production, this utilizes the local PKCS#8 private key
        let signature_artefact = format!(
            "--- ALETHEIA DETACHED SIGNATURE ---\nReport-Hash: {}\nSignatory: {}\nKey-Ref: {}\n--- END SIGNATURE ---",
            report_hash.hex_digest,
            practitioner_name,
            signature_key_ref
        );

        let sig_path = format!("{}.sig", report_path);
        fs::write(&sig_path, signature_artefact)?;

        // 3. Immutable entry in CoC Ledger
        CocLedger::append(
            COC_LEDGER_PATH,
            "REPORT_SEALED",
            practitioner_name,
            report_path,
            &report_hash.hex_digest,
        )?;

        Ok(sig_path)
    }
}

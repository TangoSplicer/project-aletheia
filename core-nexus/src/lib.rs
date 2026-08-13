use std::path::Path;
use std::process::Output;

pub mod sra_pinning;
pub mod coc_ledger;
pub mod hashing;
pub mod ingestion;
pub mod sealing;

use sra_pinning::{SraPin, PinningEngine};
use coc_ledger::CocLedger;

#[derive(Debug, Clone, Copy)]
pub enum ModelIntegrityPolicy {
    Strict,
    AuditOnly,
}

#[derive(Debug)]
pub enum ForensicError {
    MissingMethodAuthority,
    IntegrityFailure(String),
    IoError(std::io::Error),
    ManifestMalformed,
    IllegalState(String),
    CryptoFailure(String),
    SignatureMismatch,
    JurisdictionViolation,
}

impl From<std::io::Error> for ForensicError {
    fn from(err: std::io::Error) -> Self {
        ForensicError::IoError(err)
    }
}

pub struct CoreNexus {
    pub policy: ModelIntegrityPolicy,
    pub active_pins: Vec<SraPin>,
    pub ledger_path: String,
}

impl CoreNexus {
    pub fn execute_forensic_scan(&self, artifact_path: &Path, pin_ref: &str) -> Result<Output, ForensicError> {
        let pin = self.active_pins.iter()
            .find(|p| p.artifact_name == pin_ref)
            .ok_or(ForensicError::MissingMethodAuthority)?;

        // HARD GATE: ISO 17025 Compliance check before processing
        PinningEngine::verify_execution_integrity(artifact_path, pin, &self.policy)?;

        // Proceed with scan...
        // For now, return a dummy output to satisfy the compiler
        Ok(Output {
            status: Default::default(),
            stdout: Vec::new(),
            stderr: Vec::new(),
        })
    }
}
